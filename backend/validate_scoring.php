<?php
declare(strict_types=1);
// CLI-only validator for the scoring contract. Run after touching anything in
// the scoring pipeline (game formulas, norms, competency matrix, allowlists):
//
//   php backend/validate_scoring.php
//
// It asserts the invariants that hold the assessment together and — more
// importantly — cross-checks the hand-synced copies that CLAUDE.md warns
// about: the norm seed in schema.sql, scoring_default_norms(), DEFAULT_NORMS
// in utils/scoring.ts, calibration_targets(), and the frontend AppView list
// vs the backend game allowlist. Exits non-zero on the first failure group.

if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }

define('APP_ROOT', __DIR__);
require_once APP_ROOT . '/logic/scoring.php';
require_once APP_ROOT . '/logic/progression.php';

$FAILS = 0;
function ok(string $name, bool $pass, string $detail = ''): void {
    global $FAILS;
    if (!$pass) $FAILS++;
    echo ($pass ? 'PASS  ' : 'FAIL  ') . $name . ($pass || $detail === '' ? '' : "  [$detail]") . "\n";
}
function section(string $t): void { echo "\n== $t ==\n"; }

// Shared fixtures --------------------------------------------------------------
$RAW_BY_NORM = ['A9a'=>'A9a_Corsi','A9b'=>'A9b_Paired','A9c'=>'A9c_NBack','A10'=>'A10_Math','A10Plus'=>'A10Plus_Pattern','A11'=>'A11_Speed','A12'=>'A12_Visual','A13'=>'A13_Orient','A14'=>'A14_Stroop','A15'=>'A15_Multi','A18'=>'A18_Fact'];
$MEAN_RAW = [];
foreach (scoring_default_norms() as $nk => $n) $MEAN_RAW[$RAW_BY_NORM[$nk]] = $n['mean'];

// 1. Norm table internal consistency -------------------------------------------
section('Norms: internal consistency');
foreach (scoring_default_norms() as $k => $n) {
    ok("norm $k has positive sd", $n['sd'] > 0);
    ok("norm $k: T(mean) = 50", to_t_score((float)$n['mean'], $k) === 50);
}
ok('T clamps at 80', to_t_score(1e9, 'A10') === 80);
ok('T clamps at 20', to_t_score(-1e9, 'A10') === 20);
ok('unknown norm key falls back to 50', to_t_score(123.0, 'NOT_A_KEY') === 50);
ok('every cognitive_raw cap key has a norm', count(array_diff(array_keys(cognitive_raw_caps()), array_values($RAW_BY_NORM))) === 0);
ok('every norm has a cognitive_raw key', count(array_diff(array_values($RAW_BY_NORM), cognitive_raw_keys())) === 0);

// 2. Hand-synced norm copies (schema.sql / utils/scoring.ts / calibrate) --------
section('Norms: hand-synced copies do not drift');
$schema = (string)file_get_contents(APP_ROOT . '/schema.sql');
$frontend = (string)file_get_contents(dirname(APP_ROOT) . '/utils/scoring.ts');
$calib = (string)file_get_contents(APP_ROOT . '/calibrate_norms.php');
// Match a numeric literal regardless of trailing-zero style: 1 == 1.0 == 1.00
$numPat = static function (float $v): string {
    $trim = rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.');
    $base = preg_quote($trim, '/');
    return strpos($trim, '.') === false ? $base . '(\.0+)?' : $base . '0*';
};
foreach (scoring_default_norms() as $k => $n) {
    // schema.sql seed row: ('A9a', 6.5, 1.5, ...)
    $seedOk = (bool)preg_match("/\('" . preg_quote($k, '/') . "'\s*,\s*" . $numPat((float)$n['mean']) . "\s*,\s*" . $numPat((float)$n['sd']) . "\s*,/", $schema);
    ok("schema.sql seeds $k with mean {$n['mean']} / sd {$n['sd']}", $seedOk);
    // utils/scoring.ts DEFAULT_NORMS: A9a: { mean: 6.5, sd: 1.5 }
    $feOk = (bool)preg_match('/' . preg_quote($k, '/') . '\s*:\s*\{\s*mean:\s*' . preg_quote((string)$n['mean'], '/') . '\s*,\s*sd:\s*' . preg_quote((string)$n['sd'], '/') . '/', $frontend);
    ok("utils/scoring.ts DEFAULT_NORMS has $k = {$n['mean']}/{$n['sd']}", $feOk);
    ok("calibrate_norms.php targets $k", strpos($calib, "'$k'") !== false);
}

