<?php
require __DIR__ . '/bootstrap.php';

$drop = (($_GET['drop'] ?? '') === '1') || (($p = ylt_body()) && !empty($p['drop']));
$unusedDropped = [];

if ($drop) {
  ylt_require_admin($c, $pdo);
  ylt_drop_all_tables($pdo);
}

ylt_apply_schema_file($pdo);
ylt_ensure_columns($pdo);
ylt_seed_catalog($pdo);

$hash = password_hash($c['agent_pass'], PASSWORD_DEFAULT);
$adminHash = password_hash($c['admin_pass'], PASSWORD_DEFAULT);
try {
  $pdo->prepare('INSERT INTO partners (id,email,password_hash,name,agency_name,status) VALUES (?,?,?,?,?,?)')
    ->execute([ylt_uuid(), $c['agent_email'], $hash, 'YLT Agent', 'YLT Travels', 'active']);
} catch (Throwable $e) { /* already seeded */ }
try {
  $pdo->prepare('INSERT INTO employees (id,email,password_hash,name,role,status) VALUES (?,?,?,?,?,?)')
    ->execute([ylt_uuid(), 'coreadmin@ylttravels.com', $adminHash, $c['admin_user'], 'admin', 'active']);
} catch (Throwable $e) { /* already seeded */ }
try {
  $pdo->prepare('INSERT INTO users (id,email,password,name) VALUES (?,?,?,?)')
    ->execute([ylt_uuid(), 'coreadmin@ylttravels.com', $adminHash, 'Core Admin']);
} catch (Throwable $e) { /* already seeded */ }
try {
  $pdo->exec("UPDATE app_settings SET inventory_provider='ylt_db', smtp_from_name='YLT Travels' WHERE id=1");
} catch (Throwable $e) { /* ignore */ }

if (!$drop) {
  $unusedDropped = ylt_drop_unused_tables($pdo);
}

ylt_ok([
  'ok' => true,
  'dropped' => (bool)$drop,
  'unused_dropped' => $unusedDropped,
  'kept' => ylt_keep_tables(),
  'warning' => $drop
    ? 'All tables were dropped and schema.sql was reapplied. Bookings and settings were reset. This is nuclear (?drop=1).'
    : 'Schema ready, unused tables dropped, data not wiped. Add ?drop=1 only if you need a full recreate — that is nuclear and DELETES every table.',
  'message' => 'Close this tab, then use Email OTP on ylttravels.com. Configure SMTP in Admin → Email. Staff login: CoreAdmin.',
  'api' => 'ylt-php',
]);
