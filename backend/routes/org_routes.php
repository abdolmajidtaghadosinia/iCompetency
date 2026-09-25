<?php
declare(strict_types=1);
// Organization API (docs/organizations.md). Every handler resolves the
// caller's access itself through org_access()/require_platform_admin(), in
// line with the other route files (no middleware layer).
//
//   Platform admin:  GET/POST /admin/orgs, PUT/DELETE /admin/orgs/{id}
//   Org admin/manager:
//     GET  /orgs                              organizations I can open
//     GET  /orgs/{id}                         org + units + seats + my role
//     PUT  /orgs/{id}                         settings (admin)
//     GET  /orgs/{id}/dashboard?unitId=       workforce dashboard
//     POST /orgs/{id}/units, PUT|DELETE /orgs/{id}/units/{uid}      (admin)
//     GET  /orgs/{id}/members                 member table
//     POST /orgs/{id}/members                 add one (admin)
//     POST /orgs/{id}/members/import          bulk import, supports dryRun (admin)
//     GET  /orgs/{id}/members/{mid}           member report
//     PUT|DELETE /orgs/{id}/members/{mid}     (admin)
//     POST /orgs/{id}/members/{mid}/invite    new invite link (admin)
//     GET  /orgs/{id}/audit                   audit log (admin)
//   Member:
//     GET  /invites/lookup?token=             public: who is invited where
//     POST /invites/accept                    bind the invite to my account
//     POST /orgs/{id}/leave                   withdraw from the organization

function handle_org_route(string $method, string $path): bool {
    if (strpos($path, '/admin/orgs') === 0) {
        if ($path === '/admin/orgs') {
            if ($method === 'GET') { admin_orgs_index(); return true; }
            if ($method === 'POST') { admin_orgs_create(); return true; }
            method_not_allowed(['GET', 'POST']);
        }
        if (preg_match('#^/admin/orgs/(\d+)$#', $path, $m)) {
            if ($method === 'PUT') { admin_orgs_update((int)$m[1]); return true; }
            if ($method === 'DELETE') { admin_orgs_delete((int)$m[1]); return true; }
            method_not_allowed(['PUT', 'DELETE']);
        }
        error_response('NOT_FOUND', 'مسیر مدیریت سازمان پیدا نشد.', 404);
    }
    if ($path === '/invites/lookup') {
        if ($method !== 'GET') method_not_allowed(['GET']);
        invite_lookup();
        return true;
    }
    if ($path === '/invites/accept') {
        if ($method !== 'POST') method_not_allowed(['POST']);
        invite_accept();
        return true;
    }
    if ($path === '/orgs') {
        if ($method !== 'GET') method_not_allowed(['GET']);
        orgs_index();
        return true;
    }
    if (!preg_match('#^/orgs/(\d+)(/.*)?$#', $path, $m)) return false;
    $orgId = (int)$m[1];
    $rest = $m[2] ?? '';

    if ($rest === '') {
        if ($method === 'GET') { org_show($orgId); return true; }
        if ($method === 'PUT') { org_update_settings($orgId); return true; }
        method_not_allowed(['GET', 'PUT']);
    }
    if ($rest === '/dashboard') { if ($method !== 'GET') method_not_allowed(['GET']); org_dashboard($orgId); return true; }
    if ($rest === '/audit') { if ($method !== 'GET') method_not_allowed(['GET']); org_audit_index($orgId); return true; }
    if ($rest === '/leave') { if ($method !== 'POST') method_not_allowed(['POST']); org_leave($orgId); return true; }
    if ($rest === '/units') { if ($method !== 'POST') method_not_allowed(['POST']); org_unit_create($orgId); return true; }
    if (preg_match('#^/units/(\d+)$#', $rest, $u)) {
        if ($method === 'PUT') { org_unit_update($orgId, (int)$u[1]); return true; }
        if ($method === 'DELETE') { org_unit_delete($orgId, (int)$u[1]); return true; }
        method_not_allowed(['PUT', 'DELETE']);
    }
    if ($rest === '/members') {
        if ($method === 'GET') { org_members_index($orgId); return true; }
        if ($method === 'POST') { org_member_create($orgId); return true; }
        method_not_allowed(['GET', 'POST']);
    }
    if ($rest === '/members/import') { if ($method !== 'POST') method_not_allowed(['POST']); org_members_import($orgId); return true; }
    if (preg_match('#^/members/(\d+)(/invite)?$#', $rest, $mm)) {
        $mid = (int)$mm[1];
        if (($mm[2] ?? '') === '/invite') {
            if ($method !== 'POST') method_not_allowed(['POST']);
            org_member_reinvite($orgId, $mid);
            return true;
        }
        if ($method === 'GET') { org_member_report($orgId, $mid); return true; }
        if ($method === 'PUT') { org_member_update($orgId, $mid); return true; }
        if ($method === 'DELETE') { org_member_delete($orgId, $mid); return true; }
        method_not_allowed(['GET', 'PUT', 'DELETE']);
    }
    error_response('NOT_FOUND', 'مسیر سازمان پیدا نشد.', 404);
    return true;
}

// --- Shared validation ----------------------------------------------------------

function org_opt_date(array $d, string $k): ?string {
    if (!array_key_exists($k, $d) || $d[$k] === null || $d[$k] === '') return null;
    $v = clean_string($d[$k], 10);
    $dt = DateTime::createFromFormat('Y-m-d', $v);
    if (!$dt || $dt->format('Y-m-d') !== $v) error_response('VALIDATION_ERROR', 'تاریخ مهلت باید به شکل YYYY-MM-DD باشد.', 422);
    return $v;
}

function org_opt_seat_limit(array $d): ?int {
    if (!array_key_exists('seatLimit', $d) || $d['seatLimit'] === null || $d['seatLimit'] === '') return null;
    return (int)number_value($d['seatLimit'], 1, 1000000);
}

