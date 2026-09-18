<?php
require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$p = ylt_body();
$id = (string)($_GET['id'] ?? $p['id'] ?? '');

function ylt_offer_row($r) {
  return [
    'id' => $r['id'],
    'promo_code' => $r['promo_code'],
    'title' => $r['title'],
    'description' => $r['description'] ?? '',
    'discount_value' => $r['discount_value'],
    'expiry_date' => $r['expiry_date'],
    'is_active' => (int)($r['is_active'] ?? 1) ? 1 : 0,
    'tag' => $r['tag'] ?? 'Bus',
    'tone' => $r['tone'] ?? 'from-navy-800 to-navy-600',
    'created_at' => $r['created_at'] ?? null,
  ];
}

if ($method === 'GET') {
  $all = isset($_GET['all']);
  if ($all) ylt_require_admin($c, $pdo);
  $sql = 'SELECT * FROM offers';
  if (!$all) $sql .= ' WHERE is_active=1 AND (expiry_date IS NULL OR expiry_date=\'\' OR expiry_date >= CURDATE())';
  $sql .= ' ORDER BY created_at DESC';
  $rows = $pdo->query($sql)->fetchAll();
  ylt_ok(array_map('ylt_offer_row', $rows));
}

if ($method === 'POST' || $method === 'PUT') {
  ylt_require_admin($c, $pdo);
  $id = $id ?: ylt_uuid();
  $code = strtoupper(trim((string)($p['promo_code'] ?? $p['promoCode'] ?? '')));
  $title = trim((string)($p['title'] ?? ''));
  if ($code === '' || $title === '') ylt_fail(400, 'promo_code and title required.');
  $desc = $p['description'] ?? '';
  $disc = (string)($p['discount_value'] ?? $p['discountValue'] ?? '');
  $exp = $p['expiry_date'] ?? $p['expiryDate'] ?? '2026-12-31';
  $active = 1;
  if (array_key_exists('is_active', $p)) $active = $p['is_active'] ? 1 : 0;
  elseif (array_key_exists('isActive', $p)) $active = $p['isActive'] ? 1 : 0;
  $tag = $p['tag'] ?? 'Bus';
  $tone = $p['tone'] ?? 'from-navy-800 to-navy-600';
  $exists = $pdo->prepare('SELECT id FROM offers WHERE id=?');
  $exists->execute([$id]);
  if ($exists->fetch()) {
    $pdo->prepare('UPDATE offers SET promo_code=?, title=?, description=?, discount_value=?, expiry_date=?, is_active=?, tag=?, tone=? WHERE id=?')
      ->execute([$code, $title, $desc, $disc, $exp, $active, $tag, $tone, $id]);
  } else {
    $pdo->prepare('INSERT INTO offers (id, promo_code, title, description, discount_value, expiry_date, is_active, tag, tone) VALUES (?,?,?,?,?,?,?,?,?)')
      ->execute([$id, $code, $title, $desc, $disc, $exp, $active, $tag, $tone]);
  }
  $sent = 0;
  if ($active) {
    $sent = ylt_blast_offer($pdo, $title, $code, $desc);
  }
  ylt_ok(['ok' => true, 'id' => $id, 'promo_code' => $code, 'title' => $title, 'description' => $desc, 'discount_value' => $disc, 'expiry_date' => $exp, 'is_active' => $active, 'tag' => $tag, 'tone' => $tone, 'emails_sent' => $sent]);
}

if ($method === 'DELETE') {
  ylt_require_admin($c, $pdo);
  if (!$id) ylt_fail(400, 'id required');
  $pdo->prepare('DELETE FROM offers WHERE id=?')->execute([$id]);
  ylt_ok(['ok' => true]);
}

ylt_fail(405, 'Method not allowed.');
