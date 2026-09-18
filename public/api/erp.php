<?php
require __DIR__ . '/bootstrap.php';

$allowed = [
  'erp_buses','erp_bus_health','erp_bus_expenses','erp_crew','erp_crew_documents',
  'erp_shifts','erp_sla_scores','erp_seat_inventory','erp_seat_locks','erp_channel_sales',
  'erp_routes','erp_schedules','erp_live_trips','erp_earnings','erp_settlements','erp_payouts',
  'erp_maintenance_logs','erp_part_replacements','erp_compliance','erp_insights','erp_expenses',
  'erp_pl_reports','erp_partner_profile','erp_roles','erp_audit_logs','erp_api_keys',
];

$table = preg_replace('/[^a-z0-9_]/', '', (string)($_GET['table'] ?? ''));
if (!in_array($table, $allowed, true)) ylt_fail(400, 'Unknown ERP table.');

$auth = ylt_require_staff($c, $pdo);
if (in_array($table, ['erp_api_keys', 'erp_audit_logs'], true) && ($auth['type'] ?? '') !== 'admin') {
  ylt_fail(403, 'admin required');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id = (string)($_GET['id'] ?? '');
$p = ylt_body();
$cols = ylt_table_cols($pdo, $table);
if (!$cols) ylt_ok([]);

$partnerId = ($auth['type'] ?? '') === 'agent' ? (string)($auth['sub'] ?? '') : '';

function ylt_erp_val($v) {
  if (is_array($v) || is_object($v)) return json_encode($v);
  if (is_bool($v)) return $v ? 1 : 0;
  return $v;
}

function ylt_seed_trip_seats($pdo, $row) {
  $busId = (string)($row['bus_id'] ?? '');
  $date = (string)($row['departure_date'] ?? '');
  if ($busId === '' || $date === '') return;
  try {
    $st = $pdo->prepare('SELECT total_seats, layout, partner_id FROM erp_buses WHERE id=? LIMIT 1');
    $st->execute([$busId]);
    $bus = $st->fetch() ?: [];
  } catch (Throwable $e) { return; }
  $n = max(8, min(72, (int)($bus['total_seats'] ?? 36) ?: 36));
  $partner = (string)($bus['partner_id'] ?? $row['partner_id'] ?? '');
  $sleeper = str_contains(strtolower((string)($bus['layout'] ?? '')), 'sleeper');
  $invCols = ylt_table_cols($pdo, 'erp_seat_inventory');
  $lower = $sleeper ? (int)ceil($n / 2) : $n;
  $labels = [];
  for ($i = 1; $i <= $lower; $i++) $labels[] = $sleeper ? ('L' . $i) : (string)$i;
  if ($sleeper) {
    for ($i = 1; $i <= ($n - $lower); $i++) $labels[] = 'U' . $i;
  }
  foreach ($labels as $label) {
    $id = ylt_uuid();
    try {
      if (isset($invCols['partner_id'])) {
        $pdo->prepare('INSERT IGNORE INTO erp_seat_inventory (id,bus_id,travel_date,seat_number,status,partner_id) VALUES (?,?,?,?,?,?)')
          ->execute([$id, $busId, $date, $label, 'available', $partner ?: null]);
      } else {
        $pdo->prepare('INSERT IGNORE INTO erp_seat_inventory (id,bus_id,travel_date,seat_number,status) VALUES (?,?,?,?,?)')
          ->execute([$id, $busId, $date, $label, 'available']);
      }
    } catch (Throwable $e) { /* unique or missing */ }
  }
}

if ($method === 'GET') {
  try {
    $order = isset($cols['created_at']) ? ' ORDER BY created_at DESC' : '';
    if ($partnerId && isset($cols['partner_id'])) {
      $st = $pdo->prepare("SELECT * FROM `{$table}` WHERE partner_id=?{$order} LIMIT 500");
      $st->execute([$partnerId]);
      $rows = $st->fetchAll();
    } else {
      $rows = $pdo->query("SELECT * FROM `{$table}`{$order} LIMIT 500")->fetchAll();
    }
    ylt_ok($rows ?: []);
  } catch (Throwable $e) {
    ylt_ok([]);
  }
}

if ($method === 'POST') {
  if (empty($p['id'])) $p['id'] = ylt_uuid();
  if ($partnerId && isset($cols['partner_id']) && empty($p['partner_id'])) $p['partner_id'] = $partnerId;
  $safe = [];
  foreach ($p as $k => $v) {
    if (!preg_match('/^[a-z0-9_]+$/i', $k)) continue;
    if (!isset($cols[$k])) continue;
    if (in_array($k, ['photo_url', 'image_url', 'file_url', 'receipt_url'], true) && is_string($v) && str_starts_with($v, 'data:')) continue;
    $safe[$k] = ylt_erp_val($v);
  }
  if (!$safe) ylt_fail(400, 'Empty record.');
  $placeholders = implode(',', array_fill(0, count($safe), '?'));
  $names = implode(',', array_map(function ($k) { return "`$k`"; }, array_keys($safe)));
  try {
    $pdo->prepare("INSERT INTO `{$table}` ($names) VALUES ($placeholders)")->execute(array_values($safe));
  } catch (Throwable $e) {
    ylt_fail(400, 'Insert failed. Open /api/install.php once if tables are missing.');
  }
  if ($table === 'erp_schedules') ylt_seed_trip_seats($pdo, $p);
  ylt_ok($p, 201);
}

if ($method === 'PUT') {
  if (!$id) ylt_fail(400, 'id required');
  unset($p['id'], $p['created_at']);
  $sets = [];
  $vals = [];
  foreach ($p as $k => $v) {
    if (!preg_match('/^[a-z0-9_]+$/i', $k)) continue;
    if (!isset($cols[$k])) continue;
    if (in_array($k, ['photo_url', 'image_url', 'file_url', 'receipt_url'], true) && is_string($v) && str_starts_with($v, 'data:')) continue;
    $sets[] = "`$k`=?";
    $vals[] = ylt_erp_val($v);
  }
  if (!$sets) ylt_ok(['ok' => true, 'id' => $id]);
  $vals[] = $id;
  $own = '';
  if ($partnerId && isset($cols['partner_id'])) {
    $own = ' AND partner_id=?';
    $vals[] = $partnerId;
  }
  try {
    $pdo->prepare("UPDATE `{$table}` SET " . implode(',', $sets) . " WHERE id=?{$own}")->execute($vals);
  } catch (Throwable $e) {
    ylt_fail(400, 'Update failed.');
  }
  ylt_ok(['ok' => true, 'id' => $id]);
}

if ($method === 'DELETE') {
  if (!$id) ylt_fail(400, 'id required');
  if ($partnerId && isset($cols['partner_id'])) {
    $pdo->prepare("DELETE FROM `{$table}` WHERE id=? AND partner_id=?")->execute([$id, $partnerId]);
  } else {
    $pdo->prepare("DELETE FROM `{$table}` WHERE id=?")->execute([$id]);
  }
  ylt_ok(['ok' => true]);
}

ylt_fail(405, 'Method not allowed.');
