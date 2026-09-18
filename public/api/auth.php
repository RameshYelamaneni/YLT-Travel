<?php
require __DIR__ . '/bootstrap.php';

$p = ylt_body();
$uri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($uri, PHP_URL_PATH) ?: '';
$rest = $_GET['rest'] ?? '';
if (!$rest && preg_match('#/api/auth(?:\.php)?/(.+)$#', $path, $m)) {
  $rest = $m[1];
}

$action = (string)($p['action'] ?? $_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$remember = !empty($p['remember']);

if ($rest === 'otp/send' || str_ends_with($path, '/otp/send')) $action = 'otp_send';
if ($rest === 'otp/verify' || str_ends_with($path, '/otp/verify')) $action = 'otp_verify';
if ($rest === 'admin-signin' || str_ends_with($path, '/admin-signin')) $action = 'admin-signin';
if ($rest === 'agent-signin' || str_ends_with($path, '/agent-signin')) $action = 'agent-signin';
if ($rest === 'onboard-signup' || str_ends_with($path, '/onboard-signup')) $action = 'onboard-signup';
if ($rest === 'onboard-signin' || str_ends_with($path, '/onboard-signin')) $action = 'onboard-signin';
if ($rest === 'onboard-otp' || str_ends_with($path, '/onboard-otp')) $action = 'onboard-otp';
if ($rest === 'signin' || str_ends_with($path, '/signin')) $action = $action ?: 'signin';
if ($rest === 'signup' || str_ends_with($path, '/signup')) $action = $action ?: 'signup';
if ($rest === 'password' || str_ends_with($path, '/password')) {
  $action = (string)($p['action'] ?? 'signin');
}
if ($rest === 'me' || (str_ends_with($path, '/me') && $method === 'GET')) $action = 'me';
if ($rest === 'logout' || str_ends_with($path, '/logout')) $action = 'logout';
if (!$action && $method === 'GET' && !$rest) $action = 'me';

$partners = str_starts_with($rest, 'partners') || strpos($path, '/partners') !== false;
$employees = str_starts_with($rest, 'employees') || strpos($path, '/employees') !== false;

function ylt_partner_products($row, $kind = '') {
  $kind = $kind ?: (string)($row['partner_kind'] ?? 'agent');
  if ($kind === 'operator') return ['bus' => 1, 'hotel' => 0, 'car' => 0];
  if ($kind === 'hotel') return ['bus' => 0, 'hotel' => 1, 'car' => 0];
  if ($kind === 'insurance') return ['bus' => 0, 'hotel' => 0, 'car' => 0];
  return [
    'bus' => isset($row['bus_enabled']) ? (int)$row['bus_enabled'] : 1,
    'hotel' => isset($row['hotel_enabled']) ? (int)$row['hotel_enabled'] : 1,
    'car' => isset($row['car_enabled']) ? (int)$row['car_enabled'] : 1,
  ];
}

function ylt_partner_kind_products($kind) {
  if ($kind === 'operator') return ['bus' => 1, 'hotel' => 0, 'car' => 0];
  if ($kind === 'hotel') return ['bus' => 0, 'hotel' => 1, 'car' => 0];
  if ($kind === 'insurance') return ['bus' => 0, 'hotel' => 0, 'car' => 0];
  return ['bus' => 1, 'hotel' => 1, 'car' => 0];
}

function ylt_public_partner_row($row) {
  unset($row['password_hash']);
  if (!empty($row['application_payload']) && is_string($row['application_payload'])) {
    $decoded = json_decode($row['application_payload'], true);
    if (is_array($decoded)) $row['application'] = $decoded;
  }
  return $row;
}

function ylt_partner_signin_gate($row) {
  if (!$row) return 'Invalid agent credentials.';
  $st = strtolower((string)($row['status'] ?? 'active'));
  if ($st === 'pending') return 'Your application is under review. YLT will email you after approval.';
  if ($st === 'rejected') {
    $why = trim((string)($row['reject_reason'] ?? ''));
    return $why !== '' ? ('Application declined: ' . $why) : 'Application declined. Contact YLT onboard.';
  }
  if ($st !== 'active') return 'This account is not active.';
  return '';
}

function ylt_find_partner($pdo, $login) {
  $login = strtolower(trim((string)$login));
  if ($login === '') return null;
  $digits = preg_replace('/\D+/', '', $login);
  $st = $pdo->prepare('SELECT * FROM partners WHERE email=? OR phone=? OR REPLACE(REPLACE(REPLACE(IFNULL(phone,""), " ", ""), "-", ""), "+", "")=? LIMIT 1');
  $st->execute([$login, $login, $digits]);
  $row = $st->fetch();
  return $row ?: null;
}

if ($action === 'onboard-signup') {
  ylt_ensure_partner_onboard_cols($pdo);
  $kind = strtolower(trim((string)($p['partner_kind'] ?? $p['kind'] ?? 'operator')));
  if (!in_array($kind, ['operator', 'agent', 'insurance', 'hotel'], true)) $kind = 'operator';
  $name = trim((string)($p['name'] ?? ''));
  $phone = trim((string)($p['phone'] ?? ''));
  $email = strtolower(trim((string)($p['email'] ?? '')));
  $password = (string)($p['password'] ?? '');
  $agency = trim((string)($p['agency_name'] ?? $p['company'] ?? ''));
  $city = trim((string)($p['city'] ?? ''));
  $digits = preg_replace('/\D+/', '', $phone);
  if ($name === '' || strlen($digits) < 10) ylt_fail(400, 'Full name and a valid mobile number are required.');
  if ($email !== '' && !str_contains($email, '@')) ylt_fail(400, 'Enter a valid email, or leave it blank to use your mobile.');
  if ($email === '') $email = $digits . '@onboard.ylttravels.com';
  if (!ylt_password_rules_ok($password)) ylt_fail(400, 'Password must be 8+ characters with an uppercase letter, a number, and a special character.');
  if (empty($p['terms'])) ylt_fail(400, 'Accept the terms to continue.');
  if ($agency === '' || $city === '') ylt_fail(400, 'Company name and city are required.');
  $aadhaar = trim((string)($p['aadhaar_url'] ?? ''));
  $pan = trim((string)($p['pan_url'] ?? ''));
  $gst = trim((string)($p['gst_url'] ?? ''));
  if ($aadhaar === '' && $pan === '' && $gst === '') ylt_fail(400, 'Upload Aadhaar, PAN, or GST.');
  $ip = ylt_client_ip();
  if (!ylt_throttle($pdo, 'onboard_signup:' . $ip, 6, 30)) ylt_fail(429, 'Too many applications from this network.');
  $exists = $pdo->prepare('SELECT id, status FROM partners WHERE email=? OR phone=? LIMIT 1');
  $exists->execute([$email, $phone]);
  $dup = $exists->fetch();
  if ($dup) ylt_fail(409, 'An application with this email or mobile already exists.');
  $id = ylt_uuid();
  $hash = password_hash($password, PASSWORD_DEFAULT);
  $st = $pdo->prepare('INSERT INTO partners (id,email,password_hash,name,agency_name,phone,city,status,commission_rate) VALUES (?,?,?,?,?,?,?,?,?)');
  $st->execute([$id, $email, $hash, $name, $agency, $phone, $city, 'pending', 0.08]);
  $cols = ylt_table_cols($pdo, 'partners');
  $products = ylt_partner_kind_products($kind);
  if (isset($cols['bus_enabled'])) {
    $pdo->prepare('UPDATE partners SET bus_enabled=?, hotel_enabled=?, car_enabled=? WHERE id=?')->execute([$products['bus'], $products['hotel'], $products['car'], $id]);
  }
  $payload = [
    'partner_kind' => $kind,
    'name' => $name,
    'email' => $email,
    'phone' => $phone,
    'agency_name' => $agency,
    'city' => $city,
    'msme' => !empty($p['msme']),
    'corporate' => !empty($p['corporate']),
    'whatsapp_optin' => !empty($p['whatsapp_optin']),
    'terms' => true,
    'aadhaar_url' => $aadhaar,
    'pan_url' => $pan,
    'gst_url' => $gst,
    'aadhaar_filename' => trim((string)($p['aadhaar_filename'] ?? '')),
    'pan_filename' => trim((string)($p['pan_filename'] ?? '')),
    'gst_filename' => trim((string)($p['gst_filename'] ?? '')),
    'submitted_at' => date('c'),
  ];
  $sets = [];
  $vals = [];
  foreach ([
    'partner_kind' => $kind,
    'source' => 'kyc',
    'aadhaar_url' => $aadhaar,
    'pan_url' => $pan,
    'gst_url' => $gst,
    'aadhaar_filename' => $payload['aadhaar_filename'],
    'pan_filename' => $payload['pan_filename'],
    'gst_filename' => $payload['gst_filename'],
    'msme' => !empty($p['msme']) ? 1 : 0,
    'corporate' => !empty($p['corporate']) ? 1 : 0,
    'whatsapp_optin' => !empty($p['whatsapp_optin']) ? 1 : 0,
    'terms_accepted' => 1,
    'reject_reason' => '',
    'application_payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
  ] as $col => $val) {
    if (!isset($cols[$col])) continue;
    $sets[] = "$col=?";
    $vals[] = $val;
  }
  if ($sets) {
    $vals[] = $id;
    $pdo->prepare('UPDATE partners SET ' . implode(',', $sets) . ' WHERE id=?')->execute($vals);
  }
  $html = '<p>We received your YLT Travels ' . htmlspecialchars($kind) . ' application for <strong>' . htmlspecialchars($agency) . '</strong>.</p><p>Status: <strong>under review</strong>. You will get another email after the onboard team approves or declines the request. You cannot access Partner ERP until then.</p>';
  try { ylt_send_mail($pdo, $email, 'YLT Travels application received', $html); } catch (Throwable $e) { /* optional */ }
  ylt_ok([
    'ok' => true,
    'status' => 'pending',
    'id' => $id,
    'message' => 'Application submitted. Our onboard team will review it before you can sign in.',
  ], 201);
}

if ($action === 'onboard-signin') {
  $action = 'agent-signin';
}

function ylt_auth_row($c, $email, $name, $id, $type, $role = null, $products = null, $remember = false) {
  $payload = ylt_token_payload($c, $email, $name, $id, $type, $role, $remember, $products);
  $out = [
    'ok' => true,
    'access_token' => ylt_jwt_encode($payload, $c['jwt_secret']),
    'user_email' => $email,
    'email' => $email,
    'name' => $name,
    'user_id' => $id,
    'expires_in' => max(0, (int)($payload['exp'] - time())),
    'idle' => (int)($payload['idle'] ?? 1800),
    'bus_enabled' => $products['bus'] ?? (($type === 'agent') ? 0 : 1),
    'hotel_enabled' => $products['hotel'] ?? (($type === 'agent') ? 0 : 1),
    'car_enabled' => $products['car'] ?? (($type === 'agent') ? 0 : 1),
  ];
  if ($role) $out['role'] = $role;
  return $out;
}

if ($partners) {
  ylt_ensure_partner_onboard_cols($pdo);
  $staff = ylt_require_admin($c, $pdo);
  $id = $_GET['id'] ?? '';
  if (!$id && preg_match('#partners/([^/?]+)#', $path . '/' . $rest, $m)) $id = $m[1];
  $queue = strtolower(trim((string)($_GET['queue'] ?? $p['queue'] ?? '')));
  if ($method === 'GET') {
    if ($queue && $queue !== 'live' && !ylt_can_kyc_queue($staff, $queue)) ylt_fail(403, 'You do not have access to this queue.');
    if ($queue === 'live' && !ylt_can_manage_live_partners($staff)) ylt_fail(403, 'Only Core Admin can manage live partners.');
    $rows = $pdo->query('SELECT * FROM partners ORDER BY created_at DESC')->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $r) {
      $isKyc = ylt_partner_is_kyc($r);
      $q = ylt_partner_queue_of($r);
      if ($queue === 'live') {
        if ($isKyc) continue;
      } elseif ($queue === 'partner' || $queue === 'agent' || $queue === 'insurance') {
        if (!$isKyc || $q !== $queue) continue;
      } else {
        $visible = false;
        if ($isKyc && ylt_can_kyc_queue($staff, $q)) $visible = true;
        if (!$isKyc && ylt_can_manage_live_partners($staff)) $visible = true;
        if (!$visible) continue;
      }
      $out[] = ylt_public_partner_row($r);
    }
    ylt_ok(['ok' => true, 'partners' => $out, 'queue' => $queue ?: 'all']);
  }
  if ($method === 'POST') {
    if (!ylt_can_manage_live_partners($staff)) ylt_fail(403, 'Only Core Admin can create live partners.');
    $email = strtolower(trim($p['email'] ?? ''));
    if (!$email) ylt_fail(400, 'Email required.');
    $id = ylt_uuid();
    $hash = password_hash((string)($p['password'] ?? 'agent123'), PASSWORD_DEFAULT);
    $kind = strtolower(trim((string)($p['partner_kind'] ?? $p['kind'] ?? 'agent')));
    if (!in_array($kind, ['operator', 'agent', 'insurance', 'hotel'], true)) $kind = 'agent';
    $bus = !empty($p['bus_enabled']) || !isset($p['bus_enabled']) ? 1 : 0;
    $hotel = !empty($p['hotel_enabled']) ? 1 : 0;
    $car = !empty($p['car_enabled']) ? 1 : 0;
    if (!isset($p['bus_enabled']) && !isset($p['hotel_enabled']) && !isset($p['car_enabled'])) {
      $prod = ylt_partner_kind_products($kind);
      $bus = $prod['bus'];
      $hotel = $prod['hotel'];
      $car = $prod['car'];
    }
    $cols = ylt_table_cols($pdo, 'partners');
    $st = $pdo->prepare('INSERT INTO partners (id,email,password_hash,name,agency_name,phone,city,status,commission_rate) VALUES (?,?,?,?,?,?,?,?,?)');
    $st->execute([
      $id, $email, $hash, $p['name'] ?? $email, $p['agency_name'] ?? '', $p['phone'] ?? '', $p['city'] ?? '',
      'active', (float)($p['commission_rate'] ?? 0.08),
    ]);
    if (isset($cols['bus_enabled'])) {
      $pdo->prepare('UPDATE partners SET bus_enabled=?, hotel_enabled=?, car_enabled=? WHERE id=?')->execute([$bus, $hotel, $car, $id]);
    }
    $sets = [];
    $vals = [];
    foreach (['partner_kind' => $kind, 'source' => 'admin'] as $col => $val) {
      if (!isset($cols[$col])) continue;
      $sets[] = "$col=?";
      $vals[] = $val;
    }
    if ($sets) {
      $vals[] = $id;
      $pdo->prepare('UPDATE partners SET ' . implode(',', $sets) . ' WHERE id=?')->execute($vals);
    }
    ylt_ok(['ok' => true, 'id' => $id, 'bus_enabled' => $bus, 'hotel_enabled' => $hotel, 'car_enabled' => $car, 'source' => 'admin', 'status' => 'active'], 201);
  }
  if ($method === 'PUT' && $id) {
    $cols = ylt_table_cols($pdo, 'partners');
    $prev = null;
    try {
      $st = $pdo->prepare('SELECT * FROM partners WHERE id=? LIMIT 1');
      $st->execute([$id]);
      $prev = $st->fetch() ?: null;
    } catch (Throwable $e) { $prev = null; }
    if (!$prev) ylt_fail(404, 'Partner not found.');
    $isKyc = ylt_partner_is_kyc($prev);
    $q = ylt_partner_queue_of($prev);
    if ($isKyc && !ylt_can_kyc_queue($staff, $q)) ylt_fail(403, 'You do not have access to this queue.');
    if (!$isKyc && !ylt_can_manage_live_partners($staff)) ylt_fail(403, 'Only Core Admin can update live partners.');
    $sets = [];
    $vals = [];
    foreach (['status', 'reject_reason', 'partner_kind', 'agency_name', 'phone', 'city', 'name'] as $col) {
      if (!isset($p[$col]) || !isset($cols[$col])) continue;
      $sets[] = "$col=?";
      $vals[] = $p[$col];
    }
    $nextStatus = strtolower((string)($p['status'] ?? ''));
    if ($isKyc && ($nextStatus === 'active' || $nextStatus === 'rejected') && isset($cols['reviewed_at'])) {
      $sets[] = 'reviewed_at=NOW()';
    }
    if ($isKyc && ($nextStatus === 'active' || $nextStatus === 'rejected') && isset($cols['reviewed_by'])) {
      $sets[] = 'reviewed_by=?';
      $vals[] = (string)($staff['email'] ?? $staff['name'] ?? 'admin');
    }
    if ($sets) {
      $vals[] = $id;
      $pdo->prepare('UPDATE partners SET ' . implode(',', $sets) . ' WHERE id=?')->execute($vals);
    }
    if ($isKyc && $nextStatus === 'active' && !isset($p['bus_enabled']) && isset($cols['bus_enabled'])) {
      $prod = ylt_partner_kind_products((string)($p['partner_kind'] ?? $prev['partner_kind'] ?? 'agent'));
      $pdo->prepare('UPDATE partners SET bus_enabled=?, hotel_enabled=?, car_enabled=? WHERE id=?')->execute([$prod['bus'], $prod['hotel'], $prod['car'], $id]);
    } elseif (isset($cols['bus_enabled']) && (isset($p['bus_enabled']) || isset($p['hotel_enabled']) || isset($p['car_enabled']))) {
      $pdo->prepare('UPDATE partners SET bus_enabled=?, hotel_enabled=?, car_enabled=? WHERE id=?')->execute([
        !empty($p['bus_enabled']) ? 1 : 0,
        !empty($p['hotel_enabled']) ? 1 : 0,
        !empty($p['car_enabled']) ? 1 : 0,
        $id,
      ]);
    }
    if ($prev && $nextStatus && $nextStatus !== strtolower((string)($prev['status'] ?? ''))) {
      $to = (string)($prev['email'] ?? '');
      $kind = (string)($prev['partner_kind'] ?? 'partner');
      $portal = ($kind === 'agent') ? 'agent portal' : 'Partner ERP';
      if ($nextStatus === 'active' && str_contains($to, '@') && !str_ends_with($to, '@onboard.ylttravels.com')) {
        $html = '<p>Your YLT Travels application is <strong>approved</strong>.</p><p>You can now sign in to the YLT ' . htmlspecialchars($portal) . '.</p>';
        try { ylt_send_mail($pdo, $to, 'YLT Travels application approved', $html); } catch (Throwable $e) { /* optional */ }
      }
      if ($nextStatus === 'rejected' && str_contains($to, '@') && !str_ends_with($to, '@onboard.ylttravels.com')) {
        $why = trim((string)($p['reject_reason'] ?? ''));
        $html = '<p>Your YLT Travels application was not approved.</p>' . ($why !== '' ? ('<p>Reason: ' . htmlspecialchars($why) . '</p>') : '');
        try { ylt_send_mail($pdo, $to, 'YLT Travels application update', $html); } catch (Throwable $e) { /* optional */ }
      }
    }
    ylt_ok(['ok' => true]);
  }
  if ($method === 'DELETE' && $id) {
    if (!ylt_can_manage_live_partners($staff)) ylt_fail(403, 'Only Core Admin can delete partners.');
    $st = $pdo->prepare('DELETE FROM partners WHERE id=?');
    $st->execute([$id]);
    ylt_ok(['ok' => true]);
  }
  ylt_fail(400, 'Invalid partners request.');
}

