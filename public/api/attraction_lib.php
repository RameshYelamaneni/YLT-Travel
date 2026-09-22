<?php
/** Shared price-promise, coupon, and referral helpers. No secrets. */

function ylt_attraction_tables($pdo) {
  $pdo->exec("CREATE TABLE IF NOT EXISTS price_promises (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    route VARCHAR(180) NOT NULL,
    travel_date VARCHAR(20) DEFAULT '',
    their_price INT NOT NULL,
    our_fare INT NOT NULL DEFAULT 0,
    contact_email VARCHAR(160) DEFAULT '',
    client_ip VARCHAR(64) DEFAULT '',
    screenshot_file VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    coupon_code VARCHAR(24) DEFAULT NULL,
    coupon_value INT DEFAULT NULL,
    approve_mode VARCHAR(20) DEFAULT NULL,
    reject_reason VARCHAR(500) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $pdo->exec("CREATE TABLE IF NOT EXISTS ylt_referrals (
    code VARCHAR(16) NOT NULL PRIMARY KEY,
    owner_email VARCHAR(160) NOT NULL,
    owner_name VARCHAR(120) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY ylt_referrals_owner (owner_email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $pdo->exec("CREATE TABLE IF NOT EXISTS ylt_coupons (
    code VARCHAR(24) NOT NULL PRIMARY KEY,
    amount INT NOT NULL,
    uses_left INT NOT NULL DEFAULT 1,
    owner_email VARCHAR(160) DEFAULT '',
    kind VARCHAR(32) NOT NULL,
    source_id VARCHAR(64) DEFAULT '',
    note VARCHAR(255) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $pdo->exec("CREATE TABLE IF NOT EXISTS referral_redemptions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(16) NOT NULL,
    friend_email VARCHAR(160) NOT NULL,
    pnr VARCHAR(20) DEFAULT '',
    coupon_code VARCHAR(24) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY referral_friend_once (friend_email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function ylt_attraction_settings($pdo) {
  $out = ['ylt_saver_rupees' => 50, 'price_promise_cap' => 150, 'referral_credit' => 50];
  try {
    $st = $pdo->query('SELECT ylt_saver_rupees, price_promise_cap, referral_credit FROM app_settings WHERE id=1');
    $row = $st ? $st->fetch() : null;
    if ($row) {
      if (isset($row['ylt_saver_rupees']) && $row['ylt_saver_rupees'] !== null && $row['ylt_saver_rupees'] !== '') {
        $out['ylt_saver_rupees'] = max(0, min(500, (int)$row['ylt_saver_rupees']));
      }
      if (isset($row['price_promise_cap']) && $row['price_promise_cap'] !== null && $row['price_promise_cap'] !== '') {
        $out['price_promise_cap'] = max(0, min(2000, (int)$row['price_promise_cap']));
      }
      if (isset($row['referral_credit']) && $row['referral_credit'] !== null && $row['referral_credit'] !== '') {
        $out['referral_credit'] = max(0, min(500, (int)$row['referral_credit']));
      }
    }
  } catch (Throwable $e) { /* columns appear after ensure */ }
  return $out;
}

function ylt_attraction_code($prefix, $len = 6) {
  $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  $out = $prefix;
  $max = strlen($alphabet) - 1;
  for ($i = 0; $i < $len; $i++) $out .= $alphabet[random_int(0, $max)];
  return $out;
}

function ylt_promise_dir() {
  return ylt_uploads_root() . DIRECTORY_SEPARATOR . 'price-promise';
}

function ylt_promise_store_b64($b64) {
  $raw = preg_replace('/\s+/', '', (string)$b64);
  if ($raw === '') ylt_fail(400, 'Screenshot is required.');
  $bin = base64_decode($raw, true);
  if ($bin === false) ylt_fail(400, 'Screenshot could not be read.');
  if (strlen($bin) < 32 || strlen($bin) > 2000000) ylt_fail(400, 'Screenshot must be under 2 MB.');
  $ext = ylt_image_ext_from_bin($bin);
  if (!in_array($ext, ['jpg', 'png', 'webp'], true)) ylt_fail(400, 'Use a JPG, PNG, or WebP screenshot.');
  $dir = ylt_promise_dir();
  if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) ylt_fail(500, 'Could not store the screenshot.');
  $name = ylt_attraction_code('pp', 10) . '.' . $ext;
  $path = $dir . DIRECTORY_SEPARATOR . $name;
  if (file_put_contents($path, $bin) === false) ylt_fail(500, 'Could not store the screenshot.');
  return $name;
}

function ylt_promise_safe_file($name) {
  $name = basename((string)$name);
  if (!preg_match('/^[A-Za-z0-9._-]+$/', $name)) return '';
  $dir = realpath(ylt_promise_dir());
  if (!$dir) return '';
  $full = realpath($dir . DIRECTORY_SEPARATOR . $name);
  if (!$full) return '';
  $dirN = rtrim(str_replace('\\', '/', $dir), '/') . '/';
  $fullN = str_replace('\\', '/', $full);
  if (!str_starts_with($fullN, $dirN)) return '';
  return $full;
}

function ylt_coupon_insert($pdo, $amount, $owner, $kind, $source, $note) {
  $amount = (int)$amount;
  if ($amount < 1) return '';
  for ($i = 0; $i < 5; $i++) {
    $code = ylt_attraction_code($kind === 'referral' ? 'REF' : 'PP', 6);
    try {
      $pdo->prepare('INSERT INTO ylt_coupons (code, amount, uses_left, owner_email, kind, source_id, note) VALUES (?,?,1,?,?,?,?)')
        ->execute([$code, $amount, strtolower(trim((string)$owner)), $kind, $source, $note]);
      return $code;
    } catch (Throwable $e) { /* retry unique */ }
  }
  return '';
}

function ylt_promise_coupon_amount($our, $theirs, $mode, $capSetting) {
  $our = max(0, (int)$our);
  $theirs = max(0, (int)$theirs);
  $diff = max(0, $our - $theirs);
  $under = max(0, $our - max(0, $theirs - 50));
  $amount = $mode === 'under50' ? $under : $diff;
  $cap = max(0, (int)$capSetting);
  $floorCap = (int)floor($our * 0.20);
  if ($floorCap > 0) $cap = min($cap, $floorCap);
  if ($cap < 1) return 0;
  return min($amount, $cap);
}

function ylt_attraction_on_paid_booking($pdo, $p, $pnr) {
  try {
    ylt_attraction_tables($pdo);
  } catch (Throwable $e) {
    return;
  }
  $email = strtolower(trim((string)($p['contact_email'] ?? '')));
  $coupon = strtoupper(trim((string)($p['coupon_code'] ?? '')));
  if ($coupon !== '') {
    try {
      $st = $pdo->prepare('SELECT code, amount, uses_left, owner_email FROM ylt_coupons WHERE code=? LIMIT 1');
      $st->execute([$coupon]);
      $row = $st->fetch();
      $owner = strtolower(trim((string)($row['owner_email'] ?? '')));
      $okOwner = $owner === '' || ($email !== '' && $owner === $email);
      if ($row && (int)$row['uses_left'] > 0 && $okOwner) {
        $pdo->prepare('UPDATE ylt_coupons SET uses_left=uses_left-1 WHERE code=? AND uses_left>0')->execute([$coupon]);
      }
    } catch (Throwable $e) { /* booking already paid */ }
  }
  $ref = strtoupper(trim((string)($p['referral_code'] ?? '')));
  if ($ref === '' || $email === '' || !str_contains($email, '@')) return;
  try {
    $st = $pdo->prepare('SELECT code, owner_email FROM ylt_referrals WHERE code=? LIMIT 1');
    $st->execute([$ref]);
    $refRow = $st->fetch();
    if (!$refRow) return;
    $owner = strtolower(trim((string)$refRow['owner_email']));
    if ($owner === '' || $owner === $email) return;
    $cnt = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE LOWER(contact_email)=? AND payment_status='paid'");
    $cnt->execute([$email]);
    if ((int)$cnt->fetchColumn() !== 1) return;
    $id = ylt_uuid();
    $settings = ylt_attraction_settings($pdo);
    $credit = (int)$settings['referral_credit'];
    if ($credit < 1) return;
    $pdo->prepare('INSERT INTO referral_redemptions (id, code, friend_email, pnr, coupon_code) VALUES (?,?,?,?,?)')
      ->execute([$id, $ref, $email, $pnr, '']);
    $code = ylt_coupon_insert($pdo, $credit, $owner, 'referral', $id, 'Refer a friend — first paid trip');
    if ($code !== '') {
      $pdo->prepare('UPDATE referral_redemptions SET coupon_code=? WHERE id=?')->execute([$code, $id]);
    }
  } catch (Throwable $e) { /* duplicate friend or missing table */ }
}