function org_required_from(array $d): array {
    if (!isset($d['requiredAssessments']) || !is_array($d['requiredAssessments'])) error_response('VALIDATION_ERROR', 'فهرست آزمون‌های الزامی نامعتبر است.', 422);
    $req = org_sanitize_required($d['requiredAssessments']);
    if (!$req) error_response('VALIDATION_ERROR', 'حداقل یک آزمون الزامی انتخاب کنید.', 422);
    return $req;
}

function org_valid_email(string $raw): ?string {
    $e = strtolower(clean_string($raw, 190));
    return filter_var($e, FILTER_VALIDATE_EMAIL) ? $e : null;
}

function org_unit_or_fail(array $units, $unitId): ?int {
    if ($unitId === null || $unitId === '' || $unitId === 0 || $unitId === '0') return null;
    $id = (int)$unitId;
    if (!isset($units[$id])) error_response('VALIDATION_ERROR', 'واحد انتخاب‌شده در این سازمان وجود ندارد.', 422);
    return $id;
}

function org_member_or_fail(PDO $pdo, int $orgId, int $mid): array {
    $st = $pdo->prepare('SELECT m.*, u.email AS account_email, u.last_login_at FROM org_members m LEFT JOIN users u ON u.id=m.user_id WHERE m.id=? AND m.org_id=? LIMIT 1');
    $st->execute([$mid, $orgId]);
    $m = $st->fetch();
    if (!$m) error_response('MEMBER_NOT_FOUND', 'عضو پیدا نشد.', 404);
    return $m;
}

// An organization must keep at least one active admin (platform admins can
// always step in, but the org would otherwise lock itself out).
function org_guard_last_admin(PDO $pdo, array $member, string $action): void {
    if ($member['org_role'] !== 'admin' || $member['status'] !== 'active') return;
    $st = $pdo->prepare("SELECT COUNT(*) FROM org_members WHERE org_id=? AND org_role='admin' AND status='active' AND id<>?");
    $st->execute([(int)$member['org_id'], (int)$member['id']]);
    if ((int)$st->fetchColumn() === 0) error_response('LAST_ADMIN', "امکان {$action} آخرین مدیر فعال سازمان وجود ندارد.", 422);
}

function org_check_seats(PDO $pdo, array $org, int $adding, ?int $excludeMemberId = null): void {
    if ($org['seat_limit'] === null || $adding <= 0) return;
    if (org_seats_used($pdo, (int)$org['id'], $excludeMemberId) + $adding > (int)$org['seat_limit']) {
        error_response('SEAT_LIMIT', 'ظرفیت مجاز این سازمان تکمیل است. برای افزایش ظرفیت با مدیر سامانه تماس بگیرید.', 422, ['limit' => (int)$org['seat_limit']]);
    }
}

// --- Platform admin ---------------------------------------------------------------