if ($employees) {
  ylt_require_admin($c, $pdo);
  $id = $_GET['id'] ?? '';
  if (!$id && preg_match('#employees/([^/?]+)#', $path . '/' . $rest, $m)) $id = $m[1];
  $reset = strpos($path . $rest, 'reset-password') !== false;
  if ($method === 'GET') {
    $rows = $pdo->query('SELECT id, email, name, role, phone, status, created_at FROM employees ORDER BY created_at DESC')->fetchAll();
    ylt_ok(['ok' => true, 'employees' => $rows]);
  }
  if ($method === 'POST' && $reset && $id) {
    $hash = password_hash((string)($p['password'] ?? ''), PASSWORD_DEFAULT);
    $st = $pdo->prepare('UPDATE employees SET password_hash=? WHERE id=?');
    $st->execute([$hash, $id]);
    ylt_ok(['ok' => true]);
  }
  if ($method === 'POST') {
    $email = strtolower(trim($p['email'] ?? ''));
    if (!$email) ylt_fail(400, 'Email required.');
    $id = ylt_uuid();
    $hash = password_hash((string)($p['password'] ?? bin2hex(random_bytes(4))), PASSWORD_DEFAULT);
    $st = $pdo->prepare('INSERT INTO employees (id,email,password_hash,name,role,phone,status) VALUES (?,?,?,?,?,?,?)');
    $st->execute([$id, $email, $hash, $p['name'] ?? $email, $p['role'] ?? 'operator', $p['phone'] ?? '', $p['status'] ?? 'active']);
    ylt_ok(['ok' => true, 'id' => $id], 201);
  }
  if ($method === 'DELETE' && $id) {
    $st = $pdo->prepare('DELETE FROM employees WHERE id=?');
    $st->execute([$id]);
    ylt_ok(['ok' => true]);
  }
  ylt_fail(400, 'Invalid employees request.');
}

