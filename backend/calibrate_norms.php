<?php
declare(strict_types=1);
/**
 * Empirical norm calibration engine (docs/assessment-quality-review.md, phase 2).
 *
 * Reads first-attempt, non-fallback, cap-validated measures per test from
 * game_results, computes robust (winsorized) mean/SD candidates, reports
 * attempt1-vs-attempt2 retest correlations as a reliability diagnostic, and —
 * only with --apply and enough samples — promotes norms in scoring_norms to
 * source='empirical', bumping their version.
 *
 * CLI only (run via SSH or a cPanel cron job):
 *   php backend/calibrate_norms.php                 dry run: report only
 *   php backend/calibrate_norms.php --apply         write qualifying norms
 *   php backend/calibrate_norms.php --apply --recompute
 *                                                   ...then refresh every stored
 *                                                   cognitive_t under the new norms
 *   options: --min-n=100 (sample threshold)  --winsor=0.05 (trim fraction/tail)
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit("CLI only\n"); }

/** Norm key -> where its raw measure lives in a game_results row. */
function calibration_targets(): array
{
    return [
        // kind 'aliases': read from payload.rawScores (memory battery stages)
        'A9a'     => ['view' => 'MINIGAME_MEMORY',        'kind' => 'aliases', 'aliases' => ['A9a_Corsi','corsi','corsiRaw','span'],           'capKey' => 'A9a_Corsi'],
        'A9b'     => ['view' => 'MINIGAME_MEMORY',        'kind' => 'aliases', 'aliases' => ['A9b_Paired','pairs','paired','pairedRaw','accuracy'], 'capKey' => 'A9b_Paired'],
        'A9c'     => ['view' => 'MINIGAME_MEMORY',        'kind' => 'aliases', 'aliases' => ['A9c_NBack','nback','nBack','dPrime'],            'capKey' => 'A9c_NBack'],
        // kind 'cognitiveRaw': the clean construct measure; legacy rows without
        // it are on the old gamified scale and must not shape the norm.
        'A10'     => ['view' => 'MINIGAME_MATH',          'kind' => 'cognitiveRaw', 'capKey' => 'A10_Math'],
        'A11'     => ['view' => 'MINIGAME_SPEED',         'kind' => 'cognitiveRaw', 'capKey' => 'A11_Speed'],
        // kind 'rawScore': the submitted 0-100 measure is the construct measure.
        'A10Plus' => ['view' => 'MINIGAME_PATTERN',       'kind' => 'rawScore', 'capKey' => 'A10Plus_Pattern'],
        'A12'     => ['view' => 'MINIGAME_VISUALIZATION', 'kind' => 'rawScore', 'capKey' => 'A12_Visual'],
        'A13'     => ['view' => 'MINIGAME_ORIENTATION',   'kind' => 'rawScore', 'capKey' => 'A13_Orient'],
        'A14'     => ['view' => 'MINIGAME_STROOP',        'kind' => 'rawScore', 'capKey' => 'A14_Stroop'],
        'A15'     => ['view' => 'MINIGAME_MULTITASK',     'kind' => 'rawScore', 'capKey' => 'A15_Multi'],
        'A18'     => ['view' => 'MINIGAME_FACTFINDING',   'kind' => 'rawScore', 'capKey' => 'A18_Fact'],
    ];
}

/** Extract the measure from one row, or null if the row can't feed this norm. */
function calibration_extract(array $target, float $rawScore, array $payload, float $cap): ?float
{
    // Fallback content was never a real assessment run.
    if (!empty($payload['usedFallback']) || !empty($payload['_fallback'])) return null;

    $value = null;
    if ($target['kind'] === 'rawScore') {
        $value = $rawScore;
    } elseif ($target['kind'] === 'cognitiveRaw') {
        if (isset($payload['cognitiveRaw']) && is_numeric($payload['cognitiveRaw'])) $value = (float)$payload['cognitiveRaw'];
    } else { // aliases within the memory battery payload
        $src = $payload['rawScores'] ?? ($payload['cognitiveRaw'] ?? $payload);
        if (is_array($src)) {
            foreach ($target['aliases'] as $alias) {
                if (isset($src[$alias]) && is_numeric($src[$alias])) { $value = (float)$src[$alias]; break; }
            }
        }
    }
    if ($value === null) return null;
    // Out-of-range values are forged or from an incompatible client version;
    // reject rather than clamp so they can't drag the norm.
    if ($value < 0 || $value > $cap) return null;
    return $value;
}