function admin_orgs_index(): void {
    $pdo = Database::pdo();
    $a = require_auth();
    require_platform_admin($pdo, $a);
    $orgs = $pdo->query('SELECT * FROM organizations ORDER BY name')->fetchAll();
    $counts = [];
    foreach ($pdo->query("SELECT org_id, status, org_role, COUNT(*) AS n FROM org_members GROUP BY org_id, status, org_role")->fetchAll() as $r) {
        $id = (int)$r['org_id'];
        $n = (int)$r['n'];
        $counts[$id] = $counts[$id] ?? ['total' => 0, 'active' => 0, 'invited' => 0, 'admins' => 0];
        if ($r['org_role'] === 'admin') {
            if ($r['status'] === 'active') $counts[$id]['admins'] += $n;
        } elseif ($r['status'] === 'active' || $r['status'] === 'invited') {
            $counts[$id]['total'] += $n;
            $counts[$id][$r['status']] += $n;
        }
    }
    $out = [];
    foreach ($orgs as $o) {
        $req = json_decode((string)$o['required_assessments'], true);
        $o['required_assessments'] = org_sanitize_required(is_array($req) ? $req : []);
        $out[] = org_public($o) + ['counts' => $counts[(int)$o['id']] ?? ['total' => 0, 'active' => 0, 'invited' => 0, 'admins' => 0]];
    }
    $totals = [
        'organizations' => count($orgs),
        'users' => (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
        'members' => (int)$pdo->query("SELECT COUNT(*) FROM org_members WHERE status='active' AND org_role<>'admin'")->fetchColumn(),
        'assessments30d' => (int)$pdo->query('SELECT COUNT(*) FROM game_results WHERE created_at >= (NOW() - INTERVAL 30 DAY)')->fetchColumn(),
    ];
    success_response(['organizations' => $out, 'totals' => $totals]);
}

function admin_orgs_create(): void {
    $pdo = Database::pdo();
    $a = require_auth();
    require_platform_admin($pdo, $a);
    $d = read_json_body();
    reject_unknown_keys($d, ['name', 'industry', 'description', 'seatLimit', 'requiredAssessments', 'dueDate', 'adminEmail', 'adminName'], 'ایجاد سازمان');
    $name = require_string($d, 'name', 190);
    $required = isset($d['requiredAssessments']) ? org_required_from($d) : array_keys(org_assessment_catalog());
    $adminEmail = null;
    if (!empty($d['adminEmail'])) {
        $adminEmail = org_valid_email((string)$d['adminEmail']);
        if ($adminEmail === null) error_response('INVALID_EMAIL', 'ایمیل مدیر سازمان معتبر نیست.', 422);
    }
    try {
        $pdo->beginTransaction();
        $pdo->prepare('INSERT INTO organizations (name,industry,description,status,seat_limit,required_assessments,due_date,created_by,created_at,updated_at) VALUES (?,?,?,"active",?,?,?,?,NOW(),NOW())')
            ->execute([$name, optional_string($d, 'industry', 120) ?: null, optional_string($d, 'description', 1000) ?: null, org_opt_seat_limit($d), json_for_db($required), org_opt_date($d, 'dueDate'), (int)$a['user']['id']]);
        $orgId = (int)$pdo->lastInsertId();
        org_audit($pdo, $orgId, (int)$a['user']['id'], 'org.create', $name);
        $invite = null;
        if ($adminEmail !== null) {
            $inv = org_new_invite();
            $adminName = optional_string($d, 'adminName', 190) ?: $adminEmail;
            $pdo->prepare("INSERT INTO org_members (org_id,email,full_name,org_role,status,invite_token_hash,invite_expires_at,invited_at,created_at,updated_at) VALUES (?,?,?,'admin','invited',?,?,NOW(),NOW(),NOW())")
                ->execute([$orgId, $adminEmail, $adminName, $inv['hash'], $inv['expires']]);
            org_audit($pdo, $orgId, (int)$a['user']['id'], 'member.create', $adminEmail, ['role' => 'admin']);
            $invite = ['email' => $adminEmail, 'token' => $inv['raw'], 'expiresAt' => $inv['expires'], 'emailed' => false];
        }
        $pdo->commit();
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($e->getCode() === '23000') error_response('ORG_EXISTS', 'سازمانی با این نام وجود دارد.', 409);
        throw $e;
    }
    if ($invite !== null) $invite['emailed'] = org_send_invite_email($invite['email'], optional_string($d, 'adminName', 190) ?: $invite['email'], $name, $invite['token']);
    success_response(['organization' => org_public(org_fetch($pdo, $orgId)), 'adminInvite' => $invite], 201);
}

function admin_orgs_update(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    require_platform_admin($pdo, $a);
    $org = org_fetch($pdo, $orgId);
    if ($org === null) error_response('ORG_NOT_FOUND', 'سازمان پیدا نشد.', 404);
    $d = read_json_body();
    reject_unknown_keys($d, ['name', 'industry', 'description', 'status', 'seatLimit', 'requiredAssessments', 'dueDate'], 'ویرایش سازمان');
    $fields = [];
    $params = [];
    if (array_key_exists('name', $d)) { $fields[] = 'name=?'; $params[] = require_string($d, 'name', 190); }
    if (array_key_exists('industry', $d)) { $fields[] = 'industry=?'; $params[] = optional_string($d, 'industry', 120) ?: null; }
    if (array_key_exists('description', $d)) { $fields[] = 'description=?'; $params[] = optional_string($d, 'description', 1000) ?: null; }
    if (array_key_exists('status', $d)) { $fields[] = 'status=?'; $params[] = require_allowed((string)$d['status'], ['active', 'suspended'], 'status'); }
    if (array_key_exists('seatLimit', $d)) {
        $limit = org_opt_seat_limit($d);
        if ($limit !== null && $limit < org_seats_used($pdo, $orgId)) error_response('VALIDATION_ERROR', 'ظرفیت جدید از تعداد اعضای فعلی کمتر است.', 422);
        $fields[] = 'seat_limit=?';
        $params[] = $limit;
    }
    if (array_key_exists('requiredAssessments', $d)) { $fields[] = 'required_assessments=?'; $params[] = json_for_db(org_required_from($d)); }
    if (array_key_exists('dueDate', $d)) { $fields[] = 'due_date=?'; $params[] = org_opt_date($d, 'dueDate'); }
    if ($fields) {
        $params[] = $orgId;
        try {
            $pdo->prepare('UPDATE organizations SET ' . implode(',', $fields) . ',updated_at=NOW() WHERE id=?')->execute($params);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') error_response('ORG_EXISTS', 'سازمانی با این نام وجود دارد.', 409);
            throw $e;
        }
        org_audit($pdo, $orgId, (int)$a['user']['id'], 'org.update', null, ['fields' => array_keys($d)]);
    }
    success_response(['organization' => org_public(org_fetch($pdo, $orgId))]);
}

function admin_orgs_delete(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    require_platform_admin($pdo, $a);
    $org = org_fetch($pdo, $orgId);
    if ($org === null) error_response('ORG_NOT_FOUND', 'سازمان پیدا نشد.', 404);
    $d = read_json_body();
    reject_unknown_keys($d, ['confirmName'], 'حذف سازمان');
    // Deleting removes units, memberships and the audit trail (user accounts
    // and their results stay). Typing the name guards against a misclick.
    if (optional_string($d, 'confirmName', 190) !== $org['name']) error_response('CONFIRMATION_REQUIRED', 'برای حذف، نام سازمان را دقیقاً وارد کنید.', 422);
    $pdo->prepare('DELETE FROM organizations WHERE id=?')->execute([$orgId]);
    success_response(['deleted' => true]);
}

// --- Organization workspace ------------------------------------------------------

function orgs_index(): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $uid = (int)$a['user']['id'];
    if (is_platform_admin($pdo, $uid)) {
        $rows = $pdo->query('SELECT id, name, status FROM organizations ORDER BY name')->fetchAll();
        $out = array_map(static fn($r) => ['id' => (int)$r['id'], 'name' => (string)$r['name'], 'status' => (string)$r['status'], 'role' => 'super'], $rows);
        success_response(['organizations' => $out, 'platformAdmin' => true]);
    }
    $st = $pdo->prepare("SELECT o.id, o.name, o.status, m.org_role FROM org_members m JOIN organizations o ON o.id=m.org_id WHERE m.user_id=? AND m.status='active' AND m.org_role IN ('admin','manager') ORDER BY o.name");
    $st->execute([$uid]);
    $out = array_map(static fn($r) => ['id' => (int)$r['id'], 'name' => (string)$r['name'], 'status' => (string)$r['status'], 'role' => (string)$r['org_role']], $st->fetchAll());
    success_response(['organizations' => $out, 'platformAdmin' => false]);
}