if ($action === 'otp_send') {
  $email = strtolower(trim((string)($p['email'] ?? '')));
  if (!str_contains($email, '@')) ylt_fail(400, 'Enter a valid email.');
  $ip = ylt_client_ip();
  if (!ylt_throttle($pdo, 'otp_send:' . $email, 3, 10) || !ylt_throttle($pdo, 'otp_send_ip:' . $ip, 8, 10)) {
    ylt_fail(429, 'Too many OTP requests. Try again in a few minutes.');
  }
  $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
  $id = ylt_uuid();
  try {
    $hash = ylt_otp_hash_store($code);
  } catch (Throwable $e) {
    ylt_fail(500, 'Could not create login code.');
  }
  try {
    $pdo->prepare('UPDATE otp_codes SET used=1 WHERE email=? AND used=0')->execute([$email]);
  } catch (Throwable $e) { /* ignore */ }
  $st = $pdo->prepare('INSERT INTO otp_codes (id, email, code, expires_at, used, attempts) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0, 0)');
  try {
    $st->execute([$id, $email, $hash]);
  } catch (Throwable $e) {
    $st = $pdo->prepare('INSERT INTO otp_codes (id, email, code, expires_at, used) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0)');
    $st->execute([$id, $email, $hash]);
  }
  try {
    $chk = $pdo->prepare('SELECT code FROM otp_codes WHERE id=?');
    $chk->execute([$id]);
    $stored = (string)$chk->fetchColumn();
    if ($stored !== '' && strlen($stored) < strlen($hash)) {
      ylt_fail(500, 'Could not save login code. Please try again in a moment.');
    }
  } catch (Throwable $e) { /* readback optional */ }
  $html = '<p>Your YLT Travels login code is</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0b1f3a">' . htmlspecialchars($code) . '</div><p>Valid for 10 minutes. No SMS is sent — use this email code.</p>';
  $sent = ylt_send_mail($pdo, $email, 'Your YLT Travels login code', $html);
  if (!$sent) ylt_fail(500, 'Could not send email OTP');
  ylt_ok([
    'ok' => true,
    'message' => 'OTP sent. Check your inbox (and spam folder).',
  ]);
}