/** Winsorize both tails by $trim fraction, then mean and sample SD (n-1). */
function winsorized_stats(array $values, float $trim = 0.05): ?array
{
    $n = count($values);
    if ($n < 2) return null;
    sort($values);
    $k = (int)floor($trim * $n);
    if ($k > 0) {
        $low = $values[$k];
        $high = $values[$n - 1 - $k];
        foreach ($values as $i => $v) $values[$i] = max($low, min($high, $v));
    }
    $mean = array_sum($values) / $n;
    $ss = 0.0;
    foreach ($values as $v) $ss += ($v - $mean) * ($v - $mean);
    $sd = sqrt($ss / ($n - 1));
    return ['n' => $n, 'mean' => $mean, 'sd' => $sd];
}

/** Pearson correlation between paired samples; null when undefined. */
function pearson_r(array $x, array $y): ?float
{
    $n = min(count($x), count($y));
    if ($n < 3) return null;
    $mx = array_sum($x) / $n; $my = array_sum($y) / $n;
    $sxy = $sxx = $syy = 0.0;
    for ($i = 0; $i < $n; $i++) {
        $dx = $x[$i] - $mx; $dy = $y[$i] - $my;
        $sxy += $dx * $dy; $sxx += $dx * $dx; $syy += $dy * $dy;
    }
    if ($sxx <= 0 || $syy <= 0) return null;
    return $sxy / sqrt($sxx * $syy);
}

/**
 * Walk game_results in chronological order and collect, per norm key, each
 * user's first and second VALID measures. A user whose chronologically first
 * row is invalid (legacy scale, fallback) is excluded from the norm sample
 * entirely: their next valid row is already a practiced retry.
 */
function calibration_collect(PDO $pdo, array $targets, array $caps): array
{
    $byView = [];
    foreach ($targets as $key => $t) $byView[$t['view']][] = $key;

    $samples = [];   // key => [user first-attempt values]
    $retestA = [];   // key => [attempt1 values] aligned with $retestB
    $retestB = [];
    $seen = [];      // "view:user" => rows consumed so far

    $st = $pdo->prepare(
        'SELECT user_id, game_view, raw_score, payload FROM game_results
         WHERE game_view IN (' . implode(',', array_fill(0, count($byView), '?')) . ')
         ORDER BY user_id, created_at, id'
    );
    $st->execute(array_keys($byView));

    foreach ($st as $row) {
        $view = (string)$row['game_view'];
        $userKey = $view . ':' . $row['user_id'];
        $attempt = ($seen[$userKey] = ($seen[$userKey] ?? 0) + 1);
        if ($attempt > 2) continue; // only first (norm) and second (retest) matter

        $payload = json_decode((string)($row['payload'] ?? ''), true);
        if (!is_array($payload)) $payload = [];
        $rawScore = (float)$row['raw_score'];

        foreach ($byView[$view] as $key) {
            $value = calibration_extract($targets[$key], $rawScore, $payload, $caps[$targets[$key]['capKey']]);
            if ($attempt === 1) {
                if ($value !== null) {
                    $samples[$key][] = $value;
                    $retestA[$key][$row['user_id']] = $value; // pending pair
                }
            } else { // attempt 2: completes a retest pair if attempt 1 was valid
                if ($value !== null && isset($retestA[$key][$row['user_id']])) {
                    $retestB[$key]['a'][] = $retestA[$key][$row['user_id']];
                    $retestB[$key]['b'][] = $value;
                }
            }
        }
    }

    $out = [];
    foreach (array_keys($targets) as $key) {
        $pairsA = $retestB[$key]['a'] ?? [];
        $pairsB = $retestB[$key]['b'] ?? [];
        $out[$key] = [
            'values' => $samples[$key] ?? [],
            'retestR' => pearson_r($pairsA, $pairsB),
            'retestPairs' => count($pairsA),
        ];
    }
    return $out;
}