function org_show(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $acc = org_access($pdo, $a, $orgId, 'view');
    $units = org_units_all($pdo, $orgId);
    $paths = org_unit_paths($units);
    $depths = org_unit_depths($units);
    $counts = [];
    $st = $pdo->prepare("SELECT unit_id, COUNT(*) AS n FROM org_members WHERE org_id=? AND status IN ('invited','active') AND unit_id IS NOT NULL GROUP BY unit_id");
    $st->execute([$orgId]);
    foreach ($st->fetchAll() as $r) $counts[(int)$r['unit_id']] = (int)$r['n'];
    $unitOut = [];
    foreach ($units as $id => $u) {
        if (!org_in_scope($acc['scope'], $id)) continue;
        $unitOut[] = ['id' => $id, 'name' => (string)$u['name'], 'code' => $u['code'], 'parentId' => $u['parent_id'] === null ? null : (int)$u['parent_id'], 'path' => $paths[$id], 'depth' => $depths[$id], 'memberCount' => $counts[$id] ?? 0];
    }
    usort($unitOut, static fn($x, $y) => strcmp($x['path'], $y['path']));
    $catalog = [];
    foreach (org_assessment_catalog() as $view => $def) $catalog[] = ['view' => $view, 'code' => $def['code'], 'title' => $def['title'], 'category' => $def['category']];
    success_response([
        'organization' => org_public($acc['org']),
        'role' => $acc['role'],
        'scopeUnitIds' => $acc['scope'],
        'units' => $unitOut,
        'seats' => ['used' => org_seats_used($pdo, $orgId), 'limit' => $acc['org']['seat_limit'] === null ? null : (int)$acc['org']['seat_limit']],
        'catalog' => $catalog,
        'inviteTtlDays' => max(1, (int)app_config('app.invite_ttl_days', 14)),
    ]);
}

function org_update_settings(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $acc = org_access($pdo, $a, $orgId, 'manage');
    $d = read_json_body();
    // Status and seat limit are the platform's call (/admin/orgs/{id}).
    reject_unknown_keys($d, ['name', 'industry', 'description', 'requiredAssessments', 'dueDate'], 'تنظیمات سازمان');
    $fields = [];
    $params = [];
    if (array_key_exists('name', $d)) { $fields[] = 'name=?'; $params[] = require_string($d, 'name', 190); }
    if (array_key_exists('industry', $d)) { $fields[] = 'industry=?'; $params[] = optional_string($d, 'industry', 120) ?: null; }
    if (array_key_exists('description', $d)) { $fields[] = 'description=?'; $params[] = optional_string($d, 'description', 1000) ?: null; }
    if (array_key_exists('requiredAssessments', $d)) { $fields[] = 'required_assessments=?'; $params[] = json_for_db(org_required_from($d)); }
    if (array_key_exists('dueDate', $d)) { $fields[] = 'due_date=?'; $params[] = org_opt_date($d, 'dueDate'); }
    if ($fields) {
        $params[] = $orgId;
        try {
            $pdo->prepare('UPDATE organizations SET ' . implode(',', $fields) . ',updated_at=NOW() WHERE id=?')->execute($params);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') error_response('ORG_EXISTS', 'سازمانی با این نام وجود دارد.', 409);
            throw $e;
        }
        org_audit($pdo, $orgId, (int)$a['user']['id'], 'settings.update', null, ['fields' => array_keys($d)]);
    }
    success_response(['organization' => org_public(org_fetch($pdo, $orgId))]);
}

function org_dashboard(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $acc = org_access($pdo, $a, $orgId, 'view');
    $unitFilter = null;
    if (isset($_GET['unitId']) && $_GET['unitId'] !== '') {
        $unitFilter = org_unit_or_fail(org_units_all($pdo, $orgId), $_GET['unitId']);
        if (!org_in_scope($acc['scope'], $unitFilter)) error_response('FORBIDDEN', 'به این واحد دسترسی ندارید.', 403);
    }
    success_response(org_build_dashboard($pdo, $acc['org'], $acc['scope'], $unitFilter));
}

function org_audit_index(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    org_access($pdo, $a, $orgId, 'manage');
    $limit = max(1, min(200, (int)($_GET['limit'] ?? 60)));
    $st = $pdo->prepare("SELECT l.id, l.action, l.target, l.details, l.created_at, u.name AS actor_name FROM org_audit_log l LEFT JOIN users u ON u.id=l.actor_user_id WHERE l.org_id=? ORDER BY l.created_at DESC, l.id DESC LIMIT $limit");
    $st->execute([$orgId]);
    $out = array_map(static fn($r) => ['id' => (int)$r['id'], 'action' => (string)$r['action'], 'target' => $r['target'], 'details' => $r['details'] ? json_decode((string)$r['details'], true) : null, 'actorName' => $r['actor_name'], 'at' => $r['created_at']], $st->fetchAll());
    success_response(['entries' => $out]);
}

// --- Units -------------------------------------------------------------------------

function org_unit_create(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    org_access($pdo, $a, $orgId, 'manage');
    $d = read_json_body();
    reject_unknown_keys($d, ['name', 'parentId', 'code'], 'ایجاد واحد');
    $units = org_units_all($pdo, $orgId);
    $name = require_string($d, 'name', 190);
    $parent = org_unit_or_fail($units, $d['parentId'] ?? null);
    foreach ($units as $u) {
        if (org_lower((string)$u['name']) === org_lower($name) && ($u['parent_id'] === null ? null : (int)$u['parent_id']) === $parent) error_response('UNIT_EXISTS', 'واحدی با این نام در همین سطح وجود دارد.', 409);
    }
    $pdo->prepare('INSERT INTO org_units (org_id,parent_id,name,code,created_at,updated_at) VALUES (?,?,?,?,NOW(),NOW())')->execute([$orgId, $parent, $name, optional_string($d, 'code', 60) ?: null]);
    $id = (int)$pdo->lastInsertId();
    org_audit($pdo, $orgId, (int)$a['user']['id'], 'unit.create', $name);
    success_response(['unit' => ['id' => $id, 'name' => $name, 'parentId' => $parent]], 201);
}