if ($action === 'otp_verify') {
  $email = strtolower(trim((string)($p['email'] ?? '')));
  $code = ylt_otp_normalize($p['code'] ?? '');
  if (!$email || strlen($code) !== 6) ylt_fail(400, 'Email and 6-digit code required.');
  $ip = ylt_client_ip();
  if (!ylt_throttle($pdo, 'otp_verify:' . $email, 12, 10) || !ylt_throttle($pdo, 'otp_verify_ip:' . $ip, 30, 10)) {
    ylt_fail(429, 'Too many attempts. Try again in a few minutes, or request a new code.');
  }
  $st = $pdo->prepare('SELECT * FROM otp_codes WHERE email=? AND used=0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1');
  $st->execute([$email]);
  $row = $st->fetch();
  if (!$row) {
    ylt_fail(400, 'This code has expired. Request a new one.');
  }
  $ok = ylt_otp_matches((string)$row['code'], $email, $code);
  if (!$ok) {
    $n = (int)($row['attempts'] ?? 0) + 1;
    try {
      $pdo->prepare('UPDATE otp_codes SET attempts=? WHERE id=?')->execute([$n, $row['id']]);
    } catch (Throwable $e) { /* attempts column may be missing until ensure */ }
    $left = 5 - $n;
    if ($left <= 0) {
      try {
        $pdo->prepare('UPDATE otp_codes SET used=1 WHERE id=?')->execute([$row['id']]);
      } catch (Throwable $e) { /* ignore */ }
      ylt_fail(400, 'Too many incorrect attempts. Request a new code.');
    }
    ylt_fail(400, 'Invalid code. ' . $left . ' attempt' . ($left === 1 ? '' : 's') . ' left.');
  }
  $pdo->prepare('UPDATE otp_codes SET used=1 WHERE id=?')->execute([$row['id']]);
  $u = $pdo->prepare('SELECT * FROM users WHERE email=? LIMIT 1');
  $u->execute([$email]);
  $user = $u->fetch();
  if (!$user) {
    $uid = ylt_uuid();
    $name = explode('@', $email)[0];
    $pdo->prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, NULL, ?)')->execute([$uid, $email, $name]);
    $user = ['id' => $uid, 'email' => $email, 'name' => $name];
  }
  ylt_ok(ylt_auth_row($c, $user['email'], $user['name'] ?: explode('@', $email)[0], $user['id'], 'customer', null, null, $remember));
}