// 3. Frontend views vs backend allowlist ----------------------------------------
section('Game views: frontend enum vs backend allowlist');
$typesTs = (string)file_get_contents(dirname(APP_ROOT) . '/types.ts');
preg_match_all("/MINIGAME_[A-Z0-9]+/", $typesTs, $m);
$frontViews = array_values(array_unique($m[0]));
require_once APP_ROOT . '/routes/game_routes.php';
$allowed = game_allowed_views();
// BIGFIVE posts to its own /game/bigfive route, and MINIGAME_HUB is not a game.
$expectAllowed = array_values(array_diff($frontViews, ['MINIGAME_BIGFIVE', 'MINIGAME_HUB']));
foreach ($expectAllowed as $v) ok("$v allowlisted in /game/complete", in_array($v, $allowed, true));
foreach ($allowed as $v) ok("$v (allowlist) exists in frontend enum", in_array($v, $frontViews, true));

// 4. Cognitive raw update: mapping, caps, best-attempt, clean-measure ------------
section('Cognitive raw updates');
$gameToKey = ['MINIGAME_MATH'=>'A10_Math','MINIGAME_PATTERN'=>'A10Plus_Pattern','MINIGAME_SPEED'=>'A11_Speed','MINIGAME_VISUALIZATION'=>'A12_Visual','MINIGAME_ORIENTATION'=>'A13_Orient','MINIGAME_STROOP'=>'A14_Stroop','MINIGAME_MULTITASK'=>'A15_Multi','MINIGAME_FACTFINDING'=>'A18_Fact'];
foreach ($gameToKey as $g => $key) {
    $raw = default_cognitive_raw();
    ok("$g updates $key", apply_cognitive_raw_update($raw, $g, 61.0) && (float)$raw[$key] === 61.0);
}
$raw = default_cognitive_raw();
apply_cognitive_raw_update($raw, 'MINIGAME_MATH', 999.0, ['cognitiveRaw' => 72]);
ok('MATH prefers payload.cognitiveRaw over gamified rawScore', (float)$raw['A10_Math'] === 72.0);
$raw = default_cognitive_raw();
apply_cognitive_raw_update($raw, 'MINIGAME_SPEED', 999.0, ['cognitiveRaw' => 55]);
ok('SPEED prefers payload.cognitiveRaw', (float)$raw['A11_Speed'] === 55.0);
$raw = default_cognitive_raw();
apply_cognitive_raw_update($raw, 'MINIGAME_MEMORY', 0.0, ['rawScores' => ['corsi' => 25, 'pairs' => 150, 'nback' => 9.9]]);
ok('memory caps: span<=16, acc<=100, dprime<=5', (float)$raw['A9a_Corsi'] === 16.0 && (float)$raw['A9b_Paired'] === 100.0 && (float)$raw['A9c_NBack'] === 5.0);
$raw = default_cognitive_raw();
apply_cognitive_raw_update($raw, 'MINIGAME_STROOP', 80.0);
apply_cognitive_raw_update($raw, 'MINIGAME_STROOP', 40.0);
ok('best-attempt: a worse retry never lowers a stored raw', (float)$raw['A14_Stroop'] === 80.0);
$raw = default_cognitive_raw();
apply_cognitive_raw_update($raw, 'MINIGAME_ORIENTATION', 100000.0);
ok('per-key plausibility cap clamps forged submissions', (float)$raw['A13_Orient'] === 100.0);
$raw = default_cognitive_raw();
ok('non-cognitive game (SJT) does not touch cognitive raw', apply_cognitive_raw_update($raw, 'MINIGAME_SJT', 90.0) === false && $raw == default_cognitive_raw());
ok('roleplay does not touch cognitive raw', apply_cognitive_raw_update($raw, 'MINIGAME_ROLEPLAY', 90.0) === false);