function org_unit_update(int $orgId, int $unitId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    org_access($pdo, $a, $orgId, 'manage');
    $units = org_units_all($pdo, $orgId);
    if (!isset($units[$unitId])) error_response('UNIT_NOT_FOUND', 'واحد پیدا نشد.', 404);
    $d = read_json_body();
    reject_unknown_keys($d, ['name', 'parentId', 'code'], 'ویرایش واحد');
    $fields = [];
    $params = [];
    if (array_key_exists('name', $d)) { $fields[] = 'name=?'; $params[] = require_string($d, 'name', 190); }
    if (array_key_exists('code', $d)) { $fields[] = 'code=?'; $params[] = optional_string($d, 'code', 60) ?: null; }
    if (array_key_exists('parentId', $d)) {
        $parent = org_unit_or_fail($units, $d['parentId']);
        // A unit can't move under itself or one of its own descendants.
        if ($parent !== null && in_array($parent, org_unit_descendants($units, $unitId), true)) error_response('VALIDATION_ERROR', 'یک واحد نمی‌تواند زیرمجموعه خودش شود.', 422);
        $fields[] = 'parent_id=?';
        $params[] = $parent;
    }
    if ($fields) {
        $params[] = $unitId;
        $pdo->prepare('UPDATE org_units SET ' . implode(',', $fields) . ',updated_at=NOW() WHERE id=?')->execute($params);
        org_audit($pdo, $orgId, (int)$a['user']['id'], 'unit.update', (string)$units[$unitId]['name'], ['fields' => array_keys($d)]);
    }
    success_response(['updated' => true]);
}

function org_unit_delete(int $orgId, int $unitId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    org_access($pdo, $a, $orgId, 'manage');
    $units = org_units_all($pdo, $orgId);
    if (!isset($units[$unitId])) error_response('UNIT_NOT_FOUND', 'واحد پیدا نشد.', 404);
    // Nothing is orphaned silently: sub-units and people move up one level.
    $parent = $units[$unitId]['parent_id'] === null ? null : (int)$units[$unitId]['parent_id'];
    $pdo->beginTransaction();
    $pdo->prepare('UPDATE org_units SET parent_id=? WHERE org_id=? AND parent_id=?')->execute([$parent, $orgId, $unitId]);
    $pdo->prepare('UPDATE org_members SET unit_id=? WHERE org_id=? AND unit_id=?')->execute([$parent, $orgId, $unitId]);
    $pdo->prepare('DELETE FROM org_units WHERE id=? AND org_id=?')->execute([$unitId, $orgId]);
    org_audit($pdo, $orgId, (int)$a['user']['id'], 'unit.delete', (string)$units[$unitId]['name']);
    $pdo->commit();
    success_response(['deleted' => true]);
}

// --- Members -----------------------------------------------------------------------

function org_members_index(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $acc = org_access($pdo, $a, $orgId, 'view');
    $units = org_units_all($pdo, $orgId);
    $paths = org_unit_paths($units);
    $rows = array_values(array_filter(org_members_all($pdo, $orgId), static fn($m) => org_in_scope($acc['scope'], $m['unit_id'])));
    $ids = [];
    foreach ($rows as $m) if ($m['status'] === 'active' && $m['user_id'] !== null) $ids[] = (int)$m['user_id'];
    $ev = org_load_evidence($pdo, $ids);
    $out = [];
    foreach ($rows as $m) $out[] = org_member_summary($m, $m['user_id'] !== null ? ($ev[(int)$m['user_id']] ?? null) : null, $acc['org']['required_assessments'], $paths);
    success_response(['members' => $out]);
}

