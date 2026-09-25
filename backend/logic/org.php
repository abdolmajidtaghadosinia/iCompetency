<?php
declare(strict_types=1);
// Organizations (B2B workspaces): access control, the assessment catalog,
// bulk evidence loading and workforce aggregation. The routes in
// routes/org_routes.php stay thin and call into this file. Nothing here
// re-scores anything: per-person results come from the same server-side
// functions the member's own dashboard uses (calculate_competencies, to_t_score).
// See docs/organizations.md.

function org_lower(string $s): string {
    return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

function org_roles(): array { return ['member', 'manager', 'admin']; }
function org_member_statuses(): array { return ['invited', 'active', 'inactive', 'left']; }

// The assessments an organization can require. Mirrors ASSESSMENTS in
// utils/assessmentInventory.ts (validate_scoring.php checks the two for drift).
function org_assessment_catalog(): array {
    return [
        'MINIGAME_MEMORY' => ['code' => 'A9', 'title' => 'حافظه جامع', 'category' => 'cognitive', 'rawKeys' => ['A9a_Corsi', 'A9b_Paired', 'A9c_NBack']],
        'MINIGAME_MATH' => ['code' => 'A10', 'title' => 'هوش محاسباتی', 'category' => 'cognitive', 'rawKeys' => ['A10_Math']],
        'MINIGAME_PATTERN' => ['code' => 'A10+', 'title' => 'تطابق الگو', 'category' => 'cognitive', 'rawKeys' => ['A10Plus_Pattern']],
        'MINIGAME_SPEED' => ['code' => 'A11', 'title' => 'سرعت ادراکی', 'category' => 'cognitive', 'rawKeys' => ['A11_Speed']],
        'MINIGAME_VISUALIZATION' => ['code' => 'A12', 'title' => 'تجسم فضایی', 'category' => 'cognitive', 'rawKeys' => ['A12_Visual']],
        'MINIGAME_ORIENTATION' => ['code' => 'A13', 'title' => 'جهت‌یابی', 'category' => 'cognitive', 'rawKeys' => ['A13_Orient']],
        'MINIGAME_STROOP' => ['code' => 'A14', 'title' => 'قدرت تمرکز', 'category' => 'cognitive', 'rawKeys' => ['A14_Stroop']],
        'MINIGAME_MULTITASK' => ['code' => 'A15', 'title' => 'مدیریت همزمان', 'category' => 'cognitive', 'rawKeys' => ['A15_Multi']],
        'MINIGAME_FACTFINDING' => ['code' => 'A18', 'title' => 'حقیقت‌یابی', 'category' => 'cognitive', 'rawKeys' => ['A18_Fact']],
        'MINIGAME_5WHYS' => ['code' => '5W', 'title' => 'ریشه‌یابی (۵ چرا)', 'category' => 'methodology', 'methodKey' => '5whys'],
        'MINIGAME_SWOT' => ['code' => 'SWOT', 'title' => 'تحلیل SWOT', 'category' => 'methodology', 'methodKey' => 'swot'],
        'MINIGAME_CYNEFIN' => ['code' => 'CYN', 'title' => 'چارچوب Cynefin', 'category' => 'methodology', 'methodKey' => 'cynefin'],
        'MINIGAME_SJT' => ['code' => 'SJT', 'title' => 'قضاوت موقعیتی', 'category' => 'methodology', 'methodKey' => 'sjt'],
        'MINIGAME_BIGFIVE' => ['code' => 'B5', 'title' => 'آزمون شخصیت', 'category' => 'personality'],
    ];
}

// Per-test cognitive norms shown in the organization's cognitive profile.
function org_cognitive_tests(): array {
    return [
        'A9a' => ['raw' => 'A9a_Corsi', 'title' => 'حافظه فضایی (Corsi)'],
        'A9b' => ['raw' => 'A9b_Paired', 'title' => 'حافظه تداعی‌گر'],
        'A9c' => ['raw' => 'A9c_NBack', 'title' => 'حافظه فعال (N-Back)'],
        'A10' => ['raw' => 'A10_Math', 'title' => 'هوش محاسباتی'],
        'A10Plus' => ['raw' => 'A10Plus_Pattern', 'title' => 'استدلال الگو'],
        'A11' => ['raw' => 'A11_Speed', 'title' => 'سرعت ادراکی'],
        'A12' => ['raw' => 'A12_Visual', 'title' => 'تجسم فضایی'],
        'A13' => ['raw' => 'A13_Orient', 'title' => 'جهت‌یابی'],
        'A14' => ['raw' => 'A14_Stroop', 'title' => 'بازداری (استروپ)'],
        'A15' => ['raw' => 'A15_Multi', 'title' => 'مدیریت همزمان'],
        'A18' => ['raw' => 'A18_Fact', 'title' => 'حقیقت‌یابی'],
    ];
}

function org_game_title(string $view): string {
    $cat = org_assessment_catalog();
    if (isset($cat[$view])) return $cat[$view]['title'];
    return $view === 'MINIGAME_ROLEPLAY' ? 'شبیه‌ساز نقش‌آفرینی' : $view;
}

// Has this person completed the assessment? Same rule as isAssessmentDone()
// on the frontend: any recorded sub-test counts for a battery.
function org_assessment_done(string $view, array $state, array $methodology): bool {
    $def = org_assessment_catalog()[$view] ?? null;
    if ($def === null) return false;
    if ($def['category'] === 'personality') return $state['big_five'] !== null;
    if (isset($def['methodKey'])) return isset($methodology[$def['methodKey']]);
    foreach ($def['rawKeys'] as $k) {
        if ((float)($state['cognitive_raw'][$k] ?? 0) > 0) return true;
    }
    return false;
}

function org_sanitize_required(array $views): array {
    $catalog = org_assessment_catalog();
    $out = [];
    foreach ($views as $v) {
        $v = (string)$v;
        if (isset($catalog[$v]) && !in_array($v, $out, true)) $out[] = $v;
    }
    // Keep catalog order so every screen lists them the same way.
    return array_values(array_filter(array_keys($catalog), static fn($k) => in_array($k, $out, true)));
}

// --- Platform admins & access -------------------------------------------------

function is_platform_admin(PDO $pdo, int $uid): bool {
    static $cache = [];
    if (!array_key_exists($uid, $cache)) {
        $st = $pdo->prepare('SELECT 1 FROM platform_admins WHERE user_id=? LIMIT 1');
        $st->execute([$uid]);
        $cache[$uid] = (bool)$st->fetchColumn();
    }
    return $cache[$uid];
}

function require_platform_admin(PDO $pdo, array $auth): void {
    if (!is_platform_admin($pdo, (int)$auth['user']['id'])) error_response('FORBIDDEN', 'این بخش فقط برای مدیر سامانه در دسترس است.', 403);
}

function org_fetch(PDO $pdo, int $orgId): ?array {
    $st = $pdo->prepare('SELECT * FROM organizations WHERE id=? LIMIT 1');
    $st->execute([$orgId]);
    $row = $st->fetch();
    if (!$row) return null;
    $req = json_decode((string)$row['required_assessments'], true);
    $row['required_assessments'] = org_sanitize_required(is_array($req) ? $req : []);
    return $row;
}

function org_public(array $org): array {
    return [
        'id' => (int)$org['id'],
        'name' => (string)$org['name'],
        'industry' => $org['industry'],
        'description' => $org['description'],
        'status' => (string)$org['status'],
        'seatLimit' => $org['seat_limit'] === null ? null : (int)$org['seat_limit'],
        'requiredAssessments' => $org['required_assessments'],
        'dueDate' => $org['due_date'],
        'createdAt' => $org['created_at'],
    ];
}

// Resolves the caller's access to one organization, or ends the request.
//   $need = 'view'   : admins and managers (managers are read-only)
//   $need = 'manage' : admins only
// Returns ['org', 'role' => super|admin|manager, 'scope' => null|int[], 'membership'].
// 'scope' is the set of unit ids a manager may see (null = whole org).
// Non-members get 404 rather than 403 so organization ids can't be probed.
function org_access(PDO $pdo, array $auth, int $orgId, string $need = 'view'): array {
    $org = org_fetch($pdo, $orgId);
    if ($org === null) error_response('ORG_NOT_FOUND', 'سازمان پیدا نشد.', 404);
    $uid = (int)$auth['user']['id'];
    if (is_platform_admin($pdo, $uid)) return ['org' => $org, 'role' => 'super', 'scope' => null, 'membership' => null];

    $st = $pdo->prepare("SELECT * FROM org_members WHERE org_id=? AND user_id=? AND status='active' AND org_role IN ('admin','manager') LIMIT 1");
    $st->execute([$orgId, $uid]);
    $m = $st->fetch();
    if (!$m) error_response('ORG_NOT_FOUND', 'سازمان پیدا نشد.', 404);
    if ($org['status'] !== 'active') error_response('ORG_SUSPENDED', 'دسترسی این سازمان موقتاً غیرفعال شده است.', 403);
    if ($need === 'manage' && $m['org_role'] !== 'admin') error_response('FORBIDDEN', 'این عملیات فقط برای مدیر سازمان مجاز است.', 403);

    $scope = null;
    if ($m['org_role'] === 'manager' && $m['unit_id'] !== null) {
        $scope = org_unit_descendants(org_units_all($pdo, $orgId), (int)$m['unit_id']);
    }
    return ['org' => $org, 'role' => (string)$m['org_role'], 'scope' => $scope, 'membership' => $m];
}

function org_in_scope(?array $scope, $unitId): bool {
    return $scope === null || ($unitId !== null && in_array((int)$unitId, $scope, true));
}

// --- Units -------------------------------------------------------------------

function org_units_all(PDO $pdo, int $orgId): array {
    $st = $pdo->prepare('SELECT * FROM org_units WHERE org_id=? ORDER BY name');
    $st->execute([$orgId]);
    $out = [];
    foreach ($st->fetchAll() as $u) $out[(int)$u['id']] = $u;
    return $out;
}

// The unit and every unit below it.
function org_unit_descendants(array $units, int $rootId): array {
    $children = [];
    foreach ($units as $id => $u) {
        if ($u['parent_id'] !== null) $children[(int)$u['parent_id']][] = $id;
    }
    $out = [];
    $stack = [$rootId];
    while ($stack) {
        $id = array_pop($stack);
        if (in_array($id, $out, true) || !isset($units[$id])) continue;
        $out[] = $id;
        foreach ($children[$id] ?? [] as $c) $stack[] = $c;
    }
    return $out;
}

// "Parent / Child" display path for every unit (cycle-safe).
function org_unit_paths(array $units): array {
    $paths = [];
    foreach ($units as $id => $u) {
        $names = [];
        $seen = [];
        $cur = $id;
        while ($cur !== null && isset($units[$cur]) && !isset($seen[$cur])) {
            $seen[$cur] = true;
            array_unshift($names, (string)$units[$cur]['name']);
            $cur = $units[$cur]['parent_id'] === null ? null : (int)$units[$cur]['parent_id'];
        }
        $paths[$id] = implode(' / ', $names);
    }
    return $paths;
}

function org_unit_depths(array $units): array {
    $depths = [];
    foreach ($units as $id => $u) {
        $d = 0;
        $cur = $u['parent_id'] === null ? null : (int)$u['parent_id'];
        $seen = [];
        while ($cur !== null && isset($units[$cur]) && !isset($seen[$cur])) {
            $seen[$cur] = true;
            $d++;
            $cur = $units[$cur]['parent_id'] === null ? null : (int)$units[$cur]['parent_id'];
        }
        $depths[$id] = $d;
    }
    return $depths;
}

// --- Members -------------------------------------------------------------------

function org_members_all(PDO $pdo, int $orgId): array {
    $st = $pdo->prepare('SELECT m.*, u.email AS account_email, u.last_login_at FROM org_members m LEFT JOIN users u ON u.id=m.user_id WHERE m.org_id=? ORDER BY m.full_name');
    $st->execute([$orgId]);
    return $st->fetchAll();
}

// Seats are consumed by people who are (or will be) assessed: invited or
// active members and managers. Admins are operators and don't take a seat.
function org_seats_used(PDO $pdo, int $orgId, ?int $excludeMemberId = null): int {
    $sql = "SELECT COUNT(*) FROM org_members WHERE org_id=? AND org_role<>'admin' AND status IN ('invited','active')";
    $params = [$orgId];
    if ($excludeMemberId !== null) { $sql .= ' AND id<>?'; $params[] = $excludeMemberId; }
    $st = $pdo->prepare($sql);
    $st->execute($params);
    return (int)$st->fetchColumn();
}

// A fresh one-time invite token. Only its hash is stored, so a link can be
// shown when it is created but never read back; "resend" issues a new one.
function org_new_invite(): array {
    $raw = bin2hex(random_bytes(24));
    $days = max(1, (int)app_config('app.invite_ttl_days', 14));
    return ['raw' => $raw, 'hash' => token_hash($raw), 'expires' => date('Y-m-d H:i:s', time() + $days * 86400)];
}

// Best effort: only when both the join URL and a sender are configured. The
// admin always gets the link back to share through their own channels.
function org_send_invite_email(string $email, string $name, string $orgName, string $rawToken): bool {
    $base = rtrim((string)app_config('app.invite_url', ''), '/');
    $from = (string)app_config('app.mail_from', '');
    if ($base === '' || $from === '') return false;
    $link = $base . '?token=' . rawurlencode($rawToken);
    $body = "{$name} عزیز،\n\nسازمان «{$orgName}» شما را به ارزیابی شایستگی در آیکامپتنسی دعوت کرده است.\nبرای پیوستن و شروع آزمون‌ها روی لینک زیر کلیک کنید:\n{$link}\n";
    $headers = 'From: ' . $from . "\r\nContent-Type: text/plain; charset=UTF-8";
    return @mail($email, '=?UTF-8?B?' . base64_encode('دعوت به ارزیابی شایستگی — ' . $orgName) . '?=', $body, $headers);
}

function org_audit(PDO $pdo, int $orgId, ?int $actorId, string $action, ?string $target = null, array $details = []): void {
    $pdo->prepare('INSERT INTO org_audit_log (org_id,actor_user_id,action,target,details,created_at) VALUES (?,?,?,?,?,NOW())')
        ->execute([$orgId, $actorId, $action, $target === null ? null : clean_string($target, 190), $details ? json_for_db($details) : null]);
}

// --- Evidence & aggregation ---------------------------------------------------

// Profile state, methodology results and activity for many users in a few
// queries (per-user loading would be ~3 queries per person).
function org_load_evidence(PDO $pdo, array $userIds): array {
    $ids = array_values(array_unique(array_filter(array_map('intval', $userIds))));
    $out = [];
    foreach ($ids as $id) $out[$id] = ['state' => initial_profile_state(), 'methodology' => [], 'lastActivity' => null, 'attempts' => 0];
    foreach (array_chunk($ids, 500) as $chunk) {
        $in = implode(',', array_fill(0, count($chunk), '?'));
        $st = $pdo->prepare("SELECT * FROM user_profiles WHERE user_id IN ($in)");
        $st->execute($chunk);
        foreach ($st->fetchAll() as $r) $out[(int)$r['user_id']]['state'] = profile_row_to_state($r);

        $st = $pdo->prepare("SELECT user_id,game_view,raw_score,payload,created_at FROM game_results WHERE user_id IN ($in) AND game_view IN ('MINIGAME_5WHYS','MINIGAME_SWOT','MINIGAME_CYNEFIN','MINIGAME_SJT') ORDER BY created_at DESC");
        $st->execute($chunk);
        $byUser = [];
        foreach ($st->fetchAll() as $r) $byUser[(int)$r['user_id']][] = $r;
        foreach ($byUser as $uid => $rows) $out[$uid]['methodology'] = methodology_results_from_rows($rows);

        $st = $pdo->prepare("SELECT user_id, MAX(created_at) AS last_at, COUNT(*) AS n FROM game_results WHERE user_id IN ($in) GROUP BY user_id");
        $st->execute($chunk);
        foreach ($st->fetchAll() as $r) {
            $out[(int)$r['user_id']]['lastActivity'] = $r['last_at'];
            $out[(int)$r['user_id']]['attempts'] = (int)$r['n'];
        }
    }
    return $out;
}

// One member's row for tables and exports. Results are only included for
// active members (consent given, not withdrawn).
function org_member_summary(array $m, ?array $ev, array $required, array $unitPaths): array {
    $unitId = $m['unit_id'] === null ? null : (int)$m['unit_id'];
    $s = [
        'id' => (int)$m['id'],
        'userId' => $m['user_id'] === null ? null : (int)$m['user_id'],
        'fullName' => (string)$m['full_name'],
        'email' => (string)$m['email'],
        'accountEmail' => $m['account_email'] ?? null,
        'employeeCode' => $m['employee_code'],
        'jobTitle' => $m['job_title'],
        'unitId' => $unitId,
        'unitPath' => $unitId !== null ? ($unitPaths[$unitId] ?? null) : null,
        'orgRole' => (string)$m['org_role'],
        'status' => (string)$m['status'],
        'invitedAt' => $m['invited_at'],
        'inviteExpiresAt' => $m['invite_expires_at'],
        'joinedAt' => $m['joined_at'],
        'lastLoginAt' => $m['last_login_at'] ?? null,
        'lastActivityAt' => null,
        'requiredDone' => 0,
        'requiredTotal' => count($required),
        'completionPct' => 0,
        'completedAssessments' => [],
        'overallScore' => null,
        'competencies' => (object)[],
        'bigFiveValidity' => null,
    ];
    if ($m['status'] !== 'active' || $ev === null) return $s;

    $state = $ev['state'];
    $meth = $ev['methodology'];
    $done = [];
    foreach (array_keys(org_assessment_catalog()) as $view) {
        if (org_assessment_done($view, $state, $meth)) $done[] = $view;
    }
    $reqDone = count(array_intersect($required, $done));
    $comps = [];
    $scores = [];
    foreach (calculate_competencies($state['cognitive_raw'], $state['big_five'], $meth) as $c) {
        $v = ($c['score'] !== null && !$c['insufficient']) ? (int)$c['score'] : null;
        $comps[$c['key']] = $v;
        if ($v !== null) $scores[] = $v;
    }
    $s['lastActivityAt'] = $ev['lastActivity'];
    $s['requiredDone'] = $reqDone;
    $s['completionPct'] = $required ? (int)round(100 * $reqDone / count($required)) : 100;
    $s['completedAssessments'] = $done;
    $s['overallScore'] = $scores ? (int)round(array_sum($scores) / count($scores)) : null;
    $s['competencies'] = $comps;
    $s['bigFiveValidity'] = $state['big_five']['_validity'] ?? null;
    return $s;
}

function org_competency_bucket(int $score): string {
    if ($score >= 75) return 'strong';
    if ($score >= 60) return 'good';
    if ($score >= 40) return 'average';
    return 'develop';
}

function org_mean(array $values): ?int {
    return $values ? (int)round(array_sum($values) / count($values)) : null;
}

// Workforce dashboard for an organization, optionally narrowed to one unit
// subtree ($unitFilter) and always clipped to the caller's scope.
function org_build_dashboard(PDO $pdo, array $org, ?array $scope, ?int $unitFilter): array {
    $orgId = (int)$org['id'];
    $required = $org['required_assessments'];
    $units = org_units_all($pdo, $orgId);
    $paths = org_unit_paths($units);
    $depths = org_unit_depths($units);

    $visibleUnits = $scope;
    if ($unitFilter !== null) {
        $sub = org_unit_descendants($units, $unitFilter);
        $visibleUnits = $visibleUnits === null ? $sub : array_values(array_intersect($visibleUnits, $sub));
    }

    // Workforce = everyone assessed; admins are operators and stay out of it.
    $rows = array_values(array_filter(org_members_all($pdo, $orgId), static function ($m) use ($visibleUnits) {
        return $m['org_role'] !== 'admin' && org_in_scope($visibleUnits, $m['unit_id']);
    }));
    $activeIds = [];
    foreach ($rows as $m) if ($m['status'] === 'active' && $m['user_id'] !== null) $activeIds[] = (int)$m['user_id'];
    $evidence = org_load_evidence($pdo, $activeIds);

    $summaries = [];
    foreach ($rows as $m) {
        $ev = $m['user_id'] !== null ? ($evidence[(int)$m['user_id']] ?? null) : null;
        $summaries[] = org_member_summary($m, $ev, $required, $paths);
    }
    $active = array_values(array_filter($summaries, static fn($s) => $s['status'] === 'active'));

    $head = ['total' => count($summaries), 'invited' => 0, 'active' => 0, 'inactive' => 0, 'left' => 0];
    foreach ($summaries as $s) $head[$s['status']]++;

    $started = count(array_filter($active, static fn($s) => $s['requiredDone'] > 0));
    $completed = count(array_filter($active, static fn($s) => $s['requiredTotal'] > 0 && $s['requiredDone'] >= $s['requiredTotal']));
    $dueDate = $org['due_date'];
    $daysLeft = $dueDate ? (int)floor((strtotime($dueDate . ' 23:59:59') - time()) / 86400) : null;
    $overdue = ($dueDate && $daysLeft !== null && $daysLeft < 0)
        ? count(array_filter($active, static fn($s) => $s['requiredDone'] < $s['requiredTotal'])) : 0;

    // Per-assessment completion among active members.
    $assessments = [];
    foreach (org_assessment_catalog() as $view => $def) {
        $done = count(array_filter($active, static fn($s) => in_array($view, $s['completedAssessments'], true)));
        $assessments[] = ['view' => $view, 'code' => $def['code'], 'title' => $def['title'], 'category' => $def['category'], 'required' => in_array($view, $required, true), 'done' => $done, 'of' => count($active)];
    }

    // Competencies: only members with sufficient evidence count.
    $competencies = [];
    foreach (competency_matrix() as $key => $def) {
        $vals = [];
        $buckets = ['develop' => 0, 'average' => 0, 'good' => 0, 'strong' => 0];
        foreach ($active as $s) {
            $v = $s['competencies'][$key] ?? null;
            if ($v === null) continue;
            $vals[] = $v;
            $buckets[org_competency_bucket($v)]++;
        }
        $competencies[] = ['key' => $key, 'title' => $def['title'], 'n' => count($vals), 'mean' => org_mean($vals), 'buckets' => $buckets];
    }

    // Cognitive tests (mean T among people who took each test) and Big Five
    // (runs flagged invalid are excluded, as in the competency matrix).
    $cognitive = [];
    $bigFive = ['n' => 0, 'invalidExcluded' => 0, 'traits' => []];
    $traitVals = ['Openness' => [], 'Conscientiousness' => [], 'Extraversion' => [], 'Agreeableness' => [], 'Neuroticism' => []];
    $tVals = array_fill_keys(array_keys(org_cognitive_tests()), []);
    foreach ($rows as $m) {
        if ($m['status'] !== 'active' || $m['user_id'] === null) continue;
        $state = $evidence[(int)$m['user_id']]['state'] ?? null;
        if ($state === null) continue;
        foreach (org_cognitive_tests() as $nk => $t) {
            $raw = (float)($state['cognitive_raw'][$t['raw']] ?? 0);
            if ($raw > 0) $tVals[$nk][] = to_t_score($raw, $nk);
        }
        $bf = $state['big_five'];
        if ($bf === null) continue;
        if (($bf['_validity'] ?? null) === 'invalid') { $bigFive['invalidExcluded']++; continue; }
        $bigFive['n']++;
        foreach ($traitVals as $tk => $_) if (isset($bf[$tk]) && is_numeric($bf[$tk])) $traitVals[$tk][] = (float)$bf[$tk];
    }
    foreach (org_cognitive_tests() as $nk => $t) $cognitive[] = ['key' => $nk, 'title' => $t['title'], 'n' => count($tVals[$nk]), 'meanT' => org_mean($tVals[$nk])];
    foreach ($traitVals as $tk => $vals) $bigFive['traits'][$tk] = org_mean($vals);

    // Unit comparison: every visible unit, rolled up over its subtree.
    $unitRows = [];
    $unitIdsForTable = $visibleUnits === null ? array_keys($units) : $visibleUnits;
    foreach ($unitIdsForTable as $uid) {
        if (!isset($units[$uid])) continue;
        $sub = org_unit_descendants($units, $uid);
        $members = array_values(array_filter($summaries, static fn($s) => $s['unitId'] !== null && in_array($s['unitId'], $sub, true)));
        $unitRows[] = org_unit_rollup($uid, (string)$units[$uid]['name'], $paths[$uid] ?? '', $units[$uid]['parent_id'] === null ? null : (int)$units[$uid]['parent_id'], $depths[$uid] ?? 0, $members);
    }
    $unassigned = array_values(array_filter($summaries, static fn($s) => $s['unitId'] === null));
    if ($unassigned && $visibleUnits === null) $unitRows[] = org_unit_rollup(0, 'بدون واحد', 'بدون واحد', null, 0, $unassigned);
    usort($unitRows, static fn($a, $b) => strcmp($a['path'], $b['path']));

    // Recent activity among the active workforce.
    $recent = [];
    if ($activeIds) {
        $byUser = [];
        foreach ($active as $s) if ($s['userId'] !== null) $byUser[$s['userId']] = $s;
        $in = implode(',', array_fill(0, count($activeIds), '?'));
        $st = $pdo->prepare("SELECT user_id, game_view, created_at FROM game_results WHERE user_id IN ($in) ORDER BY created_at DESC, id DESC LIMIT 15");
        $st->execute($activeIds);
        foreach ($st->fetchAll() as $r) {
            $s = $byUser[(int)$r['user_id']] ?? null;
            if ($s === null) continue;
            $recent[] = ['memberId' => $s['id'], 'fullName' => $s['fullName'], 'view' => $r['game_view'], 'title' => org_game_title((string)$r['game_view']), 'at' => $r['created_at']];
        }
    }

    // Follow-up lists: invitations nobody accepted, and joiners who never started.
    $weekAgo = time() - 7 * 86400;
    $notJoined = array_values(array_filter($summaries, static fn($s) => $s['status'] === 'invited' && $s['invitedAt'] !== null && strtotime($s['invitedAt']) < $weekAgo));
    $noProgress = array_values(array_filter($active, static fn($s) => $s['requiredDone'] === 0 && $s['joinedAt'] !== null && strtotime($s['joinedAt']) < $weekAgo));
    $pick = static fn($list) => array_map(static fn($s) => ['id' => $s['id'], 'fullName' => $s['fullName'], 'email' => $s['email'], 'unitPath' => $s['unitPath'], 'since' => $s['status'] === 'invited' ? $s['invitedAt'] : $s['joinedAt']], array_slice($list, 0, 10));

    return [
        'generatedAt' => date(DATE_ATOM),
        'scope' => ['unitId' => $unitFilter, 'unitPath' => $unitFilter !== null ? ($paths[$unitFilter] ?? null) : null, 'restricted' => $scope !== null],
        'headcount' => $head,
        'funnel' => ['invited' => $head['invited'] + $head['active'], 'joined' => $head['active'], 'started' => $started, 'completed' => $completed],
        'completion' => [
            'requiredCount' => count($required),
            'avgPct' => org_mean(array_map(static fn($s) => $s['completionPct'], $active)) ?? 0,
            'dueDate' => $dueDate,
            'daysLeft' => $daysLeft,
            'overdue' => $overdue,
        ],
        'overallMean' => org_mean(array_values(array_filter(array_map(static fn($s) => $s['overallScore'], $active), static fn($v) => $v !== null))),
        'assessments' => $assessments,
        'competencies' => $competencies,
        'cognitive' => $cognitive,
        'bigFive' => $bigFive,
        'units' => $unitRows,
        'recent' => $recent,
        'followUp' => [
            'notJoinedCount' => count($notJoined),
            'notJoined' => $pick($notJoined),
            'noProgressCount' => count($noProgress),
            'noProgress' => $pick($noProgress),
        ],
    ];
}

function org_unit_rollup(int $id, string $name, string $path, ?int $parentId, int $depth, array $members): array {
    $active = array_values(array_filter($members, static fn($s) => $s['status'] === 'active'));
    $comps = [];
    foreach (array_keys(competency_matrix()) as $key) {
        $vals = array_values(array_filter(array_map(static fn($s) => $s['competencies'][$key] ?? null, $active), static fn($v) => $v !== null));
        $comps[$key] = ['mean' => org_mean($vals), 'n' => count($vals)];
    }
    return [
        'id' => $id,
        'name' => $name,
        'path' => $path,
        'parentId' => $parentId,
        'depth' => $depth,
        'headcount' => count(array_filter($members, static fn($s) => $s['status'] === 'invited' || $s['status'] === 'active')),
        'active' => count($active),
        'completionPct' => org_mean(array_map(static fn($s) => $s['completionPct'], $active)) ?? 0,
        'overallMean' => org_mean(array_values(array_filter(array_map(static fn($s) => $s['overallScore'], $active), static fn($v) => $v !== null))),
        'competencies' => $comps,
    ];
}

// Active organization memberships for the signed-in user's own profile
// (their "assigned by your organization" card) and admin-panel access.
function org_memberships_for_user(PDO $pdo, int $uid): array {
    $st = $pdo->prepare("SELECT m.id, m.org_id, m.org_role, m.job_title, m.unit_id, m.joined_at, o.name AS org_name, o.required_assessments, o.due_date FROM org_members m JOIN organizations o ON o.id=m.org_id WHERE m.user_id=? AND m.status='active' AND o.status='active' ORDER BY o.name");
    $st->execute([$uid]);
    $out = [];
    foreach ($st->fetchAll() as $r) {
        $unitPath = null;
        if ($r['unit_id'] !== null) {
            $units = org_units_all($pdo, (int)$r['org_id']);
            $unitPath = org_unit_paths($units)[(int)$r['unit_id']] ?? null;
        }
        $req = json_decode((string)$r['required_assessments'], true);
        $out[] = [
            'memberId' => (int)$r['id'],
            'orgId' => (int)$r['org_id'],
            'orgName' => (string)$r['org_name'],
            'orgRole' => (string)$r['org_role'],
            'jobTitle' => $r['job_title'],
            'unitPath' => $unitPath,
            'requiredAssessments' => org_sanitize_required(is_array($req) ? $req : []),
            'dueDate' => $r['due_date'],
            'joinedAt' => $r['joined_at'],
        ];
    }
    return $out;
}