// 5. Skill updates ---------------------------------------------------------------
section('Skill updates');
$skillMap = [
    'MINIGAME_MATH' => ['math' => 70, 'analysis' => 49],
    'MINIGAME_PATTERN' => ['analysis' => 70, 'math' => 35],
    'MINIGAME_SPEED' => ['perception' => 70, 'speed' => 70],
    'MINIGAME_VISUALIZATION' => ['visualization' => 70],
    'MINIGAME_ORIENTATION' => ['orientation' => 70],
    'MINIGAME_STROOP' => ['focus' => 70],
    'MINIGAME_MULTITASK' => ['multitasking' => 70],
    'MINIGAME_FACTFINDING' => ['decisionMaking' => 70],
    'MINIGAME_5WHYS' => ['analysis' => 70],
    'MINIGAME_SWOT' => ['analysis' => 70, 'decisionMaking' => 70],
    'MINIGAME_CYNEFIN' => ['decisionMaking' => 70],
    'MINIGAME_SJT' => ['teamwork' => 70],
];
foreach ($skillMap as $g => $expected) {
    $sk = default_skills();
    apply_skill_update($sk, $g, 70.0);
    $pass = true; $detail = '';
    foreach ($expected as $key => $val) if ((int)$sk[$key] !== $val) { $pass = false; $detail = "$key={$sk[$key]} expected $val"; }
    foreach ($sk as $key => $val) if (!isset($expected[$key]) && (int)$val !== 0) { $pass = false; $detail = "unexpected $key=$val"; }
    ok("$g -> " . implode('+', array_keys($expected)), $pass, $detail);
}
$sk = default_skills();
apply_skill_update($sk, 'MINIGAME_MATH', 250.0);
ok('skill scores clamp to 100', (int)$sk['math'] === 100);
apply_skill_update($sk, 'MINIGAME_MATH', 10.0);
ok('skills keep the best attempt', (int)$sk['math'] === 100);

// 6. Indices and composite -------------------------------------------------------
section('Indices (MI/AI/RI/SI/EI/TCS)');
$idx = calculate_indices($MEAN_RAW);
ok('all indices = 50 at population means', $idx == ['MI'=>50,'AI'=>50,'RI'=>50,'SI'=>50,'EI'=>50,'TCS'=>50], json_encode($idx));
$boost = $MEAN_RAW; $boost['A10_Math'] = 1e6; // clamps to T=80
$idx = calculate_indices($boost);
ok('RI reflects a boosted reasoning test', $idx['RI'] === 60);
ok('TCS uses documented weights (25/25/30/20)', $idx['TCS'] === (int)round(50*.25 + 50*.25 + 60*.30 + 50*.20));
$boost = $MEAN_RAW; $boost['A14_Stroop'] = 1e6;
$idx = calculate_indices($boost);
ok('EI moves but is not double-counted in TCS', $idx['EI'] === 60 && $idx['TCS'] === 53);

// 7. XP / raw-score ceilings -------------------------------------------------------
section('Raw-score ceilings for /game/complete');
ok('MATH ceiling 5000 (weighted point total)', game_max_raw_score('MINIGAME_MATH') === 5000.0);
ok('MEMORY ceiling 500 (summed stages)', game_max_raw_score('MINIGAME_MEMORY') === 500.0);
foreach (['MINIGAME_SPEED','MINIGAME_STROOP','MINIGAME_MULTITASK','MINIGAME_FACTFINDING','MINIGAME_5WHYS','MINIGAME_SWOT','MINIGAME_CYNEFIN','MINIGAME_SJT','MINIGAME_ROLEPLAY'] as $g)
    ok("$g ceiling 100 (normalized scale)", game_max_raw_score($g) === 100.0);