if ($action === 'signup') {
  $email = strtolower(trim((string)($p['email'] ?? '')));
  $password = (string)($p['password'] ?? '');
  $name = trim((string)($p['name'] ?? '')) ?: explode('@', $email)[0];
  if (!str_contains($email, '@') || strlen($password) < 4) ylt_fail(400, 'Valid email and password required.');
  $exists = $pdo->prepare('SELECT id FROM users WHERE email=?');
  $exists->execute([$email]);
  if ($exists->fetch()) ylt_fail(409, 'An account with this email already exists.');
  $id = ylt_uuid();
  $pdo->prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)')
    ->execute([$id, $email, password_hash($password, PASSWORD_DEFAULT), $name]);
  ylt_ok(ylt_auth_row($c, $email, $name, $id, 'customer', null, null, $remember));
}

if ($action === 'signin') {
  $email = strtolower(trim((string)($p['email'] ?? '')));
  $password = (string)($p['password'] ?? '');
  $st = $pdo->prepare('SELECT * FROM users WHERE email=? LIMIT 1');
  $st->execute([$email]);
  $user = $st->fetch();
  if (!$user || empty($user['password']) || !password_verify($password, $user['password'])) {
    ylt_fail(401, 'Invalid email or password. Use Sign Up first, or OTP.');
  }
  ylt_ok(ylt_auth_row($c, $user['email'], $user['name'], $user['id'], 'customer', null, null, $remember));
}

