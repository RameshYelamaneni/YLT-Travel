<?php
require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/attraction_lib.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$p = ylt_body();
$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
$resource = (string)($_GET['resource'] ?? '');
if ($resource === '') {
  if (str_contains($path, 'price-promise')) $resource = 'price-promise';
  elseif (str_contains($path, 'referral')) $resource = 'referral';
  elseif (str_contains($path, 'coupon')) $resource = 'coupons';
}

try {
  ylt_attraction_tables($pdo);
} catch (Throwable $e) {
  ylt_fail(500, 'Could not prepare offer tables.');
}

if ($resource === 'price-promise') {
  $wantFile = isset($_GET['file']) || (($_GET['file'] ?? '') === '1');
  if ($method === 'GET' && $wantFile) {
    ylt_require_admin($c, $pdo);
    $id = (string)($_GET['id'] ?? '');
    $st = $pdo->prepare('SELECT screenshot_file FROM price_promises WHERE id=? LIMIT 1');
    $st->execute([$id]);
    $row = $st->fetch();
    $full = $row ? ylt_promise_safe_file($row['screenshot_file'] ?? '') : '';
    if ($full === '' || !is_file($full)) ylt_fail(404, 'Screenshot not found.');
    $ext = strtolower(pathinfo($full, PATHINFO_EXTENSION));
    $mime = $ext === 'png' ? 'image/png' : ($ext === 'webp' ? 'image/webp' : 'image/jpeg');
    header('Content-Type: ' . $mime);
    header('Content-Disposition: inline; filename="proof.' . $ext . '"');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store');
    readfile($full);
    exit;
  }
  if ($method === 'GET') {
    ylt_require_admin($c, $pdo);
    $rows = $pdo->query('SELECT id, route, travel_date, their_price, our_fare, contact_email, status, coupon_code, coupon_value, approve_mode, reject_reason, created_at, screenshot_file FROM price_promises ORDER BY created_at DESC LIMIT 200')->fetchAll();
    $out = [];
    foreach ($rows ?: [] as $r) {
      $out[] = [
        'id' => $r['id'],
        'route' => $r['route'],
        'travel_date' => $r['travel_date'],
        'their_price' => (int)$r['their_price'],
        'our_fare' => (int)$r['our_fare'],
        'contact_email' => $r['contact_email'],
        'status' => $r['status'],
        'coupon_code' => $r['coupon_code'] ?? '',
        'coupon_value' => (int)($r['coupon_value'] ?? 0),
        'approve_mode' => $r['approve_mode'] ?? '',
        'reject_reason' => $r['reject_reason'] ?? '',
        'created_at' => $r['created_at'] ?? '',
        'has_file' => ($r['screenshot_file'] ?? '') !== '',
      ];
    }
    ylt_ok(['ok' => true, 'promises' => $out]);
  }
  if ($method === 'POST') {
    $action = strtolower(trim((string)($p['action'] ?? '')));
    if ($action === 'approve' || $action === 'reject') {
      ylt_require_admin($c, $pdo);
      $id = (string)($p['id'] ?? $_GET['id'] ?? '');
      if ($id === '') ylt_fail(400, 'id required');
      $st = $pdo->prepare('SELECT * FROM price_promises WHERE id=? LIMIT 1');
      $st->execute([$id]);
      $row = $st->fetch();
      if (!$row) ylt_fail(404, 'Proof not found.');
      if (($row['status'] ?? '') !== 'pending') ylt_fail(400, 'This proof is already reviewed.');
      if ($action === 'reject') {
        $reason = trim((string)($p['reason'] ?? ''));
        if ($reason === '') ylt_fail(400, 'A reject reason is required.');
        $pdo->prepare("UPDATE price_promises SET status='rejected', reject_reason=?, reviewed_at=NOW() WHERE id=?")
          ->execute([substr($reason, 0, 500), $id]);
        ylt_ok(['ok' => true, 'status' => 'rejected', 'message' => 'Rejected.']);
      }
      $mode = ($p['mode'] ?? '') === 'under50' ? 'under50' : 'difference';
      $settings = ylt_attraction_settings($pdo);
      $amount = ylt_promise_coupon_amount($row['our_fare'], $row['their_price'], $mode, $settings['price_promise_cap']);
      if ($amount < 1) ylt_fail(400, 'No coupon within the cap for this proof.');
      $note = $mode === 'under50' ? 'Price promise — ₹50 under claimed fare, capped' : 'Price promise — difference, capped';
      $code = ylt_coupon_insert($pdo, $amount, $row['contact_email'] ?? '', 'price_promise', $id, $note);
      if ($code === '') ylt_fail(500, 'Could not create the coupon.');
      $pdo->prepare("UPDATE price_promises SET status='approved', coupon_code=?, coupon_value=?, approve_mode=?, reviewed_at=NOW() WHERE id=?")
        ->execute([$code, $amount, $mode, $id]);
      ylt_ok(['ok' => true, 'status' => 'approved', 'coupon_code' => $code, 'coupon_value' => $amount, 'message' => 'Approved. One-time coupon created.']);
    }

    $route = trim((string)($p['route'] ?? ''));
    $date = trim((string)($p['travel_date'] ?? ''));
    $their = (int)($p['their_price'] ?? 0);
    $our = max(0, (int)($p['our_fare'] ?? 0));
    $email = strtolower(trim((string)($p['contact_email'] ?? '')));
    if ($route === '' || strlen($route) > 180) ylt_fail(400, 'Enter the route.');
    if ($their < 1 || $their > 100000) ylt_fail(400, 'Enter the fare you found.');
    if ($email !== '' && !str_contains($email, '@')) ylt_fail(400, 'Enter a valid email for the coupon.');
    $ip = ylt_client_ip();
    $pending = $pdo->prepare("SELECT COUNT(*) FROM price_promises WHERE client_ip=? AND status='pending'");
    $pending->execute([$ip]);
    if ((int)$pending->fetchColumn() >= 8) ylt_fail(429, 'You already have proofs waiting for review.');
    $file = ylt_promise_store_b64($p['screenshot_b64'] ?? '');
    $id = ylt_uuid();
    $pdo->prepare('INSERT INTO price_promises (id, route, travel_date, their_price, our_fare, contact_email, client_ip, screenshot_file, status) VALUES (?,?,?,?,?,?,?,?,?)')
      ->execute([$id, $route, substr($date, 0, 20), $their, $our, $email, $ip, $file, 'pending']);
    ylt_ok(['ok' => true, 'id' => $id, 'status' => 'pending', 'message' => "We'll review your proof."], 201);
  }
}

