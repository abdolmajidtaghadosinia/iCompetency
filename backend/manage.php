<?php
declare(strict_types=1);
// CLI-only administration. Platform admins can create organizations, so the
// role is granted from the server shell, never through the web API:
//
//   php backend/manage.php grant-admin  user@example.com
//   php backend/manage.php revoke-admin user@example.com
//   php backend/manage.php list-admins
//
// The user must have registered an account first.

if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }

define('APP_ROOT', __DIR__);
$configPath = APP_ROOT . '/config.php';
if (!is_file($configPath)) { fwrite(STDERR, "config.php not found (copy config.sample.php).\n"); exit(1); }
$APP_CONFIG = require $configPath;
require_once APP_ROOT . '/core/db.php';

$cmd = $argv[1] ?? '';
$email = strtolower(trim($argv[2] ?? ''));
$pdo = Database::pdo();

function find_user(PDO $pdo, string $email): array {
    $st = $pdo->prepare('SELECT id, name, email FROM users WHERE email=? LIMIT 1');
    $st->execute([$email]);
    $u = $st->fetch();
    if (!$u) { fwrite(STDERR, "No account with email {$email}. Register it in the app first.\n"); exit(1); }
    return $u;
}

switch ($cmd) {
    case 'grant-admin':
        $u = find_user($pdo, $email);
        $pdo->prepare('INSERT IGNORE INTO platform_admins (user_id, granted_at) VALUES (?, NOW())')->execute([(int)$u['id']]);
        echo "Granted platform admin to {$u['email']} ({$u['name']}).\n";
        break;
    case 'revoke-admin':
        $u = find_user($pdo, $email);
        $pdo->prepare('DELETE FROM platform_admins WHERE user_id=?')->execute([(int)$u['id']]);
        echo "Revoked platform admin from {$u['email']}.\n";
        break;
    case 'list-admins':
        foreach ($pdo->query('SELECT u.email, u.name, p.granted_at FROM platform_admins p JOIN users u ON u.id=p.user_id ORDER BY p.granted_at')->fetchAll() as $r) {
            echo "{$r['email']}\t{$r['name']}\t{$r['granted_at']}\n";
        }
        break;
    default:
        fwrite(STDERR, "Usage: php backend/manage.php grant-admin|revoke-admin <email> | list-admins\n");
        exit(1);
}