if ($action === 'admin-signin') {
  $user = (string)($p['username'] ?? $p['email'] ?? '');
  $pass = (string)($p['password'] ?? '');
  if ($user === $c['admin_user'] && hash_equals((string)$c['admin_pass'], $pass)) {
    ylt_ok(ylt_auth_row($c, 'coreadmin@ylttravels.com', 'Core Admin', 'admin-core', 'admin', 'admin', null, $remember));
  }
  $st = $pdo->prepare('SELECT * FROM employees WHERE (email=? OR name=?) LIMIT 1');
  $st->execute([$user, $user]);
  $emp = $st->fetch();
  if ($emp && password_verify($pass, $emp['password_hash']) && ($emp['status'] ?? 'active') === 'active') {
    ylt_ok(ylt_auth_row($c, $emp['email'], $emp['name'], $emp['id'], 'admin', $emp['role'] ?: 'admin', null, $remember));
  }
  ylt_fail(401, 'Invalid admin credentials.');
}

if ($action === 'agent-signin') {
  ylt_ensure_partner_onboard_cols($pdo);
  $email = strtolower(trim((string)($p['email'] ?? $p['username'] ?? $p['phone'] ?? '')));
  $pass = (string)($p['password'] ?? '');
  $row = ylt_find_partner($pdo, $email);
  if ($row && password_verify($pass, (string)$row['password_hash'])) {
    $gate = ylt_partner_signin_gate($row);
    if ($gate !== '') ylt_fail(403, $gate);
    $kind = (string)($row['partner_kind'] ?? 'agent');
    $products = ylt_partner_products($row, $kind);
    $out = ylt_auth_row($c, $row['email'], $row['name'], $row['id'], 'agent', null, $products, $remember);
    $out['partner_kind'] = $kind;
    ylt_ok($out);
  }
  if ($email === $c['agent_email'] && $pass === $c['agent_pass']) {
    $out = ylt_auth_row($c, $email, 'YLT Agent', 'agent-local', 'agent', null, ['bus' => 1, 'hotel' => 1, 'car' => 1], $remember);
    $out['partner_kind'] = 'agent';
    ylt_ok($out);
  }
  ylt_fail(401, 'Invalid agent credentials.');
}