function org_member_create(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $acc = org_access($pdo, $a, $orgId, 'manage');
    $d = read_json_body();
    reject_unknown_keys($d, ['fullName', 'email', 'unitId', 'jobTitle', 'employeeCode', 'orgRole', 'sendEmail'], 'افزودن عضو');
    $fullName = require_string($d, 'fullName', 190);
    $email = org_valid_email((string)($d['email'] ?? ''));
    if ($email === null) error_response('INVALID_EMAIL', 'ایمیل واردشده معتبر نیست.', 422);
    $role = require_allowed((string)($d['orgRole'] ?? 'member'), org_roles(), 'orgRole');
    $unitId = org_unit_or_fail(org_units_all($pdo, $orgId), $d['unitId'] ?? null);
    if ($role !== 'admin') org_check_seats($pdo, $acc['org'], 1);
    $inv = org_new_invite();
    try {
        $pdo->prepare("INSERT INTO org_members (org_id,unit_id,email,full_name,employee_code,job_title,org_role,status,invite_token_hash,invite_expires_at,invited_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'invited',?,?,NOW(),NOW(),NOW())")
            ->execute([$orgId, $unitId, $email, $fullName, optional_string($d, 'employeeCode', 60) ?: null, optional_string($d, 'jobTitle', 190) ?: null, $role, $inv['hash'], $inv['expires']]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') error_response('MEMBER_EXISTS', 'این ایمیل قبلاً در سازمان ثبت شده است.', 409);
        throw $e;
    }
    $mid = (int)$pdo->lastInsertId();
    org_audit($pdo, $orgId, (int)$a['user']['id'], 'member.create', $email, ['role' => $role]);
    $emailed = !empty($d['sendEmail']) ? org_send_invite_email($email, $fullName, (string)$acc['org']['name'], $inv['raw']) : false;
    success_response(['memberId' => $mid, 'invite' => ['token' => $inv['raw'], 'expiresAt' => $inv['expires'], 'emailed' => $emailed]], 201);
}

// Bulk import. Rows are parsed client-side from CSV into
// {fullName, email, unit, jobTitle, employeeCode, orgRole}; "unit" is a path
// like "فنی / نرم‌افزار". With dryRun nothing is written and every row reports
// what would happen, so the admin can fix the file before committing.
function org_members_import(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $acc = org_access($pdo, $a, $orgId, 'manage');
    $d = read_json_body();
    reject_unknown_keys($d, ['rows', 'dryRun', 'createUnits', 'updateExisting', 'sendEmail'], 'ورود گروهی');
    if (!isset($d['rows']) || !is_array($d['rows']) || !$d['rows']) error_response('VALIDATION_ERROR', 'فایل هیچ ردیفی ندارد.', 422);
    if (count($d['rows']) > 2000) error_response('VALIDATION_ERROR', 'در هر بار حداکثر ۲۰۰۰ ردیف قابل ورود است.', 422);
    $dry = !empty($d['dryRun']);
    $createUnits = !empty($d['createUnits']);
    $updateExisting = !empty($d['updateExisting']);
    $sendEmail = !empty($d['sendEmail']) && !$dry;

    $units = org_units_all($pdo, $orgId);
    // (parentId|lowercased name) -> unit id, for path resolution.
    $byKey = [];
    foreach ($units as $id => $u) $byKey[($u['parent_id'] ?? 0) . '|' . org_lower(trim((string)$u['name']))] = $id;
    $existing = [];
    foreach (org_members_all($pdo, $orgId) as $m) $existing[strtolower((string)$m['email'])] = $m;

    $seatFree = $acc['org']['seat_limit'] === null ? PHP_INT_MAX : max(0, (int)$acc['org']['seat_limit'] - org_seats_used($pdo, $orgId));
    $seen = [];
    $newUnits = [];
    $fakeId = -1;
    $results = [];
    $counts = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => 0];

    $resolveUnit = static function (string $path) use (&$byKey, &$newUnits, &$fakeId, $createUnits, $dry, $pdo, $orgId): array {
        $parts = array_values(array_filter(array_map(static fn($p) => clean_string($p, 190), preg_split('#\s*[/\\\\›>]\s*#u', $path) ?: []), static fn($p) => $p !== ''));
        if (!$parts) return ['id' => null];
        $parent = 0;
        $walked = [];
        foreach ($parts as $name) {
            $walked[] = $name;
            $key = $parent . '|' . org_lower($name);
            if (!isset($byKey[$key])) {
                if (!$createUnits) return ['error' => 'واحد «' . implode(' / ', $walked) . '» وجود ندارد.'];
                if ($dry) {
                    $byKey[$key] = $fakeId--;
                } else {
                    $pdo->prepare('INSERT INTO org_units (org_id,parent_id,name,created_at,updated_at) VALUES (?,?,?,NOW(),NOW())')->execute([$orgId, $parent > 0 ? $parent : null, $name]);
                    $byKey[$key] = (int)$pdo->lastInsertId();
                }
                $newUnits[] = implode(' / ', $walked);
            }
            $parent = $byKey[$key];
        }
        return ['id' => $parent];
    };

    try {
        if (!$dry) $pdo->beginTransaction();
        foreach ($d['rows'] as $i => $row) {
            $r = ['row' => $i + 1, 'email' => null, 'fullName' => null, 'status' => 'error', 'message' => null];
            if (!is_array($row)) { $r['message'] = 'ردیف نامعتبر است.'; $results[] = $r; $counts['errors']++; continue; }
            $fullName = clean_string($row['fullName'] ?? '', 190);
            $email = org_valid_email((string)($row['email'] ?? ''));
            $role = (string)($row['orgRole'] ?? '') === '' ? 'member' : (string)$row['orgRole'];
            $r['fullName'] = $fullName;
            $r['email'] = $email ?? clean_string($row['email'] ?? '', 190);
            $err = null;
            if ($fullName === '') $err = 'نام الزامی است.';
            elseif ($email === null) $err = 'ایمیل معتبر نیست.';
            elseif (!in_array($role, org_roles(), true)) $err = 'نقش باید member، manager یا admin باشد.';
            elseif (isset($seen[$email])) $err = 'این ایمیل در همین فایل تکراری است (ردیف ' . $seen[$email] . ').';
            if ($err === null) {
                $seen[$email] = $i + 1;
                $unit = $resolveUnit((string)($row['unit'] ?? ''));
                if (isset($unit['error'])) $err = $unit['error'];
            }
            if ($err !== null) { $r['message'] = $err; $results[] = $r; $counts['errors']++; continue; }
            $unitId = $unit['id'];
            $jobTitle = clean_string($row['jobTitle'] ?? '', 190) ?: null;
            $code = clean_string($row['employeeCode'] ?? '', 60) ?: null;

            if (isset($existing[$email])) {
                $m = $existing[$email];
                if (!$updateExisting) { $r['status'] = 'skipped'; $r['message'] = 'از قبل در سازمان هست.'; $r['memberId'] = (int)$m['id']; $counts['skipped']++; $results[] = $r; continue; }
                if (!$dry) {
                    $pdo->prepare('UPDATE org_members SET full_name=?, unit_id=?, job_title=?, employee_code=?, org_role=?, updated_at=NOW() WHERE id=?')
                        ->execute([$fullName, $unitId !== null && $unitId > 0 ? $unitId : null, $jobTitle, $code, $role, (int)$m['id']]);
                }
                $r['status'] = 'updated';
                $r['memberId'] = (int)$m['id'];
                $counts['updated']++;
                $results[] = $r;
                continue;
            }
            if ($role !== 'admin') {
                if ($seatFree <= 0) { $r['message'] = 'ظرفیت سازمان تکمیل است.'; $results[] = $r; $counts['errors']++; continue; }
                $seatFree--;
            }
            if (!$dry) {
                $inv = org_new_invite();
                $pdo->prepare("INSERT INTO org_members (org_id,unit_id,email,full_name,employee_code,job_title,org_role,status,invite_token_hash,invite_expires_at,invited_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'invited',?,?,NOW(),NOW(),NOW())")
                    ->execute([$orgId, $unitId !== null && $unitId > 0 ? $unitId : null, $email, $fullName, $code, $jobTitle, $role, $inv['hash'], $inv['expires']]);
                $r['memberId'] = (int)$pdo->lastInsertId();
                $r['inviteToken'] = $inv['raw'];
                $r['expiresAt'] = $inv['expires'];
            }
            $r['status'] = 'created';
            $counts['created']++;
            $results[] = $r;
        }
        if (!$dry) {
            org_audit($pdo, $orgId, (int)$a['user']['id'], 'member.import', null, $counts + ['newUnits' => count($newUnits)]);
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }

    if ($sendEmail) {
        foreach ($results as &$r) {
            if ($r['status'] === 'created' && isset($r['inviteToken'])) $r['emailed'] = org_send_invite_email((string)$r['email'], (string)$r['fullName'], (string)$acc['org']['name'], $r['inviteToken']);
        }
        unset($r);
    }
    success_response(['dryRun' => $dry, 'summary' => $counts + ['total' => count($d['rows']), 'newUnits' => array_values(array_unique($newUnits))], 'rows' => $results]);
}

function org_member_report(int $orgId, int $mid): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $acc = org_access($pdo, $a, $orgId, 'view');
    $m = org_member_or_fail($pdo, $orgId, $mid);
    if (!org_in_scope($acc['scope'], $m['unit_id'])) error_response('MEMBER_NOT_FOUND', 'عضو پیدا نشد.', 404);
    $paths = org_unit_paths(org_units_all($pdo, $orgId));
    $required = $acc['org']['required_assessments'];
    $ev = null;
    if ($m['status'] === 'active' && $m['user_id'] !== null) $ev = org_load_evidence($pdo, [(int)$m['user_id']])[(int)$m['user_id']] ?? null;
    $summary = org_member_summary($m, $ev, $required, $paths);
    $report = null;
    // Results are shared with the organization only while the membership is
    // active (consent given and not withdrawn).
    if ($ev !== null) {
        $state = $ev['state'];
        $meth = $ev['methodology'];
        $tests = [];
        foreach (org_cognitive_tests() as $nk => $t) {
            $raw = (float)($state['cognitive_raw'][$t['raw']] ?? 0);
            $tScore = $raw > 0 ? to_t_score($raw, $nk) : null;
            $tests[] = ['key' => $nk, 'title' => $t['title'], 'tScore' => $tScore, 'label' => $tScore === null ? null : get_performance_label($tScore)];
        }
        $assessments = [];
        foreach (org_assessment_catalog() as $view => $def) {
            $assessments[] = ['view' => $view, 'code' => $def['code'], 'title' => $def['title'], 'category' => $def['category'], 'required' => in_array($view, $required, true), 'done' => org_assessment_done($view, $state, $meth)];
        }
        $st = $pdo->prepare('SELECT game_view, raw_score, created_at FROM game_results WHERE user_id=? ORDER BY created_at DESC, id DESC LIMIT 30');
        $st->execute([(int)$m['user_id']]);
        $history = array_map(static fn($r) => ['view' => (string)$r['game_view'], 'title' => org_game_title((string)$r['game_view']), 'rawScore' => (float)$r['raw_score'], 'at' => $r['created_at']], $st->fetchAll());
        $report = [
            'competencies' => calculate_competencies($state['cognitive_raw'], $state['big_five'], $meth),
            'careerFit' => calculate_career_fit($state['cognitive_raw'], $state['big_five'], $meth),
            'bigFive' => $state['big_five'],
            'methodology' => $meth,
            'cognitiveTests' => $tests,
            'assessments' => $assessments,
            'history' => $history,
        ];
    }
    success_response(['member' => $summary, 'report' => $report]);
}