function calibrate_main(array $argv): void
{
    $apply = in_array('--apply', $argv, true);
    $recompute = in_array('--recompute', $argv, true);
    $minN = null; $winsor = null;
    foreach ($argv as $arg) {
        if (preg_match('/^--min-n=(\d+)$/', $arg, $m)) $minN = (int)$m[1];
        if (preg_match('/^--winsor=(0?\.\d+)$/', $arg, $m)) $winsor = (float)$m[1];
        if ($arg === '--help' || $arg === '-h') {
            echo "Usage: php backend/calibrate_norms.php [--apply] [--recompute] [--min-n=N] [--winsor=F]\n";
            return;
        }
    }

    define('APP_ROOT', __DIR__);
    require_once APP_ROOT . '/core/response.php';
    $configPath = APP_ROOT . '/config.php';
    if (!is_file($configPath)) { fwrite(STDERR, "config.php not found\n"); exit(1); }
    $GLOBALS['APP_CONFIG'] = require $configPath;
    date_default_timezone_set($GLOBALS['APP_CONFIG']['app']['timezone'] ?? 'Asia/Tehran');
    foreach (['/core/db.php', '/core/validate.php', '/logic/scoring.php', '/logic/nodes.php', '/logic/progression.php'] as $f) require_once APP_ROOT . $f;

    $minN = $minN ?? (int)app_config('calibration.min_sample', 100);
    $winsor = $winsor ?? (float)app_config('calibration.winsor_pct', 0.05);
    $pdo = Database::pdo();
    $targets = calibration_targets();
    $caps = cognitive_raw_caps();
    $current = scoring_norms_meta();

    echo "iCompetency norm calibration — " . ($apply ? 'APPLY' : 'dry run') . " (min-n={$minN}, winsor={$winsor})\n";
    echo str_repeat('-', 100) . "\n";
    printf("%-8s %6s %10s %10s %22s %14s %s\n", 'key', 'n', 'mean', 'sd', 'current (src vN)', 'retest r (n)', 'decision');

    $collected = calibration_collect($pdo, $targets, $caps);
    $applied = 0;

    foreach ($targets as $key => $t) {
        $c = $collected[$key];
        $stats = winsorized_stats($c['values'], $winsor);
        $cur = $current[$key];
        $curTxt = sprintf('%.1f/%.1f (%s v%d)', $cur['mean'], $cur['sd'], $cur['source'], $cur['version']);
        $rTxt = $c['retestR'] === null ? '—' : sprintf('%.2f (%d)', $c['retestR'], $c['retestPairs']);

        if ($stats === null) { $decision = 'skip: no data'; }
        elseif ($stats['sd'] <= 1e-9) { $decision = 'skip: degenerate sd'; }
        elseif ($stats['n'] < $minN) { $decision = "skip: n < {$minN}"; }
        else {
            $decision = 'qualifies';
            if ($apply) {
                $pdo->prepare(
                    'INSERT INTO scoring_norms (norm_key, mean_value, sd_value, sample_n, source, version, updated_at)
                     VALUES (?,?,?,?,\'empirical\',1,NOW())
                     ON DUPLICATE KEY UPDATE mean_value=VALUES(mean_value), sd_value=VALUES(sd_value),
                       sample_n=VALUES(sample_n), source=\'empirical\', version=version+1, updated_at=NOW()'
                )->execute([$key, round($stats['mean'], 4), round($stats['sd'], 4), $stats['n']]);
                $decision = 'APPLIED (empirical)';
                $applied++;
            }
        }
        printf("%-8s %6d %10s %10s %22s %14s %s\n",
            $key,
            $stats['n'] ?? 0,
            $stats ? sprintf('%.3f', $stats['mean']) : '—',
            $stats ? sprintf('%.3f', $stats['sd']) : '—',
            $curTxt, $rTxt, $decision);
    }

    echo str_repeat('-', 100) . "\n";
    echo $apply ? "applied: {$applied} norm(s)\n" : "dry run — nothing written. Re-run with --apply to promote qualifying norms.\n";

    if ($apply && $recompute) {
        scoring_norms_meta(true); // drop the request cache so new norms take effect
        $users = $pdo->query('SELECT user_id FROM user_profiles')->fetchAll(PDO::FETCH_COLUMN);
        $n = 0;
        foreach ($users as $uid) {
            $s = load_profile_state($pdo, (int)$uid, true);
            $s['cognitive_t'] = calculate_indices($s['cognitive_raw']);
            save_profile_state($pdo, (int)$uid, $s);
            $n++;
        }
        echo "recomputed cognitive_t for {$n} profile(s) under norms v" . scoring_norms_version() . "\n";
    } elseif ($applied > 0) {
        echo "NOTE: stored profiles still hold T-scores from the previous norms; run with --recompute to refresh them.\n";
    }
}

// Run only when invoked directly, so a test harness can include the pure
// statistics/extraction functions without touching config or the database.
if (isset($argv[0]) && realpath($argv[0]) === __FILE__) calibrate_main($argv);