if ($action === 'onboard-otp') {
  ylt_ensure_partner_onboard_cols($pdo);
  $email = strtolower(trim((string)($p['email'] ?? '')));
  $code = ylt_otp_normalize($p['code'] ?? '');
  if (!$email || strlen($code) !== 6) ylt_fail(400, 'Email and 6-digit code required.');
  $st = $pdo->prepare('SELECT * FROM otp_codes WHERE email=? AND used=0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1');
  $st->execute([$email]);
  $otp = $st->fetch();
  if (!$otp || !ylt_otp_matches((string)$otp['code'], $email, $code)) ylt_fail(400, 'Invalid or expired code.');
  $pdo->prepare('UPDATE otp_codes SET used=1 WHERE id=?')->execute([$otp['id']]);
  $row = ylt_find_partner($pdo, $email);
  $gate = ylt_partner_signin_gate($row);
  if ($gate !== '') ylt_fail(403, $gate);
  $kind = (string)($row['partner_kind'] ?? 'agent');
  $products = ylt_partner_products($row, $kind);
  $out = ylt_auth_row($c, $row['email'], $row['name'], $row['id'], 'agent', null, $products, $remember);
  $out['partner_kind'] = $kind;
  ylt_ok($out);
}

if ($action === 'logout') {
  $claims = ylt_jwt_decode(ylt_bearer(), $c['jwt_secret']);
  if ($claims && !empty($claims['jti'])) {
    ylt_jwt_revoke($pdo, $claims['jti'], (int)($claims['exp'] ?? (time() + 86400)));
    try { $pdo->prepare('DELETE FROM jwt_activity WHERE jti=?')->execute([$claims['jti']]); } catch (Throwable $e) { /* ignore */ }
  }
  ylt_ok(['ok' => true]);
}