// 8. Big Five validity flag --------------------------------------------------------
section('Big Five validity flag');
ok('null indicators -> null (unknown, old client)', bigfive_validity_flag(null) === null);
ok('clean run -> valid', bigfive_validity_flag(['attentionFailed'=>0,'inconsistentPairs'=>0,'tooFastCount'=>2,'itemCount'=>28]) === 'valid');
ok('one tripped indicator -> caution', bigfive_validity_flag(['attentionFailed'=>1,'inconsistentPairs'=>0,'tooFastCount'=>0,'itemCount'=>28]) === 'caution');
ok('rushing >20% of items -> caution', bigfive_validity_flag(['attentionFailed'=>0,'inconsistentPairs'=>0,'tooFastCount'=>6,'itemCount'=>28]) === 'caution');
ok('two tripped indicators -> invalid', bigfive_validity_flag(['attentionFailed'=>1,'inconsistentPairs'=>1,'tooFastCount'=>0,'itemCount'=>28]) === 'invalid');

// 9. Competency matrix --------------------------------------------------------------
section('Competency matrix');
$matrix = competency_matrix();
ok('7 competencies defined', count($matrix) === 7, implode(',', array_keys($matrix)));
$methKeys = ['5whys','swot','cynefin','sjt'];
$bfKeys = ['Openness','Conscientiousness','Extraversion','Agreeableness','Neuroticism'];
foreach ($matrix as $key => $def) {
    $w = array_sum(array_column($def['sources'], 'weight'));
    ok("$key weights sum to 1", abs($w - 1.0) < 1e-9, (string)$w);
    foreach ($def['sources'] as $src) {
        if ($src['layer'] === 'cognitive') ok("$key cognitive keys exist", count(array_diff($src['keys'], array_keys($RAW_BY_NORM))) === 0);
        elseif ($src['layer'] === 'personality') ok("$key personality key valid ({$src['key']})", in_array($src['key'], $bfKeys, true));
        else ok("$key methodology key valid ({$src['key']})", in_array($src['key'], $methKeys, true));
    }
}
$bf = ['Openness'=>50,'Conscientiousness'=>50,'Extraversion'=>50,'Agreeableness'=>50,'Neuroticism'=>50];
$meth = ['5whys'=>['score'=>50],'swot'=>['score'=>50],'cynefin'=>['score'=>50],'sjt'=>['score'=>50]];
foreach (calculate_competencies($MEAN_RAW, $bf, $meth) as $c) {
    ok("{$c['key']} = 50 at means, full coverage", $c['score'] === 50 && abs($c['coverage'] - 1.0) < 1e-9 && !$c['insufficient']);
}
foreach (calculate_competencies([], null, []) as $c) {
    ok("{$c['key']} null without evidence (never a fake 50)", $c['score'] === null && $c['insufficient'] === true);
}
$bfInvalid = $bf; $bfInvalid['_validity'] = 'invalid';
$onlyPersonality = calculate_competencies([], $bfInvalid, []);
foreach ($onlyPersonality as $c) ok("{$c['key']} drops invalid personality evidence", $c['score'] === null);
$partial = calculate_competencies([], ['Openness'=>80] + $bf, []);
foreach ($partial as $c) if ($c['key'] === 'problemSolving') ok('renormalization: Openness-only -> score 80, coverage .20', $c['score'] === 80 && abs($c['coverage'] - .20) < 1e-9 && $c['insufficient']);

