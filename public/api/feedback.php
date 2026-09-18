<?php
require __DIR__ . '/bootstrap.php';

$p = ylt_body();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$token = trim((string)($_GET['token'] ?? $p['token'] ?? ''));
$email = strtolower(trim((string)($_GET['email'] ?? $p['email'] ?? '')));

function ylt_fb_token() {
  return bin2hex(random_bytes(16));
}

function ylt_fb_find($pdo, $token) {
  if ($token === '') return null;
  $st = $pdo->prepare('SELECT id, pnr, status, guest_email AS email, hotel_name AS title, check_in AS date, "hotel" AS booking_type, feedback_status FROM hotel_bookings WHERE feedback_token=? LIMIT 1');
  $st->execute([$token]);
  $row = $st->fetch();
  if ($row) return $row;
  $st = $pdo->prepare('SELECT id, pnr, status, contact_email AS email, CONCAT(from_city, " → ", to_city) AS title, travel_date AS date, "bus" AS booking_type, feedback_status FROM bookings WHERE feedback_token=? LIMIT 1');
  $st->execute([$token]);
  return $st->fetch() ?: null;
}

function ylt_fb_issue($pdo, $table, $id) {
  $tok = ylt_fb_token();
  try {
    $pdo->prepare("UPDATE `$table` SET feedback_token=?, feedback_status='pending' WHERE id=? AND (feedback_token IS NULL OR feedback_token='')")->execute([$tok, $id]);
  } catch (Throwable $e) { return ''; }
  $st = $pdo->prepare("SELECT feedback_token FROM `$table` WHERE id=?");
  $st->execute([$id]);
  $row = $st->fetch();
  return $row['feedback_token'] ?? $tok;
}

if ($method === 'GET' && $token) {
  $row = ylt_fb_find($pdo, $token);
  if (!$row) ylt_fail(404, 'This rating link is invalid or expired.');
  if (($row['feedback_status'] ?? '') === 'rated') {
    ylt_ok(['ok' => true, 'already' => true, 'pnr' => $row['pnr'], 'title' => $row['title'], 'booking_type' => $row['booking_type']]);
  }
  ylt_ok(['ok' => true, 'already' => false, 'pnr' => $row['pnr'], 'title' => $row['title'], 'date' => $row['date'], 'booking_type' => $row['booking_type']]);
}

if ($method === 'GET' && $email) {
  $today = date('Y-m-d');
  $out = [];
  try {
    $st = $pdo->prepare("SELECT * FROM bookings WHERE (contact_email=? OR user_identifier=?) AND status <> 'cancelled'");
    $st->execute([$email, $email]);
    foreach ($st->fetchAll() as $b) {
      $travel = substr((string)($b['travel_date'] ?? ''), 0, 10);
      if ($travel && $travel <= $today) {
        if (empty($b['feedback_token'])) {
          $b['feedback_token'] = ylt_fb_issue($pdo, 'bookings', $b['id']);
          $b['feedback_status'] = 'pending';
        }
        if (($b['feedback_status'] ?? '') !== 'rated') {
          $out[] = ['pnr' => $b['pnr'], 'type' => 'bus', 'token' => $b['feedback_token'], 'title' => trim(($b['from_city'] ?? '') . ' → ' . ($b['to_city'] ?? ''))];
        }
      }
    }
  } catch (Throwable $e) {}
  try {
    $st = $pdo->prepare("SELECT * FROM hotel_bookings WHERE (guest_email=? OR user_identifier=?) AND status IN ('checked-out','completed')");
    $st->execute([$email, $email]);
    foreach ($st->fetchAll() as $b) {
      if (empty($b['feedback_token'])) {
        $b['feedback_token'] = ylt_fb_issue($pdo, 'hotel_bookings', $b['id']);
        $b['feedback_status'] = 'pending';
      }
      if (($b['feedback_status'] ?? '') !== 'rated') {
        $out[] = ['pnr' => $b['pnr'], 'type' => 'hotel', 'token' => $b['feedback_token'], 'title' => $b['hotel_name'] ?? 'Hotel'];
      }
    }
  } catch (Throwable $e) {}
  ylt_ok(['ok' => true, 'pending' => $out]);
}

if ($method === 'POST') {
  if ($token === '') ylt_fail(400, 'token required');
  $score = (int)($p['score'] ?? 0);
  if ($score < 1 || $score > 5) ylt_fail(400, 'Score must be 1–5.');
  $row = ylt_fb_find($pdo, $token);
  if (!$row) ylt_fail(404, 'Invalid token.');
  if (($row['feedback_status'] ?? '') === 'rated') ylt_ok(['ok' => true, 'already' => true]);
  $id = ylt_uuid();
  $pdo->prepare('INSERT INTO feedback_reviews (id,token,pnr,booking_type,booking_id,email,score,comment) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$id, $token, $row['pnr'], $row['booking_type'], $row['id'], $row['email'] ?? $email, $score, $p['comment'] ?? '']);
  $table = $row['booking_type'] === 'hotel' ? 'hotel_bookings' : 'bookings';
  try { $pdo->prepare("UPDATE `$table` SET feedback_status='rated' WHERE feedback_token=?")->execute([$token]); } catch (Throwable $e) {}
  ylt_ok(['ok' => true]);
}

ylt_fail(400, 'Pass token or email.');