if ($action === 'me' || $method === 'GET') {
  $claims = ylt_require_auth($c, $pdo);
  if (($claims['type'] ?? '') === 'agent' && ($claims['sub'] ?? '') !== 'agent-local') {
    try {
      $st = $pdo->prepare('SELECT name, email, status, bus_enabled, hotel_enabled, car_enabled, partner_kind FROM partners WHERE id=? LIMIT 1');
      $st->execute([$claims['sub']]);
      $row = $st->fetch();
      if (!$row || ($row['status'] ?? 'active') !== 'active') ylt_fail(401, 'not authenticated');
      $claims['name'] = $row['name'] ?: $claims['name'];
      $claims['email'] = $row['email'] ?: $claims['email'];
      $claims['bus_enabled'] = isset($row['bus_enabled']) ? (int)$row['bus_enabled'] : 1;
      $claims['hotel_enabled'] = isset($row['hotel_enabled']) ? (int)$row['hotel_enabled'] : 1;
      $claims['car_enabled'] = isset($row['car_enabled']) ? (int)$row['car_enabled'] : 1;
      if (!empty($row['partner_kind'])) $claims['partner_kind'] = $row['partner_kind'];
    } catch (Throwable $e) { /* partners flags may be missing */ }
  }
  ylt_ok(['ok' => true, 'user' => $claims]);
}

ylt_fail(400, 'Unknown auth action.');