// 10. Career fit ---------------------------------------------------------------------
section('Career fit (O*NET-anchored profile matching)');
$families = career_families();
$featLabels = career_feature_labels();
ok('8 job families defined', count($families) === 8, implode(',', array_keys($families)));
foreach ($families as $fk => $fam) {
    $w = array_sum(array_column($fam['requirements'], 'w'));
    $featsOk = true; $modesOk = true; $targetsOk = true;
    foreach ($fam['requirements'] as $r) {
        if (!isset($featLabels[$r['f']])) $featsOk = false;
        if (!in_array($r['m'], ['atLeast', 'match'], true)) $modesOk = false;
        if ($r['t'] < 0 || $r['t'] > 100) $targetsOk = false;
    }
    ok("$fk: weights=1, features known, modes/targets valid", abs($w - 1.0) < 1e-9 && $featsOk && $modesOk && $targetsOk, "w=$w");
    ok("$fk has O*NET + RIASEC anchors", !empty($fam['onet']) && !empty($fam['riasec']));
}
foreach (calculate_career_fit([], null, []) as $c)
    ok("{$c['key']} null fit without any evidence", $c['fitScore'] === null && $c['insufficient'] === true);
$rawStrongFit = ['A10_Math'=>95,'A10Plus_Pattern'=>95,'A18_Fact'=>100,'A9a_Corsi'=>9,'A9b_Paired'=>95,'A9c_NBack'=>4.2,'A11_Speed'=>85,'A14_Stroop'=>80,'A15_Multi'=>80,'A12_Visual'=>80,'A13_Orient'=>85];
$bfAnalystFit = ['Openness'=>70,'Conscientiousness'=>65,'Extraversion'=>30,'Agreeableness'=>50,'Neuroticism'=>60];
$methFullFit = ['5whys'=>['score'=>80],'swot'=>['score'=>70],'cynefin'=>['score'=>70],'sjt'=>['score'=>45]];
$fitA = calculate_career_fit($rawStrongFit, $bfAnalystFit, $methFullFit);
$byFit = []; foreach ($fitA as $c) $byFit[$c['key']] = $c;
ok('analytical profile tops an analytical family', in_array($fitA[0]['key'], ['dataAnalysis','softwareEngineering'], true), $fitA[0]['key']);
ok('discrimination: analysis beats sales by 10+ points', ($byFit['dataAnalysis']['fitScore'] - $byFit['salesBusinessDev']['fitScore']) >= 10);
$prev = PHP_INT_MAX;
$sorted = true; foreach ($fitA as $c) { if (($c['fitScore'] ?? -1) > $prev) $sorted = false; $prev = $c['fitScore'] ?? -1; }
ok('families sorted by fit descending', $sorted);
$bfSocialFit = ['Openness'=>55,'Conscientiousness'=>55,'Extraversion'=>80,'Agreeableness'=>70,'Neuroticism'=>65];
$fitB = calculate_career_fit([], $bfSocialFit, ['sjt'=>['score'=>80],'cynefin'=>['score'=>60],'5whys'=>['score'=>50],'swot'=>['score'=>50]]);
ok('social profile tops a people-facing family', in_array($fitB[0]['key'], ['salesBusinessDev','hrPeople','customerSuccess'], true), $fitB[0]['key']);
foreach (calculate_career_fit([], $bfSocialFit, []) as $c)
    if ($c['key'] === 'dataAnalysis') ok('cognitive-heavy family flagged insufficient without cognitive data', $c['insufficient'] === true);

// 11. Labels -------------------------------------------------------------------------
section('Labels');
foreach ([[70,'بسیار بالا'],[60,'بالاتر از میانگین'],[50,'متوسط'],[35,'پایین‌تر از میانگین'],[25,'نیازمند توجه']] as [$t,$l])
    ok("performance label T=$t", get_performance_label($t) === $l);
foreach ([[80,'قوی'],[65,'خوب'],[45,'متوسط'],[30,'نیازمند توسعه']] as [$s,$l])
    ok("competency label $s", get_competency_label($s) === $l);

echo "\n" . ($FAILS === 0 ? "ALL CHECKS PASSED\n" : "$FAILS CHECK(S) FAILED\n");
exit($FAILS === 0 ? 0 : 1);