function org_member_update(int $orgId, int $mid): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $acc = org_access($pdo, $a, $orgId, 'manage');
    $m = org_member_or_fail($pdo, $orgId, $mid);
    $d = read_json_body();
    reject_unknown_keys($d, ['fullName', 'email', 'unitId', 'jobTitle', 'employeeCode', 'orgRole', 'status'], 'ویرایش عضو');
    $fields = [];
    $params = [];
    if (array_key_exists('fullName', $d)) { $fields[] = 'full_name=?'; $params[] = require_string($d, 'fullName', 190); }
    if (array_key_exists('email', $d)) {
        $email = org_valid_email((string)$d['email']);
        if ($email === null) error_response('INVALID_EMAIL', 'ایمیل واردشده معتبر نیست.', 422);
        $fields[] = 'email=?';
        $params[] = $email;
    }
    if (array_key_exists('unitId', $d)) { $fields[] = 'unit_id=?'; $params[] = org_unit_or_fail(org_units_all($pdo, $orgId), $d['unitId']); }
    if (array_key_exists('jobTitle', $d)) { $fields[] = 'job_title=?'; $params[] = optional_string($d, 'jobTitle', 190) ?: null; }
    if (array_key_exists('employeeCode', $d)) { $fields[] = 'employee_code=?'; $params[] = optional_string($d, 'employeeCode', 60) ?: null; }
    if (array_key_exists('orgRole', $d)) {
        $role = require_allowed((string)$d['orgRole'], org_roles(), 'orgRole');
        if ($role !== 'admin') org_guard_last_admin($pdo, $m, 'تغییر نقش');
        // Becoming a non-admin starts consuming a seat.
        if ($m['org_role'] === 'admin' && $role !== 'admin' && in_array($m['status'], ['invited', 'active'], true)) org_check_seats($pdo, $acc['org'], 1, (int)$m['id']);
        $fields[] = 'org_role=?';
        $params[] = $role;
    }
    if (array_key_exists('status', $d)) {
        // Admins can only switch a person on or off. Joining happens through
        // the invite and leaving is the member's own choice.
        $status = require_allowed((string)$d['status'], ['active', 'inactive'], 'status');
        if ($status === 'inactive') {
            org_guard_last_admin($pdo, $m, 'غیرفعال کردن');
            $fields[] = 'status=?';
            $params[] = 'inactive';
        } elseif ($m['status'] === 'inactive') {
            $next = $m['user_id'] !== null ? 'active' : 'invited';
            if ($m['org_role'] !== 'admin') org_check_seats($pdo, $acc['org'], 1, (int)$m['id']);
            $fields[] = 'status=?';
            $params[] = $next;
        }
    }
    if ($fields) {
        $params[] = $mid;
        try {
            $pdo->prepare('UPDATE org_members SET ' . implode(',', $fields) . ',updated_at=NOW() WHERE id=?')->execute($params);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') error_response('MEMBER_EXISTS', 'این ایمیل قبلاً در سازمان ثبت شده است.', 409);
            throw $e;
        }
        org_audit($pdo, $orgId, (int)$a['user']['id'], 'member.update', (string)$m['email'], ['fields' => array_keys($d)]);
    }
    success_response(['updated' => true]);
}

function org_member_delete(int $orgId, int $mid): void {
    $pdo = Database::pdo();
    $a = require_auth();
    org_access($pdo, $a, $orgId, 'manage');
    $m = org_member_or_fail($pdo, $orgId, $mid);
    org_guard_last_admin($pdo, $m, 'حذف');
    // Removes the membership only; the person's account and results are theirs.
    $pdo->prepare('DELETE FROM org_members WHERE id=?')->execute([$mid]);
    org_audit($pdo, $orgId, (int)$a['user']['id'], 'member.delete', (string)$m['email']);
    success_response(['deleted' => true]);
}