if ($resource === 'referral') {
  if ($method === 'GET') {
    $u = ylt_require_auth($c, $pdo);
    $email = strtolower(trim((string)($u['email'] ?? '')));
    if (!str_contains($email, '@')) ylt_fail(400, 'Sign in with an email to refer a friend.');
    $st = $pdo->prepare('SELECT code FROM ylt_referrals WHERE owner_email=? LIMIT 1');
    $st->execute([$email]);
    $row = $st->fetch();
    $code = $row['code'] ?? '';
    if ($code === '') {
      $name = (string)($u['name'] ?? '');
      for ($i = 0; $i < 5 && $code === ''; $i++) {
        $try = ylt_attraction_code('YLT', 6);
        try {
          $pdo->prepare('INSERT INTO ylt_referrals (code, owner_email, owner_name) VALUES (?,?,?)')->execute([$try, $email, $name]);
          $code = $try;
        } catch (Throwable $e) {
          $st->execute([$email]);
          $again = $st->fetch();
          if ($again) $code = $again['code'];
        }
      }
    }
    $credits = $pdo->prepare("SELECT code, amount, uses_left, note FROM ylt_coupons WHERE owner_email=? AND uses_left>0 ORDER BY created_at DESC");
    $credits->execute([$email]);
    $settings = ylt_attraction_settings($pdo);
    ylt_ok(['ok' => true, 'code' => $code, 'credit' => (int)$settings['referral_credit'], 'coupons' => $credits->fetchAll() ?: []]);
  }
  if ($method === 'POST') {
    $code = strtoupper(trim((string)($p['code'] ?? '')));
    if ($code === '') ylt_fail(400, 'Enter a refer code.');
    $st = $pdo->prepare('SELECT code FROM ylt_referrals WHERE code=? LIMIT 1');
    $st->execute([$code]);
    $row = $st->fetch();
    $settings = ylt_attraction_settings($pdo);
    if (!$row) ylt_ok(['ok' => true, 'valid' => false, 'error' => 'That refer code is not active.']);
    ylt_ok(['ok' => true, 'valid' => true, 'code' => $code, 'credit' => (int)$settings['referral_credit']]);
  }
}

if ($resource === 'coupons') {
  if ($method === 'POST') {
    $code = strtoupper(trim((string)($p['code'] ?? '')));
    $email = strtolower(trim((string)($p['email'] ?? '')));
    $seat = max(0, (int)($p['seat_fare'] ?? 0));
    if ($code === '') ylt_fail(400, 'Enter a code.');
    $st = $pdo->prepare('SELECT code, amount, uses_left, owner_email, note FROM ylt_coupons WHERE code=? LIMIT 1');
    $st->execute([$code]);
    $row = $st->fetch();
    if (!$row || (int)$row['uses_left'] < 1) ylt_ok(['ok' => false, 'error' => 'That code is used or unknown.']);
    $owner = strtolower(trim((string)($row['owner_email'] ?? '')));
    if ($owner !== '' && $owner !== $email) ylt_ok(['ok' => false, 'error' => 'Sign in with the email this credit was issued to.']);
    $amount = (int)$row['amount'];
    if ($seat > 0) $amount = min($amount, $seat);
    if ($amount < 1) ylt_ok(['ok' => false, 'error' => 'This credit does not apply to a zero fare.']);
    ylt_ok(['ok' => true, 'code' => $row['code'], 'amount' => $amount, 'note' => $row['note'] ?? '']);
  }
}

ylt_fail(404, 'Unknown offer route.');
