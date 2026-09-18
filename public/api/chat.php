<?php
require __DIR__ . '/bootstrap.php';

$p = ylt_body();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$auth = ylt_auth_claims($c, $pdo);
$authEmail = strtolower((string)($auth['email'] ?? ''));
$staff = ylt_is_staff_type($auth['type'] ?? '');
$requested = strtolower(trim((string)($_GET['thread'] ?? $p['thread'] ?? $p['email'] ?? $_GET['email'] ?? '')));
if ($requested && str_contains($requested, '@') && $requested !== $authEmail && !$staff) {
  $requested = $authEmail ?: 'guest';
}
$thread = substr($requested ?: ($authEmail ?: 'guest'), 0, 180);
$channel = (string)($_GET['channel'] ?? $p['channel'] ?? 'web');
$email = (str_contains($thread, '@') && ($thread === $authEmail || $staff)) ? $thread : $authEmail;
$since = (string)($_GET['since'] ?? '');

function ylt_chat_save($pdo, $thread, $channel, $role, $content, $email) {
  $id = ylt_uuid();
  $pdo->prepare('INSERT INTO chat_messages (id,thread_key,channel,role,content,email) VALUES (?,?,?,?,?,?)')
    ->execute([$id, $thread, $channel, $role, $content, $email]);
  return $id;
}

function ylt_chat_reply($pdo, $prompt, $email) {
  $q = mb_strtolower($prompt);
  $bookings = [];
  if ($email && str_contains($email, '@')) {
    try {
      $st = $pdo->prepare('SELECT pnr, from_city, to_city, travel_date, status, total_amount FROM bookings WHERE contact_email=? OR user_identifier=? ORDER BY created_at DESC LIMIT 5');
      $st->execute([$email, $email]);
      $bookings = $st->fetchAll() ?: [];
    } catch (Throwable $e) { $bookings = []; }
    try {
      $st = $pdo->prepare('SELECT pnr, hotel_name, check_in, status, total_amount FROM hotel_bookings WHERE guest_email=? OR user_identifier=? ORDER BY created_at DESC LIMIT 5');
      $st->execute([$email, $email]);
      $hotels = $st->fetchAll() ?: [];
    } catch (Throwable $e) { $hotels = []; }
  } else {
    $hotels = [];
  }

  if (str_contains($q, 'booking') || str_contains($q, 'pnr') || str_contains($q, 'ticket')) {
    if (!$bookings && empty($hotels)) {
      return 'I do not see bookings for that email in the YLT database yet. Use the same email as checkout, or book a bus/hotel first.';
    }
    $lines = [];
    foreach ($bookings as $b) {
      $lines[] = "Bus {$b['pnr']}: {$b['from_city']} → {$b['to_city']} on {$b['travel_date']} ({$b['status']}) ₹" . round((float)$b['total_amount']);
    }
    foreach ($hotels as $h) {
      $lines[] = "Hotel {$h['pnr']}: {$h['hotel_name']} check-in {$h['check_in']} ({$h['status']}) ₹" . round((float)$h['total_amount']);
    }
    return "Live bookings from YLT MySQL:\n" . implode("\n", $lines);
  }
  if (str_contains($q, 'refund') || str_contains($q, 'cancel')) {
    return 'Cancel from My Bookings with your PNR. Refunds follow the fare rule on the ticket. Hotel check-out is handled at partner front desk.';
  }
  if (str_contains($q, 'hotel')) {
    return 'Search Hotels on the home page, pick dates, pay on Razorpay. Partner hotels check you in from Hotel ERP → Front desk (live inventory).';
  }
  if (str_contains($q, 'bus') || str_contains($q, 'seat')) {
    return 'Search buses, tap View seats, choose boarding/dropping, then pay. Seat maps stay in the dialog until you tap Close.';
  }
  if (str_contains($q, 'car')) {
    return 'Car rentals are available when your partner subscription includes Cars. Book from Cars or ask the agency in Partner ERP.';
  }
  if (str_contains($q, 'wallet') || str_contains($q, 'pay')) {
    return 'Checkout uses Razorpay (UPI, cards, net banking). Ticket email can include a wallet pass when SMTP is configured in Admin → Email.';
  }
  return 'YLT assistant is live. Ask about bookings, refunds, buses, hotels, or cars. Sign in to look up your PNRs.';
}

if ($method === 'GET') {
  if (str_contains($thread, '@') && $thread !== $authEmail && !$staff) {
    ylt_ok(['ok' => true, 'messages' => [], 'server_time' => date('c')]);
  }
  $sql = 'SELECT id, thread_key, channel, role, content, email, created_at FROM chat_messages WHERE thread_key=?';
  $args = [$thread];
  if ($since) {
    $sql .= ' AND created_at>?';
    $args[] = $since;
  }
  $sql .= ' ORDER BY created_at ASC LIMIT 200';
  $st = $pdo->prepare($sql);
  $st->execute($args);
  ylt_ok(['ok' => true, 'messages' => $st->fetchAll() ?: [], 'server_time' => date('c')]);
}

if ($method === 'POST') {
  $prompt = trim((string)($p['prompt'] ?? $p['content'] ?? $p['message'] ?? ''));
  if ($prompt === '') ylt_fail(400, 'Message required.');
  ylt_chat_save($pdo, $thread ?: $email ?: 'guest', $channel, 'user', $prompt, $email);
  $reply = ylt_chat_reply($pdo, $prompt, $email);
  ylt_chat_save($pdo, $thread ?: $email ?: 'guest', $channel, 'ai', $reply, $email);
  ylt_ok(['ok' => true, 'reply' => $reply, 'server_time' => date('c')]);
}

ylt_fail(400, 'Use GET to poll or POST to send.');