function org_member_reinvite(int $orgId, int $mid): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $acc = org_access($pdo, $a, $orgId, 'manage');
    $m = org_member_or_fail($pdo, $orgId, $mid);
    $d = read_json_body();
    reject_unknown_keys($d, ['sendEmail'], 'ارسال دعوت');
    if ($m['status'] === 'active') error_response('ALREADY_ACTIVE', 'این فرد قبلاً به سازمان پیوسته است.', 409);
    if ($m['status'] !== 'invited' && $m['org_role'] !== 'admin') org_check_seats($pdo, $acc['org'], 1, (int)$m['id']);
    $inv = org_new_invite();
    $pdo->prepare("UPDATE org_members SET status='invited', invite_token_hash=?, invite_expires_at=?, invited_at=NOW(), updated_at=NOW() WHERE id=?")->execute([$inv['hash'], $inv['expires'], $mid]);
    org_audit($pdo, $orgId, (int)$a['user']['id'], 'member.invite', (string)$m['email']);
    $emailed = !empty($d['sendEmail']) ? org_send_invite_email((string)$m['email'], (string)$m['full_name'], (string)$acc['org']['name'], $inv['raw']) : false;
    success_response(['invite' => ['token' => $inv['raw'], 'expiresAt' => $inv['expires'], 'emailed' => $emailed]]);
}

// --- Member side ---------------------------------------------------------------------

function invite_find(PDO $pdo, string $token): ?array {
    if (!preg_match('/^[a-f0-9]{48}$/', $token)) return null;
    $st = $pdo->prepare('SELECT m.*, o.name AS org_name, o.status AS org_status FROM org_members m JOIN organizations o ON o.id=m.org_id WHERE m.invite_token_hash=? LIMIT 1');
    $st->execute([token_hash($token)]);
    return $st->fetch() ?: null;
}

function invite_lookup(): void {
    $pdo = Database::pdo();
    enforce_rate_limit($pdo, 'invite-lookup', 60, 900);
    $m = invite_find($pdo, (string)($_GET['token'] ?? ''));
    if ($m === null || $m['status'] !== 'invited') error_response('INVITE_INVALID', 'این لینک دعوت معتبر نیست یا قبلاً استفاده شده است.', 404);
    $unitPath = null;
    if ($m['unit_id'] !== null) $unitPath = org_unit_paths(org_units_all($pdo, (int)$m['org_id']))[(int)$m['unit_id']] ?? null;
    success_response([
        'orgName' => (string)$m['org_name'],
        'fullName' => (string)$m['full_name'],
        'email' => (string)$m['email'],
        'unitPath' => $unitPath,
        'jobTitle' => $m['job_title'],
        'orgRole' => (string)$m['org_role'],
        'expired' => $m['invite_expires_at'] !== null && strtotime((string)$m['invite_expires_at']) < time(),
        'orgActive' => $m['org_status'] === 'active',
    ]);
}

function invite_accept(): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $d = read_json_body();
    reject_unknown_keys($d, ['token', 'consent'], 'پذیرش دعوت');
    $m = invite_find($pdo, (string)($d['token'] ?? ''));
    if ($m === null || $m['status'] !== 'invited') error_response('INVITE_INVALID', 'این لینک دعوت معتبر نیست یا قبلاً استفاده شده است.', 404);
    if ($m['invite_expires_at'] !== null && strtotime((string)$m['invite_expires_at']) < time()) error_response('INVITE_EXPIRED', 'مهلت این لینک دعوت تمام شده است. از مدیر سازمان لینک جدید بخواهید.', 410);
    if ($m['org_status'] !== 'active') error_response('ORG_SUSPENDED', 'این سازمان در حال حاضر غیرفعال است.', 403);
    // Results become visible to the employer, so joining needs explicit consent.
    if (($d['consent'] ?? null) !== true) error_response('CONSENT_REQUIRED', 'برای پیوستن باید با اشتراک نتایج با سازمان موافقت کنید.', 422);
    $uid = (int)$a['user']['id'];
    $st = $pdo->prepare('SELECT id FROM org_members WHERE org_id=? AND user_id=? AND id<>? LIMIT 1');
    $st->execute([(int)$m['org_id'], $uid, (int)$m['id']]);
    if ($st->fetch()) error_response('ALREADY_MEMBER', 'حساب شما قبلاً عضو این سازمان است.', 409);
    $pdo->prepare("UPDATE org_members SET user_id=?, status='active', joined_at=NOW(), consent_at=NOW(), invite_token_hash=NULL, invite_expires_at=NULL, updated_at=NOW() WHERE id=?")->execute([$uid, (int)$m['id']]);
    org_audit($pdo, (int)$m['org_id'], $uid, 'member.join', (string)$m['email']);
    success_response(['orgId' => (int)$m['org_id'], 'orgName' => (string)$m['org_name'], 'profile' => current_profile_payload($pdo, $a)]);
}

function org_leave(int $orgId): void {
    $pdo = Database::pdo();
    $a = require_auth();
    $st = $pdo->prepare("SELECT * FROM org_members WHERE org_id=? AND user_id=? AND status='active' LIMIT 1");
    $st->execute([$orgId, (int)$a['user']['id']]);
    $m = $st->fetch();
    if (!$m) error_response('MEMBER_NOT_FOUND', 'شما عضو فعال این سازمان نیستید.', 404);
    org_guard_last_admin($pdo, $m, 'خروج');
    // Withdrawing consent hides the results from the organization at once.
    $pdo->prepare("UPDATE org_members SET status='left', consent_at=NULL, updated_at=NOW() WHERE id=?")->execute([(int)$m['id']]);
    org_audit($pdo, $orgId, (int)$a['user']['id'], 'member.leave', (string)$m['email']);
    success_response(['profile' => current_profile_payload($pdo, $a)]);
}
