<?php
if (!function_exists('str_contains')) {
  function str_contains($haystack, $needle) {
    return $needle === '' || strpos((string)$haystack, (string)$needle) !== false;
  }
}
if (!function_exists('str_starts_with')) {
  function str_starts_with($haystack, $needle) {
    $needle = (string)$needle;
    return $needle === '' || strncmp((string)$haystack, $needle, strlen($needle)) === 0;
  }
}
if (!function_exists('str_ends_with')) {
  function str_ends_with($haystack, $needle) {
    $needle = (string)$needle;
    if ($needle === '') return true;
    $len = strlen($needle);
    return substr((string)$haystack, -$len) === $needle;
  }
}

$c = require __DIR__ . '/config.php';

$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
$corsAllow = [
  'https://ylttravels.com',
  'https://www.ylttravels.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];
$configuredOrigin = (string)($c['cors_origin'] ?? '');
if ($configuredOrigin && $configuredOrigin !== '*') $corsAllow[] = $configuredOrigin;
if ($origin && in_array($origin, $corsAllow, true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
  header('Access-Control-Allow-Credentials: true');
} elseif ($origin && preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization');
header('Access-Control-Max-Age: 86400');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(204);
  exit;
}
header('Content-Type: application/json; charset=utf-8');

function ylt_fail($status, $error) {
  http_response_code((int)$status);
  echo json_encode(['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
  exit;
}

function ylt_ok($data, $status = 200) {
  http_response_code((int)$status);
  if (!is_array($data)) $data = ['ok' => true, 'data' => $data];
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function ylt_body() {
  $ct = (string)($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
  if (stripos($ct, 'multipart/form-data') === 0) return $_POST ?: [];
  $raw = file_get_contents('php://input') ?: '';
  if ($raw === '') return $_POST ?: [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}

function ylt_uuid() {
  $d = random_bytes(16);
  $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
  $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

function ylt_b64url($bin) {
  return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function ylt_b64url_dec($s) {
  $b = strtr((string)$s, '-_', '+/');
  $pad = strlen($b) % 4;
  if ($pad) $b .= str_repeat('=', 4 - $pad);
  return base64_decode($b);
}

function ylt_jwt_encode($payload, $secret) {
  $h = ylt_b64url(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
  $p = ylt_b64url(json_encode($payload));
  $s = ylt_b64url(hash_hmac('sha256', "$h.$p", $secret, true));
  return "$h.$p.$s";
}

function ylt_jwt_decode($token, $secret) {
  if (!$token) return null;
  $token = preg_replace('/^Bearer\s+/i', '', $token);
  $parts = explode('.', $token);
  if (count($parts) !== 3) return null;
  list($h, $p, $s) = $parts;
  $header = json_decode(ylt_b64url_dec($h) ?: '', true);
  if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256') return null;
  $check = ylt_b64url(hash_hmac('sha256', "$h.$p", $secret, true));
  if (!hash_equals($check, $s)) return null;
  $json = ylt_b64url_dec($p);
  $payload = json_decode($json ?: '', true);
  if (!is_array($payload)) return null;
  if (isset($payload['exp']) && time() >= (int)$payload['exp']) return null;
  return $payload;
}

function ylt_bearer() {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if (!$h && !empty($_SERVER['HTTP_X_AUTHORIZATION'])) $h = $_SERVER['HTTP_X_AUTHORIZATION'];
  if (!$h && function_exists('getallheaders')) {
    foreach (getallheaders() as $k => $v) {
      if (strcasecmp($k, 'Authorization') === 0 || strcasecmp($k, 'X-Authorization') === 0) { $h = $v; break; }
    }
  }
  return $h ?: null;
}

function ylt_client_ip() {
  return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 64);
}

function ylt_is_staff_type($type) {
  return $type === 'admin' || $type === 'agent';
}

function ylt_token_ttl($c, $type, $remember) {
  $staff = ylt_is_staff_type($type);
  if ($remember) {
    return $staff ? (int)($c['jwt_ttl_staff_remember'] ?? 86400) : (int)($c['jwt_ttl_remember'] ?? 604800);
  }
  return $staff ? (int)($c['jwt_ttl_staff'] ?? 28800) : (int)($c['jwt_ttl'] ?? 43200);
}

function ylt_jwt_revoke($pdo, $jti, $exp) {
  if (!$jti) return;
  try {
    $pdo->prepare('INSERT INTO jwt_denylist (jti, expires_at) VALUES (?,?)')->execute([$jti, (int)$exp]);
  } catch (Throwable $e) { /* table missing or already revoked */ }
}

function ylt_jwt_revoked($pdo, $jti) {
  if (!$jti) return false;
  try {
    $st = $pdo->prepare('SELECT 1 FROM jwt_denylist WHERE jti=? LIMIT 1');
    $st->execute([$jti]);
    return (bool)$st->fetchColumn();
  } catch (Throwable $e) {
    return false;
  }
}

function ylt_idle_seconds($c, $claims = []) {
  $cap = 1800;
  $cfg = (int)($c['idle_timeout'] ?? $cap);
  $tok = isset($claims['idle']) ? (int)$claims['idle'] : 0;
  $n = $tok > 0 ? $tok : ($cfg > 0 ? $cfg : $cap);
  if ($n > $cap) $n = $cap;
  if ($n < 60) $n = 60;
  return $n;
}

function ylt_jwt_activity_table($pdo) {
  try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS jwt_activity (
      jti VARCHAR(64) NOT NULL PRIMARY KEY,
      last_seen INT NOT NULL,
      idle_sec INT NOT NULL DEFAULT 1800,
      expires_at INT NOT NULL,
      INDEX jwt_activity_seen_idx (last_seen)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  } catch (Throwable $e) { /* exists */ }
}

function ylt_jwt_idle_ok($pdo, $c, $claims) {
  $jti = (string)($claims['jti'] ?? '');
  if ($jti === '') return true;
  $idle = ylt_idle_seconds($c, $claims);
  $now = time();
  $exp = (int)($claims['exp'] ?? ($now + $idle));
  ylt_jwt_activity_table($pdo);
  try {
    $st = $pdo->prepare('SELECT last_seen FROM jwt_activity WHERE jti=? LIMIT 1');
    $st->execute([$jti]);
    $row = $st->fetch();
    if ($row) {
      $seen = (int)$row['last_seen'];
      if ($seen > 0 && ($now - $seen) > $idle) {
        ylt_jwt_revoke($pdo, $jti, $exp);
        try { $pdo->prepare('DELETE FROM jwt_activity WHERE jti=?')->execute([$jti]); } catch (Throwable $e) { /* ignore */ }
        return false;
      }
      $pdo->prepare('UPDATE jwt_activity SET last_seen=?, idle_sec=?, expires_at=? WHERE jti=?')->execute([$now, $idle, $exp, $jti]);
    } else {
      $pdo->prepare('INSERT INTO jwt_activity (jti, last_seen, idle_sec, expires_at) VALUES (?,?,?,?)')->execute([$jti, $now, $idle, $exp]);
    }
  } catch (Throwable $e) {
    return true;
  }
  return true;
}

function ylt_auth_claims($c, $pdo) {
  $claims = ylt_jwt_decode(ylt_bearer(), $c['jwt_secret']);
  if (!$claims) return null;
  if (!empty($claims['jti']) && ylt_jwt_revoked($pdo, $claims['jti'])) return null;
  if (!ylt_jwt_idle_ok($pdo, $c, $claims)) return null;
  return $claims;
}

function ylt_require_auth($c, $pdo) {
  $u = ylt_auth_claims($c, $pdo);
  if (!$u) ylt_fail(401, 'not authenticated');
  return $u;
}

function ylt_require_admin($c, $pdo) {
  $u = ylt_require_auth($c, $pdo);
  if (($u['type'] ?? '') !== 'admin') ylt_fail(403, 'admin required');
  return $u;
}

function ylt_require_staff($c, $pdo) {
  $u = ylt_require_auth($c, $pdo);
  if (!ylt_is_staff_type($u['type'] ?? '')) ylt_fail(403, 'staff required');
  return $u;
}

function ylt_partner_upload_key($auth, $p = []) {
  if (($auth['type'] ?? '') === 'agent') {
    return preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($auth['sub'] ?? ''));
  }
  if (($auth['type'] ?? '') === 'admin') {
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($p['partner_id'] ?? $_GET['partner_id'] ?? 'admin'));
    return $id !== '' ? $id : 'admin';
  }
  return '';
}

function ylt_uploads_root() {
  return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads';
}

function ylt_public_image_url($v) {
  $v = trim((string)$v);
  if ($v === '' || str_starts_with($v, 'data:')) return '';
  if (strlen($v) > 2000) return '';
  if (preg_match('#^https?://#i', $v) || str_starts_with($v, '//')) return $v;
  if ($v[0] !== '/') $v = '/' . ltrim($v, '/');
  return $v;
}

function ylt_public_image_list($v) {
  if (is_string($v)) {
    $d = json_decode($v, true);
    if (is_array($d)) $v = $d;
    else $v = array_filter(array_map('trim', explode(',', $v)));
  }
  if (!is_array($v)) return [];
  $out = [];
  foreach ($v as $u) {
    $u = ylt_public_image_url(is_array($u) ? ($u['url'] ?? '') : $u);
    if ($u !== '') $out[] = $u;
  }
  return array_values(array_unique($out));
}

function ylt_image_ext_from_bin($bin) {
  if (strlen($bin) < 12) return '';
  if (strncmp($bin, "\xFF\xD8\xFF", 3) === 0) return 'jpg';
  if (strncmp($bin, "\x89PNG\r\n\x1a\n", 8) === 0) return 'png';
  if (strncmp($bin, 'RIFF', 4) === 0 && substr($bin, 8, 4) === 'WEBP') return 'webp';
  return '';
}

function ylt_ensure_partner_onboard_cols($pdo) {
  ylt_add_col($pdo, 'partners', 'partner_kind', "partner_kind VARCHAR(30) NOT NULL DEFAULT 'agent'");
  ylt_add_col($pdo, 'partners', 'source', "source VARCHAR(20) NOT NULL DEFAULT 'admin'");
  ylt_add_col($pdo, 'partners', 'aadhaar_url', 'aadhaar_url TEXT');
  ylt_add_col($pdo, 'partners', 'pan_url', 'pan_url TEXT');
  ylt_add_col($pdo, 'partners', 'gst_url', 'gst_url TEXT');
  ylt_add_col($pdo, 'partners', 'aadhaar_filename', 'aadhaar_filename VARCHAR(255)');
  ylt_add_col($pdo, 'partners', 'pan_filename', 'pan_filename VARCHAR(255)');
  ylt_add_col($pdo, 'partners', 'gst_filename', 'gst_filename VARCHAR(255)');
  ylt_add_col($pdo, 'partners', 'msme', 'msme TINYINT(1) NOT NULL DEFAULT 0');
  ylt_add_col($pdo, 'partners', 'corporate', 'corporate TINYINT(1) NOT NULL DEFAULT 0');
  ylt_add_col($pdo, 'partners', 'whatsapp_optin', 'whatsapp_optin TINYINT(1) NOT NULL DEFAULT 0');
  ylt_add_col($pdo, 'partners', 'reject_reason', 'reject_reason TEXT');
  ylt_add_col($pdo, 'partners', 'terms_accepted', 'terms_accepted TINYINT(1) NOT NULL DEFAULT 0');
  ylt_add_col($pdo, 'partners', 'application_payload', 'application_payload LONGTEXT');
  ylt_add_col($pdo, 'partners', 'reviewed_at', 'reviewed_at TIMESTAMP NULL');
  ylt_add_col($pdo, 'partners', 'reviewed_by', 'reviewed_by VARCHAR(255)');
  try {
    $pdo->exec("UPDATE partners SET source='kyc' WHERE (source IS NULL OR source='' OR source='admin') AND (IFNULL(terms_accepted,0)=1 OR IFNULL(aadhaar_url,'')<>'' OR IFNULL(pan_url,'')<>'' OR IFNULL(gst_url,'')<>'' OR status IN ('pending','rejected'))");
  } catch (Throwable $e) { /* backfill optional */ }
}

function ylt_staff_role($u) {
  return strtolower(trim((string)($u['role'] ?? 'admin')));
}

function ylt_is_core_admin($u) {
  $r = ylt_staff_role($u);
  return $r === 'admin' || $r === '';
}

function ylt_partner_queue_of($row) {
  $kind = strtolower(trim((string)($row['partner_kind'] ?? '')));
  if ($kind === 'agent') return 'agent';
  if ($kind === 'insurance') return 'insurance';
  return 'partner';
}

function ylt_partner_is_kyc($row) {
  $src = strtolower(trim((string)($row['source'] ?? '')));
  if ($src === 'kyc') return true;
  if ($src === 'admin') return false;
  $st = strtolower((string)($row['status'] ?? ''));
  if (in_array($st, ['pending', 'rejected'], true)) return true;
  if (!empty($row['terms_accepted'])) return true;
  if (trim((string)($row['aadhaar_url'] ?? '')) !== '' || trim((string)($row['pan_url'] ?? '')) !== '' || trim((string)($row['gst_url'] ?? '')) !== '') return true;
  return false;
}

function ylt_can_kyc_queue($u, $queue) {
  if (ylt_is_core_admin($u)) return true;
  $r = ylt_staff_role($u);
  if ($r === 'onboard') return in_array($queue, ['partner', 'agent', 'insurance'], true);
  if ($r === 'partner_onboard') return $queue === 'partner';
  if ($r === 'agent_onboard') return $queue === 'agent';
  return false;
}

function ylt_can_manage_live_partners($u) {
  return ylt_is_core_admin($u);
}

function ylt_onboard_store_file($pdo, $p) {
  $ip = ylt_client_ip();
  if (!ylt_throttle($pdo, 'onboard_up:' . $ip, 12, 20)) ylt_fail(429, 'Too many uploads. Try again shortly.');
  $raw = (string)($p['file_data'] ?? $p['data'] ?? '');
  if (str_contains($raw, ',')) $raw = substr($raw, strpos($raw, ',') + 1);
  $raw = preg_replace('/\s+/', '', $raw);
  $bin = base64_decode($raw, true);
  if ($bin === false || $bin === '') ylt_fail(400, 'File data required.');
  if (strlen($bin) > 6 * 1024 * 1024) ylt_fail(400, 'File too large. Max 6MB.');
  $origName = (string)($p['filename'] ?? $p['file_name'] ?? 'document');
  $ext = ylt_careers_ext($bin, $origName);
  if ($ext === '') ylt_fail(400, 'Use PDF, JPG, PNG, WebP, DOC, or DOCX.');
  $root = ylt_uploads_root();
  $dir = $root . DIRECTORY_SEPARATOR . 'onboard';
  if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) ylt_fail(500, 'Could not create upload folder.');
  $realRoot = realpath($root);
  $realDir = realpath($dir);
  if (!$realRoot || !$realDir || strpos($realDir, $realRoot) !== 0) ylt_fail(403, 'Invalid upload folder.');
  $name = bin2hex(random_bytes(16)) . '.' . $ext;
  if (file_put_contents($realDir . DIRECTORY_SEPARATOR . $name, $bin) === false) ylt_fail(500, 'Could not save file.');
  $orig = basename(str_replace('\\', '/', $origName));
  if ($orig === '' || $orig === '.' || $orig === '..') $orig = $name;
  return ['ok' => true, 'url' => '/uploads/onboard/' . $name, 'filename' => substr($orig, 0, 255), 'stored' => $name];
}

function ylt_password_rules_ok($password) {
  $p = (string)$password;
  return strlen($p) >= 8 && preg_match('/[A-Z]/', $p) && preg_match('/\d/', $p) && preg_match('/[^A-Za-z0-9]/', $p);
}

function ylt_staff_store_image($auth, $p) {
  $partner = ylt_partner_upload_key($auth, $p);
  if ($partner === '') ylt_fail(401, 'Sign in as a partner to upload.');
  $raw = (string)($p['file_data'] ?? $p['data'] ?? '');
  if (str_contains($raw, ',')) $raw = substr($raw, strpos($raw, ',') + 1);
  $raw = preg_replace('/\s+/', '', $raw);
  $bin = base64_decode($raw, true);
  if ($bin === false || $bin === '') ylt_fail(400, 'Image data required.');
  if (strlen($bin) > 6 * 1024 * 1024) ylt_fail(400, 'Image too large. Max 6MB.');
  $ext = ylt_image_ext_from_bin($bin);
  if ($ext === '') ylt_fail(400, 'Use a JPG, PNG, or WebP image.');
  $root = ylt_uploads_root();
  $dir = $root . DIRECTORY_SEPARATOR . $partner;
  if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) ylt_fail(500, 'Could not create upload folder.');
  $realRoot = realpath($root);
  $realDir = realpath($dir);
  if (!$realRoot || !$realDir || strpos($realDir, $realRoot) !== 0) ylt_fail(403, 'Invalid upload folder.');
  $name = bin2hex(random_bytes(16)) . '.' . $ext;
  $path = $realDir . DIRECTORY_SEPARATOR . $name;
  if (file_put_contents($path, $bin) === false) ylt_fail(500, 'Could not save image.');
  return ['ok' => true, 'url' => '/uploads/' . $partner . '/' . $name, 'filename' => $name];
}

function ylt_staff_list_images($auth, $p = []) {
  $partner = ylt_partner_upload_key($auth, $p);
  if ($partner === '') return [];
  $dir = ylt_uploads_root() . DIRECTORY_SEPARATOR . $partner;
  $realRoot = realpath(ylt_uploads_root());
  $realDir = is_dir($dir) ? realpath($dir) : false;
  if (!$realRoot || !$realDir || strpos($realDir, $realRoot) !== 0) return [];
  $out = [];
  foreach (scandir($realDir) ?: [] as $f) {
    if ($f === '.' || $f === '..') continue;
    if (!preg_match('/\.(jpe?g|png|webp)$/i', $f)) continue;
    $out[] = ['url' => '/uploads/' . $partner . '/' . $f, 'filename' => $f];
  }
  return $out;
}

function ylt_careers_ext($bin, $filename = '') {
  $ext = ylt_image_ext_from_bin($bin);
  if ($ext !== '') return $ext;
  if (strncmp($bin, '%PDF', 4) === 0) return 'pdf';
  if (strncmp($bin, "\xD0\xCF\x11\xE0", 4) === 0) return 'doc';
  $fn = strtolower((string)$filename);
  if (strncmp($bin, "PK\x03\x04", 4) === 0 && preg_match('/\.docx$/', $fn)) return 'docx';
  return '';
}

function ylt_careers_from_files($field) {
  if (empty($_FILES[$field]) || !is_array($_FILES[$field])) return null;
  $err = (int)($_FILES[$field]['error'] ?? UPLOAD_ERR_NO_FILE);
  if ($err === UPLOAD_ERR_NO_FILE) return null;
  if ($err !== UPLOAD_ERR_OK) ylt_fail(400, 'Could not read uploaded file.');
  $tmp = (string)($_FILES[$field]['tmp_name'] ?? '');
  if ($tmp === '' || !is_uploaded_file($tmp)) ylt_fail(400, 'Invalid upload.');
  $bin = file_get_contents($tmp);
  if ($bin === false || $bin === '') ylt_fail(400, 'Empty upload.');
  return ['bin' => $bin, 'name' => (string)($_FILES[$field]['name'] ?? $field)];
}

function ylt_careers_decode_b64($raw) {
  $raw = (string)$raw;
  if ($raw === '') return null;
  if (str_contains($raw, ',')) $raw = substr($raw, strpos($raw, ',') + 1);
  $raw = preg_replace('/\s+/', '', $raw);
  if (strlen($raw) < 24) return null;
  $bin = base64_decode($raw, true);
  if ($bin === false || $bin === '') return null;
  return $bin;
}

function ylt_careers_bin_from_request($p, $field) {
  $file = ylt_careers_from_files($field);
  if ($file) return $file;
  $bin = ylt_careers_decode_b64((string)($p[$field . '_data'] ?? $p[$field] ?? ''));
  if ($bin === null) return null;
  $name = (string)($p[$field . '_name'] ?? $p[$field . '_filename'] ?? $field);
  return ['bin' => $bin, 'name' => $name];
}

function ylt_careers_store_file($jobId, $kind, $bin, $filename) {
  if (strlen($bin) > 6 * 1024 * 1024) ylt_fail(400, 'File too large. Max 6MB.');
  $ext = ylt_careers_ext($bin, $filename);
  if ($ext === '') ylt_fail(400, 'Use PDF, JPG, PNG, WebP, DOC, or DOCX.');
  $jobKey = preg_replace('/[^a-zA-Z0-9-]/', '', (string)$jobId);
  if ($jobKey === '') ylt_fail(400, 'Invalid job.');
  $kindKey = $kind === 'id_proof' ? 'id' : 'resume';
  $root = ylt_uploads_root();
  $dir = $root . DIRECTORY_SEPARATOR . 'careers' . DIRECTORY_SEPARATOR . $jobKey;
  if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) ylt_fail(500, 'Could not create upload folder.');
  $realRoot = realpath($root);
  $realDir = realpath($dir);
  if (!$realRoot || !$realDir || strpos($realDir, $realRoot) !== 0) ylt_fail(403, 'Invalid upload folder.');
  $name = $kindKey . '-' . bin2hex(random_bytes(12)) . '.' . $ext;
  if (file_put_contents($realDir . DIRECTORY_SEPARATOR . $name, $bin) === false) ylt_fail(500, 'Could not save file.');
  $orig = basename(str_replace('\\', '/', (string)$filename));
  if ($orig === '' || $orig === '.' || $orig === '..') $orig = $kindKey . '.' . $ext;
  return [
    'path' => '/uploads/careers/' . $jobKey . '/' . $name,
    'filename' => substr($orig, 0, 255),
  ];
}

function ylt_careers_abs_path($stored) {
  $stored = str_replace('\\', '/', (string)$stored);
  $stored = preg_replace('#\.\.+#', '', $stored);
  if (!preg_match('#^/uploads/careers/[a-zA-Z0-9-]+/[a-zA-Z0-9._-]+$#', $stored)) return '';
  $rel = substr($stored, strlen('/uploads/'));
  $root = realpath(ylt_uploads_root());
  $full = realpath(ylt_uploads_root() . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel));
  if (!$full || !$root || strpos($full, $root) !== 0 || !is_file($full)) return '';
  $norm = str_replace('\\', '/', $full);
  if (!preg_match('#/careers/[a-zA-Z0-9-]+/#', $norm)) return '';
  return $full;
}

function ylt_careers_mime($path) {
  $ext = strtolower(pathinfo((string)$path, PATHINFO_EXTENSION));
  $map = [
    'pdf' => 'application/pdf',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  return $map[$ext] ?? 'application/octet-stream';
}

function ylt_careers_send_file($abs, $filename, $download) {
  $mime = ylt_careers_mime($abs);
  $orig = preg_replace('/[\r\n"\\\\]+/', '', basename(str_replace('\\', '/', (string)$filename)));
  if ($orig === '') $orig = basename($abs);
  header_remove('Content-Type');
  header('Content-Type: ' . $mime);
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: private, no-store');
  $disp = $download ? 'attachment' : 'inline';
  header('Content-Disposition: ' . $disp . '; filename="' . $orig . '"');
  header('Content-Length: ' . (string)filesize($abs));
  readfile($abs);
  exit;
}

function ylt_throttle($pdo, $key, $max, $minutes) {
  try {
    $st = $pdo->prepare('SELECT COUNT(*) FROM auth_throttle WHERE k=? AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)');
    $st->execute([$key, (int)$minutes]);
    if ((int)$st->fetchColumn() >= (int)$max) return false;
    $pdo->prepare('INSERT INTO auth_throttle (id, k) VALUES (?,?)')->execute([ylt_uuid(), $key]);
    return true;
  } catch (Throwable $e) {
    return true;
  }
}

function ylt_razorpay_valid($pdo, $orderId, $paymentId, $signature) {
  if (!$orderId || !$paymentId || !$signature) return false;
  try {
    $st = $pdo->query('SELECT razorpay_secret FROM app_settings WHERE id=1');
    $row = $st ? ($st->fetch() ?: []) : [];
    $secret = (string)($row['razorpay_secret'] ?? '');
  } catch (Throwable $e) {
    $secret = '';
  }
  if ($secret === '') return false;
  $expect = hash_hmac('sha256', $orderId . '|' . $paymentId, $secret);
  return hash_equals($expect, $signature);
}

function ylt_pdo($c) {
  foreach ($c['hosts'] as $host) {
    try {
      $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $host,
        $c['name'],
        $c['charset'] ?? 'utf8mb4'
      );
      return new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
      ]);
    } catch (Throwable $e) {
      /* try next host */
    }
  }
  ylt_fail(500, 'Database unavailable. Visit /api/install.php once.');
}

function ylt_schema_path() {
  return __DIR__ . '/schema.sql';
}

function ylt_split_sql($sql) {
  $out = [];
  $buf = '';
  $inStr = false;
  $esc = false;
  $len = strlen($sql);
  for ($i = 0; $i < $len; $i++) {
    $ch = $sql[$i];
    if ($inStr) {
      $buf .= $ch;
      if ($esc) { $esc = false; continue; }
      if ($ch === '\\') { $esc = true; continue; }
      if ($ch === "'") $inStr = false;
      continue;
    }
    if ($ch === '-' && $i + 1 < $len && $sql[$i + 1] === '-') {
      while ($i < $len && $sql[$i] !== "\n") $i++;
      continue;
    }
    if ($ch === "'") { $inStr = true; $buf .= $ch; continue; }
    if ($ch === ';') {
      $s = trim($buf);
      $buf = '';
      if ($s !== '') $out[] = $s;
      continue;
    }
    $buf .= $ch;
  }
  $s = trim($buf);
  if ($s !== '') $out[] = $s;
  return $out;
}

function ylt_apply_schema_file($pdo) {
  $path = ylt_schema_path();
  if (!is_readable($path)) return;
  $text = file_get_contents($path);
  foreach (ylt_split_sql($text) as $stmt) {
    try { $pdo->exec($stmt); } catch (Throwable $e) { /* CREATE IF NOT EXISTS / INSERT IGNORE */ }
  }
}

function ylt_table_cols($pdo, $table) {
  $out = [];
  try {
    $rows = $pdo->query('SHOW COLUMNS FROM `' . str_replace('`', '', $table) . '`');
    if ($rows) {
      foreach ($rows as $r) $out[$r['Field']] = true;
    }
  } catch (Throwable $e) { /* missing table */ }
  return $out;
}

function ylt_add_col($pdo, $table, $col, $ddl) {
  $cols = ylt_table_cols($pdo, $table);
  if (!$cols || isset($cols[$col])) return;
  try { $pdo->exec("ALTER TABLE `$table` ADD COLUMN $ddl"); } catch (Throwable $e) { /* already added */ }
}

function ylt_otp_normalize($code) {
  return preg_replace('/\D+/', '', (string)$code);
}

function ylt_otp_hash_store($code) {
  $hash = password_hash((string)$code, PASSWORD_DEFAULT);
  if ($hash === false || $hash === '') {
    throw new RuntimeException('otp hash failed');
  }
  return $hash;
}

function ylt_otp_matches($stored, $email, $code) {
  $stored = trim((string)$stored);
  $code = ylt_otp_normalize($code);
  $email = strtolower(trim((string)$email));
  if ($stored === '' || strlen($code) < 4) return false;
  $info = password_get_info($stored);
  if (!empty($info['algo'])) {
    return password_verify($code, $stored);
  }
  if (str_starts_with($stored, '$2') || str_starts_with($stored, '$argon')) {
    return password_verify($code, $stored);
  }
  if (preg_match('/^[a-f0-9]{64}$/i', $stored)) {
    $want = hash('sha256', 'ylt-otp|' . $email . '|' . $code);
    return hash_equals(strtolower($stored), $want);
  }
  return hash_equals($stored, $code);
}

function ylt_ensure_otp_columns($pdo) {
  ylt_add_col($pdo, 'otp_codes', 'attempts', 'attempts INT NOT NULL DEFAULT 0');
  ylt_add_col($pdo, 'otp_codes', 'created_at', 'created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
  try {
    $st = $pdo->query("SHOW COLUMNS FROM otp_codes LIKE 'code'");
    $col = $st ? $st->fetch() : null;
    if (!$col) return;
    $type = strtolower((string)($col['Type'] ?? ''));
    $need = true;
    if (preg_match('/^(var)?char\((\d+)\)$/', $type, $m)) {
      $need = (int)$m[2] < 255;
    } elseif (str_contains($type, 'text') || str_contains($type, 'blob')) {
      $need = false;
    }
    if ($need) {
      $pdo->exec('ALTER TABLE otp_codes MODIFY code VARCHAR(255) NOT NULL');
    }
  } catch (Throwable $e) { /* table may not exist until install */ }
}

function ylt_ensure_columns($pdo) {
  ylt_add_col($pdo, 'app_settings', 'inventory_provider', "inventory_provider VARCHAR(50) DEFAULT 'ylt_db'");
  ylt_add_col($pdo, 'app_settings', 'bitla_api_url', "bitla_api_url VARCHAR(500) DEFAULT ''");
  ylt_add_col($pdo, 'app_settings', 'bitla_api_key', "bitla_api_key VARCHAR(255) DEFAULT ''");
  ylt_add_col($pdo, 'app_settings', 'bitla_operator_id', "bitla_operator_id VARCHAR(100) DEFAULT ''");
  ylt_add_col($pdo, 'app_settings', 'razorpay_key_id', "razorpay_key_id VARCHAR(255) DEFAULT ''");
  ylt_add_col($pdo, 'app_settings', 'razorpay_secret', 'razorpay_secret TEXT');
  ylt_add_col($pdo, 'app_settings', 'payment_provider', "payment_provider VARCHAR(30) DEFAULT 'razorpay'");
  ylt_add_col($pdo, 'app_settings', 'payments_enabled', 'payments_enabled TINYINT(1) DEFAULT 1');
  ylt_add_col($pdo, 'directors', 'linkedin_url', 'linkedin_url TEXT');
  ylt_add_col($pdo, 'directors', 'order_index', 'order_index INT NOT NULL DEFAULT 0');
  ylt_add_col($pdo, 'offers', 'tag', "tag VARCHAR(50) NOT NULL DEFAULT 'Bus'");
  ylt_add_col($pdo, 'offers', 'tone', "tone VARCHAR(100) NOT NULL DEFAULT 'from-navy-800 to-navy-600'");
  ylt_add_col($pdo, 'hotel_bookings', 'user_identifier', 'user_identifier VARCHAR(255)');
  ylt_add_col($pdo, 'hotel_bookings', 'payment_status', "payment_status VARCHAR(30) NOT NULL DEFAULT 'paid'");
  ylt_add_col($pdo, 'hotel_bookings', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'hotel_bookings', 'room_id', 'room_id VARCHAR(64)');
  ylt_add_col($pdo, 'hotel_bookings', 'room_number', 'room_number VARCHAR(30)');
  ylt_add_col($pdo, 'hotel_bookings', 'checked_in_at', 'checked_in_at TIMESTAMP NULL');
  ylt_add_col($pdo, 'hotel_bookings', 'checked_out_at', 'checked_out_at TIMESTAMP NULL');
  ylt_add_col($pdo, 'hotels', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'hotels', 'contact_phone', 'contact_phone VARCHAR(50)');
  ylt_add_col($pdo, 'hotels', 'sla_verified', 'sla_verified TINYINT(1) NOT NULL DEFAULT 1');
  ylt_add_col($pdo, 'hotels', 'status', "status VARCHAR(30) NOT NULL DEFAULT 'active'");
  ylt_add_col($pdo, 'hotel_rooms', 'photo_url', 'photo_url TEXT');
  ylt_add_col($pdo, 'erp_routes', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'erp_schedules', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'erp_crew', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'erp_seat_inventory', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'erp_live_trips', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'erp_shifts', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'hotel_bookings', 'customer_id', 'customer_id VARCHAR(64)');
  ylt_ensure_hotel_cols($pdo);
  ylt_add_col($pdo, 'partners', 'bus_enabled', 'bus_enabled TINYINT(1) NOT NULL DEFAULT 1');
  ylt_add_col($pdo, 'partners', 'hotel_enabled', 'hotel_enabled TINYINT(1) NOT NULL DEFAULT 1');
  ylt_add_col($pdo, 'partners', 'car_enabled', 'car_enabled TINYINT(1) NOT NULL DEFAULT 1');
  ylt_ensure_partner_onboard_cols($pdo);
  ylt_add_col($pdo, 'bookings', 'feedback_token', 'feedback_token VARCHAR(64)');
  ylt_add_col($pdo, 'bookings', 'feedback_status', "feedback_status VARCHAR(20) DEFAULT 'none'");
  ylt_add_col($pdo, 'hotel_bookings', 'feedback_token', 'feedback_token VARCHAR(64)');
  ylt_add_col($pdo, 'hotel_bookings', 'feedback_status', "feedback_status VARCHAR(20) DEFAULT 'none'");
  ylt_ensure_otp_columns($pdo);
  ylt_ensure_pms_tables($pdo);
  $erp = [
    'erp_bus_health' => [
      'gps_status' => 'gps_status VARCHAR(30)',
      'odometer_km' => 'odometer_km DECIMAL(12,2)',
      'engine_hours' => 'engine_hours DECIMAL(10,2)',
      'notes' => 'notes TEXT',
    ],
    'erp_crew' => [
      'photo_url' => 'photo_url TEXT',
      'address' => 'address TEXT',
      'emergency_contact' => 'emergency_contact VARCHAR(100)',
      'joined_date' => 'joined_date DATE',
    ],
    'erp_shifts' => ['notes' => 'notes TEXT'],
    'erp_sla_scores' => ['notes' => 'notes TEXT'],
    'erp_channel_sales' => ['status' => "status VARCHAR(30) DEFAULT 'posted'"],
    'erp_routes' => ['status' => "status VARCHAR(30) DEFAULT 'active'"],
    'erp_schedules' => ['status' => "status VARCHAR(30) DEFAULT 'scheduled'"],
    'erp_live_trips' => ['started_at' => 'started_at TIMESTAMP NULL'],
    'erp_maintenance_logs' => ['description' => 'description TEXT'],
    'erp_part_replacements' => [
      'replaced_date' => 'replaced_date DATE',
      'notes' => 'notes TEXT',
    ],
    'erp_compliance' => ['notes' => 'notes TEXT'],
    'erp_expenses' => [
      'description' => 'description TEXT',
      'receipt_url' => 'receipt_url TEXT',
    ],
    'erp_partner_profile' => [
      'website_url' => 'website_url VARCHAR(255)',
      'description' => 'description TEXT',
      'bank_branch' => 'bank_branch VARCHAR(255)',
    ],
  ];
  foreach ($erp as $table => $cols) {
    foreach ($cols as $name => $ddl) ylt_add_col($pdo, $table, $name, $ddl);
  }
  try {
    $pdo->exec("UPDATE app_settings SET inventory_provider='ylt_db' WHERE id=1 AND (inventory_provider IS NULL OR inventory_provider='')");
  } catch (Throwable $e) { /* ignore */ }
}

function ylt_sample_hotel_ids() {
  return [
    'b1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    'b3333333-3333-4333-8333-333333333333',
    'b4444444-4444-4444-8444-444444444444',
    'b5555555-5555-4555-8555-555555555555',
    'b6666666-6666-4666-8666-666666666666',
  ];
}

function ylt_is_sample_hotel_id($id) {
  return in_array((string)$id, ylt_sample_hotel_ids(), true);
}

/** Restore demo catalog rows without touching partner-owned hotels. */
function ylt_ensure_sample_hotels($pdo) {
  try {
    $pdo->exec("INSERT IGNORE INTO hotels (id, name, city, area, address, star_rating, description, amenities, image_url, gallery_urls, price_per_night, rooms_available, rating, reviews, is_active) VALUES
      ('b1111111-1111-4111-8111-111111111111', 'YLT Grand Palace Hotel', 'Tirupati', 'Alipiri', 'Alipiri Road, Tirupati', 4, 'SLA-checked stay next to the bus stand with rooftop dining.', '[\"WiFi\",\"Restaurant\",\"Parking\",\"AC\",\"Room Service\"]', 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800', '[\"https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800\",\"https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800\"]', 2800.00, 8, 4.50, 86, 1),
      ('b2222222-2222-4222-8222-222222222222', 'YLT Business Suites', 'Hyderabad', 'Jubilee Hills', 'Road No. 36, Jubilee Hills', 4, 'Modern business hotel with conference rooms and late checkout for night buses.', '[\"WiFi\",\"Gym\",\"Parking\",\"AC\",\"Business Center\"]', 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg?auto=compress&cs=tinysrgb&w=800', '[\"https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg?auto=compress&cs=tinysrgb&w=800\"]', 3200.00, 10, 4.40, 64, 1),
      ('b3333333-3333-4333-8333-333333333333', 'YLT City Comfort', 'Chennai', 'Koyambedu', 'Near CMBT, Koyambedu', 3, 'Clean rooms 200m from the bus terminal. Instant PNR after Razorpay.', '[\"WiFi\",\"AC\",\"Parking\",\"Restaurant\"]', 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800', '[\"https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800\"]', 1900.00, 12, 4.20, 51, 1),
      ('b4444444-4444-4444-8444-444444444444', 'YLT Heritage Inn', 'Bangalore', 'Majestic', 'Near Kempegowda Bus Station', 3, 'Heritage property beside the stand. Women-safe front desk 24x7.', '[\"WiFi\",\"Restaurant\",\"AC\",\"Laundry\"]', 'https://images.pexels.com/photos/2507010/pexels-photo-2507010.jpeg?auto=compress&cs=tinysrgb&w=800', '[\"https://images.pexels.com/photos/2507010/pexels-photo-2507010.jpeg?auto=compress&cs=tinysrgb&w=800\"]', 2400.00, 7, 4.30, 44, 1),
      ('b5555555-5555-4555-8555-555555555555', 'YLT Temple View Residency', 'Tirupati', 'RTC Bus Stand', 'Opposite RTC Complex', 3, 'Walk to the RTC stand. Vegetarian kitchen and early checkout for darshan.', '[\"WiFi\",\"Restaurant\",\"AC\",\"Parking\"]', 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800', '[\"https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800\"]', 2100.00, 9, 4.35, 72, 1),
      ('b6666666-6666-4666-8666-666666666666', 'YLT Lakeside Court', 'Vijayawada', 'Benz Circle', 'MG Road, Vijayawada', 4, 'Quiet rooms with pool access for overnight Hyderabad–Vijayawada trips.', '[\"WiFi\",\"Pool\",\"Restaurant\",\"Parking\",\"AC\"]', 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800', '[\"https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800\"]', 2600.00, 6, 4.45, 38, 1)");
  } catch (Throwable $e) { /* hotels table may be missing */ }
  try {
    $ids = ylt_sample_hotel_ids();
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $pdo->prepare("UPDATE hotels SET is_active=1 WHERE id IN ($ph) AND IFNULL(partner_id,'') = ''")->execute($ids);
  } catch (Throwable $e) { /* ignore */ }
}

function ylt_retire_sample_hotels($pdo) {
  ylt_ensure_sample_hotels($pdo);
}

function ylt_seed_catalog($pdo) {
  try {
    $n = (int)$pdo->query('SELECT COUNT(*) FROM offers')->fetchColumn();
    if ($n === 0) {
      $pdo->exec("INSERT IGNORE INTO offers (id, promo_code, title, description, discount_value, expiry_date, is_active, tag, tone) VALUES
        ('a1111111-1111-4111-8111-111111111111', 'FIRST500', '₹500 off first trip', 'Use FIRST500 on AC and sleeper seats across South India.', '₹500', '2026-12-31', 1, 'Bus', 'from-navy-800 to-navy-600'),
        ('a2222222-2222-4222-8222-222222222222', 'STANDSTAY', 'Stay next to the stand', 'Verified hotels within 200m of major bus terminals.', 'Hotel combo', '2026-12-31', 1, 'Hotel', 'from-gold-600 to-gold-500'),
        ('a3333333-3333-4333-8333-333333333333', 'WOMENSAFE', 'Women-safe seats', 'Ladies quota and women-rated operators, one tap.', 'Ladies quota', '2026-12-31', 1, 'Women', 'from-navy-700 to-slate-700'),
        ('a4444444-4444-4444-8444-444444444444', 'YLTPAY', 'Pay on Razorpay', 'UPI, cards and net banking in one secure checkout.', 'Razorpay', '2026-12-31', 1, 'Pay', 'from-slate-800 to-navy-900')");
    }
  } catch (Throwable $e) { /* offers table missing until install */ }
  ylt_retire_sample_hotels($pdo);
}

function ylt_drop_all_tables($pdo) {
  $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
  $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM);
  foreach ($tables as $row) {
    $name = str_replace('`', '', (string)$row[0]);
    $pdo->exec("DROP TABLE IF EXISTS `$name`");
  }
  $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
}

function ylt_keep_tables() {
  return [
    'users', 'employees', 'partners', 'otp_codes', 'jwt_denylist', 'auth_throttle',
    'app_settings', 'bookings', 'hotel_bookings', 'payments', 'directors', 'offers',
    'hotels', 'newsletter_subscribers', 'email_templates', 'employee_files',
    'erp_buses', 'erp_bus_health', 'erp_bus_expenses', 'erp_crew', 'erp_crew_documents',
    'erp_shifts', 'erp_sla_scores', 'erp_seat_inventory', 'erp_seat_locks', 'erp_channel_sales',
    'erp_routes', 'erp_schedules', 'erp_live_trips', 'erp_earnings', 'erp_settlements', 'erp_payouts',
    'erp_maintenance_logs', 'erp_part_replacements', 'erp_compliance', 'erp_insights', 'erp_expenses',
    'erp_pl_reports', 'erp_partner_profile', 'erp_roles', 'erp_audit_logs', 'erp_api_keys',
    'hotel_rooms', 'hotel_rate_plans', 'hotel_folio_charges', 'hotel_notes',
    'crm_people', 'partner_customers', 'chat_messages', 'partner_cars', 'feedback_reviews',
    'help_articles', 'jobs', 'job_applications', 'erp_cancel_policies', 'partner_campaigns',
  ];
}

function ylt_historical_unused_tables() {
  return [
    'routes',
    'hotel_guests',
  ];
}

function ylt_drop_unused_tables($pdo) {
  $keep = array_fill_keys(ylt_keep_tables(), true);
  $unused = array_fill_keys(ylt_historical_unused_tables(), true);
  $dropped = [];
  try {
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM);
    foreach ($tables as $row) {
      $name = str_replace('`', '', (string)$row[0]);
      if ($name === '' || isset($keep[$name]) || !isset($unused[$name])) continue;
      $pdo->exec("DROP TABLE IF EXISTS `$name`");
      $dropped[] = $name;
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
  } catch (Throwable $e) {
    try { $pdo->exec('SET FOREIGN_KEY_CHECKS=1'); } catch (Throwable $e2) { /* ignore */ }
  }
  return $dropped;
}

function ylt_ensure_pms_tables($pdo) {
  $ddl = [
    "CREATE TABLE IF NOT EXISTS hotel_rooms (
      id CHAR(36) NOT NULL PRIMARY KEY,
      hotel_id VARCHAR(64) NOT NULL,
      partner_id VARCHAR(64),
      room_number VARCHAR(30) NOT NULL,
      floor VARCHAR(20),
      room_type VARCHAR(100) NOT NULL DEFAULT 'Standard',
      rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(30) NOT NULL DEFAULT 'vacant',
      hk_status VARCHAR(30) NOT NULL DEFAULT 'clean',
      booking_id CHAR(36),
      guest_name VARCHAR(255),
      photo_url TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX hotel_rooms_hotel_idx (hotel_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS chat_messages (
      id CHAR(36) NOT NULL PRIMARY KEY,
      thread_key VARCHAR(190) NOT NULL,
      channel VARCHAR(40) NOT NULL DEFAULT 'web',
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX chat_thread_idx (thread_key, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS partner_cars (
      id CHAR(36) NOT NULL PRIMARY KEY,
      partner_id VARCHAR(64),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'Sedan',
      pricing_model VARCHAR(50) NOT NULL DEFAULT 'per_km',
      rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      fuel_pct INT NOT NULL DEFAULT 100,
      driver_name VARCHAR(255),
      next_maintenance DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX partner_cars_partner_idx (partner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS feedback_reviews (
      id CHAR(36) NOT NULL PRIMARY KEY,
      token VARCHAR(64) NOT NULL UNIQUE,
      pnr VARCHAR(20) NOT NULL,
      booking_type VARCHAR(20) NOT NULL,
      booking_id VARCHAR(64),
      email VARCHAR(255),
      score TINYINT NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX feedback_pnr_idx (pnr)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS hotel_rate_plans (
      id CHAR(36) NOT NULL PRIMARY KEY,
      partner_id VARCHAR(64),
      hotel_id VARCHAR(64),
      name VARCHAR(120) NOT NULL,
      room_type VARCHAR(100) NOT NULL DEFAULT 'Standard',
      amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      meal_plan VARCHAR(40) NOT NULL DEFAULT 'Room only',
      refundable TINYINT(1) NOT NULL DEFAULT 1,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX hotel_rates_partner_idx (partner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS hotel_folio_charges (
      id CHAR(36) NOT NULL PRIMARY KEY,
      partner_id VARCHAR(64),
      booking_id VARCHAR(64) NOT NULL,
      pnr VARCHAR(30),
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      charge_type VARCHAR(40) NOT NULL DEFAULT 'other',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX hotel_folio_booking_idx (booking_id),
      INDEX hotel_folio_partner_idx (partner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS hotel_notes (
      id CHAR(36) NOT NULL PRIMARY KEY,
      partner_id VARCHAR(64),
      hotel_id VARCHAR(64),
      booking_id VARCHAR(64),
      guest_key VARCHAR(190),
      kind VARCHAR(30) NOT NULL DEFAULT 'note',
      title VARCHAR(255),
      body TEXT,
      due_date DATE,
      status VARCHAR(30) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX hotel_notes_partner_idx (partner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS crm_people (
      id CHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT '',
      email VARCHAR(255),
      phone VARCHAR(40),
      email_hash CHAR(64),
      phone_hash CHAR(64),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY crm_people_email_hash (email_hash),
      UNIQUE KEY crm_people_phone_hash (phone_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS partner_customers (
      id CHAR(36) NOT NULL PRIMARY KEY,
      partner_id VARCHAR(64) NOT NULL,
      person_id CHAR(36),
      name VARCHAR(255) NOT NULL DEFAULT '',
      city VARCHAR(100),
      tags TEXT,
      notes TEXT,
      last_stay DATE NULL,
      last_trip DATE NULL,
      first_seen TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY partner_customers_pair (partner_id, person_id),
      INDEX partner_customers_partner_idx (partner_id),
      INDEX partner_customers_person_idx (person_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS jwt_denylist (
      jti CHAR(36) NOT NULL PRIMARY KEY,
      expires_at INT NOT NULL,
      INDEX jwt_denylist_exp_idx (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS jwt_activity (
      jti VARCHAR(64) NOT NULL PRIMARY KEY,
      last_seen INT NOT NULL,
      idle_sec INT NOT NULL DEFAULT 1800,
      expires_at INT NOT NULL,
      INDEX jwt_activity_seen_idx (last_seen)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS auth_throttle (
      id CHAR(36) NOT NULL PRIMARY KEY,
      k VARCHAR(190) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX auth_throttle_k_idx (k, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  ];
  foreach ($ddl as $sql) {
    try { $pdo->exec($sql); } catch (Throwable $e) { /* exists */ }
  }
  ylt_ensure_hotel_cols($pdo);
  ylt_ensure_crm_table($pdo);
  ylt_ensure_ops_tables($pdo);
}

function ylt_ensure_ops_tables($pdo) {
  $ddl = [
    "CREATE TABLE IF NOT EXISTS help_articles (
      id CHAR(36) NOT NULL PRIMARY KEY,
      slug VARCHAR(120) NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'Booking',
      title VARCHAR(255) NOT NULL,
      summary TEXT,
      body TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY help_articles_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS jobs (
      id CHAR(36) NOT NULL PRIMARY KEY,
      partner_id VARCHAR(64),
      posted_by VARCHAR(64),
      title VARCHAR(255) NOT NULL,
      location VARCHAR(120),
      department VARCHAR(80) NOT NULL DEFAULT 'Operations',
      employment_type VARCHAR(40) NOT NULL DEFAULT 'Full-time',
      description TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX jobs_status_idx (status),
      INDEX jobs_partner_idx (partner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS job_applications (
      id CHAR(36) NOT NULL PRIMARY KEY,
      job_id CHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      cover_note TEXT,
      resume_path VARCHAR(500),
      resume_filename VARCHAR(255),
      id_proof_path VARCHAR(500),
      id_proof_filename VARCHAR(255),
      status VARCHAR(30) NOT NULL DEFAULT 'received',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX job_applications_job_idx (job_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS erp_cancel_policies (
      id CHAR(36) NOT NULL PRIMARY KEY,
      partner_id VARCHAR(64),
      name VARCHAR(120) NOT NULL,
      hours_before INT NOT NULL DEFAULT 6,
      refund_pct DECIMAL(5,2) NOT NULL DEFAULT 80.00,
      body TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX erp_cancel_partner_idx (partner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS partner_campaigns (
      id CHAR(36) NOT NULL PRIMARY KEY,
      partner_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX partner_campaigns_partner_idx (partner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  ];
  foreach ($ddl as $sql) {
    try { $pdo->exec($sql); } catch (Throwable $e) { /* exists */ }
  }
  ylt_add_col($pdo, 'bookings', 'channel', "channel VARCHAR(30) NOT NULL DEFAULT 'website'");
  ylt_add_col($pdo, 'bookings', 'person_id', 'person_id CHAR(36)');
  ylt_add_col($pdo, 'erp_schedules', 'service_name', 'service_name VARCHAR(255)');
  ylt_add_col($pdo, 'erp_schedules', 'depot', 'depot VARCHAR(120)');
  ylt_add_col($pdo, 'erp_schedules', 'policy_id', 'policy_id CHAR(36)');
  ylt_add_col($pdo, 'erp_buses', 'bus_type', "bus_type VARCHAR(80) NOT NULL DEFAULT 'AC Seater'");
  ylt_add_col($pdo, 'job_applications', 'resume_path', 'resume_path VARCHAR(500)');
  ylt_add_col($pdo, 'job_applications', 'resume_filename', 'resume_filename VARCHAR(255)');
  ylt_add_col($pdo, 'job_applications', 'id_proof_path', 'id_proof_path VARCHAR(500)');
  ylt_add_col($pdo, 'job_applications', 'id_proof_filename', 'id_proof_filename VARCHAR(255)');
}

function ylt_ensure_hotel_cols($pdo) {
  $cols = [
    'partner_id' => 'partner_id VARCHAR(64)',
    'contact_phone' => 'contact_phone VARCHAR(50)',
    'sla_verified' => 'sla_verified TINYINT(1) NOT NULL DEFAULT 1',
    'status' => "status VARCHAR(30) NOT NULL DEFAULT 'active'",
    'area' => 'area VARCHAR(255)',
    'address' => 'address TEXT',
    'star_rating' => 'star_rating INT NOT NULL DEFAULT 3',
    'description' => 'description TEXT',
    'amenities' => 'amenities TEXT',
    'image_url' => 'image_url TEXT',
    'gallery_urls' => 'gallery_urls TEXT',
    'price_per_night' => 'price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0.00',
    'rooms_available' => 'rooms_available INT NOT NULL DEFAULT 5',
    'rating' => 'rating DECIMAL(3,2) NOT NULL DEFAULT 4.00',
    'reviews' => 'reviews INT NOT NULL DEFAULT 0',
    'is_active' => 'is_active TINYINT(1) NOT NULL DEFAULT 1',
    'city' => 'city VARCHAR(100)',
  ];
  foreach ($cols as $name => $ddl) ylt_add_col($pdo, 'hotels', $name, $ddl);
  ylt_add_col($pdo, 'hotel_bookings', 'customer_id', 'customer_id VARCHAR(64)');
  ylt_add_col($pdo, 'hotel_bookings', 'person_id', 'person_id CHAR(36)');
  ylt_add_col($pdo, 'bookings', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'erp_buses', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'hotel_rooms', 'photo_url', 'photo_url TEXT');
  try {
    $pdo->exec("UPDATE hotels SET is_active=1 WHERE IFNULL(partner_id,'') <> '' AND IFNULL(status,'active') <> 'inactive' AND IFNULL(is_active,0)=0");
  } catch (Throwable $e) { /* hotels table may be new */ }
  ylt_retire_sample_hotels($pdo);
}

function ylt_crm_norm_email($email) {
  return strtolower(trim((string)$email));
}

function ylt_crm_norm_phone($phone) {
  $d = preg_replace('/\D+/', '', (string)$phone);
  if (strlen($d) === 12 && str_starts_with($d, '91')) $d = substr($d, 2);
  if (strlen($d) === 11 && str_starts_with($d, '0')) $d = substr($d, 1);
  return $d;
}

function ylt_crm_hash($kind, $value) {
  if ($value === '') return null;
  return hash('sha256', 'ylt-crm|' . $kind . '|' . $value);
}

function ylt_ensure_crm_table($pdo) {
  try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS crm_people (
      id CHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT '',
      email VARCHAR(255),
      phone VARCHAR(40),
      email_hash CHAR(64),
      phone_hash CHAR(64),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY crm_people_email_hash (email_hash),
      UNIQUE KEY crm_people_phone_hash (phone_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  } catch (Throwable $e) { /* exists */ }
  ylt_add_col($pdo, 'partner_customers', 'person_id', 'person_id CHAR(36)');
  ylt_add_col($pdo, 'partner_customers', 'first_seen', 'first_seen TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
  ylt_add_col($pdo, 'partner_customers', 'city', 'city VARCHAR(100)');
  ylt_add_col($pdo, 'partner_customers', 'tags', 'tags TEXT');
  ylt_add_col($pdo, 'partner_customers', 'notes', 'notes TEXT');
  ylt_add_col($pdo, 'partner_customers', 'last_stay', 'last_stay DATE NULL');
  ylt_add_col($pdo, 'partner_customers', 'last_trip', 'last_trip DATE NULL');
  ylt_add_col($pdo, 'hotel_bookings', 'person_id', 'person_id CHAR(36)');
  ylt_add_col($pdo, 'bookings', 'partner_id', 'partner_id VARCHAR(64)');
  ylt_add_col($pdo, 'erp_buses', 'partner_id', 'partner_id VARCHAR(64)');
  try {
    $n = (int)$pdo->query('SELECT COUNT(*) FROM partner_customers')->fetchColumn();
    if ($n === 0) {
      $pdo->exec("INSERT INTO partner_customers (id,partner_id,name,notes,created_at)
        SELECT id, partner_id, name, notes, created_at FROM hotel_guests WHERE partner_id IS NOT NULL AND partner_id <> ''");
    }
  } catch (Throwable $e) { /* hotel_guests may be empty */ }
  try {
    $rows = $pdo->query("SELECT id, partner_id, name, email, phone FROM partner_customers WHERE person_id IS NULL OR person_id=''")->fetchAll();
    foreach ($rows ?: [] as $r) {
      $personId = ylt_find_or_create_person($pdo, $r['name'] ?? '', $r['email'] ?? '', $r['phone'] ?? '');
      if ($personId) {
        $pdo->prepare('UPDATE partner_customers SET person_id=? WHERE id=?')->execute([$personId, $r['id']]);
      }
    }
  } catch (Throwable $e) { /* migrate best-effort */ }
  try {
    $pdo->exec('ALTER TABLE partner_customers ADD UNIQUE KEY partner_customers_pair (partner_id, person_id)');
  } catch (Throwable $e) { /* already unique or duplicates */ }
}

function ylt_find_or_create_person($pdo, $name, $email, $phone) {
  $name = trim((string)$name);
  $email = ylt_crm_norm_email($email);
  $phone = ylt_crm_norm_phone($phone);
  $eh = ylt_crm_hash('email', $email);
  $ph = ylt_crm_hash('phone', $phone);
  $found = null;
  try {
    if ($eh) {
      $st = $pdo->prepare('SELECT * FROM crm_people WHERE email_hash=? LIMIT 1');
      $st->execute([$eh]);
      $found = $st->fetch();
    }
    if (!$found && $ph) {
      $st = $pdo->prepare('SELECT * FROM crm_people WHERE phone_hash=? LIMIT 1');
      $st->execute([$ph]);
      $found = $st->fetch();
    }
    if ($found) {
      $sets = [];
      $vals = [];
      if ($name !== '' && trim((string)($found['name'] ?? '')) === '') { $sets[] = 'name=?'; $vals[] = $name; }
      if ($email !== '' && empty($found['email'])) { $sets[] = 'email=?'; $vals[] = $email; $sets[] = 'email_hash=?'; $vals[] = $eh; }
      if ($phone !== '' && empty($found['phone'])) { $sets[] = 'phone=?'; $vals[] = $phone; $sets[] = 'phone_hash=?'; $vals[] = $ph; }
      if ($sets) {
        $vals[] = $found['id'];
        try { $pdo->prepare('UPDATE crm_people SET ' . implode(',', $sets) . ' WHERE id=?')->execute($vals); } catch (Throwable $e) { /* unique collision */ }
      }
      return $found['id'];
    }
    $id = ylt_uuid();
    try {
      $pdo->prepare('INSERT INTO crm_people (id,name,email,phone,email_hash,phone_hash) VALUES (?,?,?,?,?,?)')
        ->execute([$id, $name !== '' ? $name : 'Guest', $email !== '' ? $email : null, $phone !== '' ? $phone : null, $eh, $ph]);
      return $id;
    } catch (Throwable $dup) {
      if ($eh) {
        $st = $pdo->prepare('SELECT id FROM crm_people WHERE email_hash=? LIMIT 1');
        $st->execute([$eh]);
        $row = $st->fetch();
        if ($row) return $row['id'];
      }
      if ($ph) {
        $st = $pdo->prepare('SELECT id FROM crm_people WHERE phone_hash=? LIMIT 1');
        $st->execute([$ph]);
        $row = $st->fetch();
        if ($row) return $row['id'];
      }
      return null;
    }
  } catch (Throwable $e) {
    return null;
  }
}

function ylt_tags_store($v) {
  if (is_array($v)) return json_encode(array_values($v));
  if (is_string($v) && $v !== '') {
    $d = json_decode($v, true);
    if (is_array($d)) return json_encode(array_values($d));
    $parts = array_values(array_filter(array_map('trim', explode(',', $v))));
    return json_encode($parts);
  }
  return '[]';
}

function ylt_crm_upsert_membership($pdo, $partnerId, $p) {
  if (!$partnerId) return null;
  ylt_ensure_crm_table($pdo);
  $name = trim((string)($p['name'] ?? $p['guest_name'] ?? ''));
  $email = (string)($p['email'] ?? $p['guest_email'] ?? $p['contact_email'] ?? '');
  $phone = (string)($p['phone'] ?? $p['guest_phone'] ?? $p['contact_phone'] ?? '');
  if ($name === '' && $email === '' && $phone === '') return null;
  if ($name === '') $name = 'Guest';
  $membershipId = (string)($p['id'] ?? $p['customer_id'] ?? '');
  try {
    $personId = ylt_find_or_create_person($pdo, $name, $email, $phone);
    if (!$personId) return null;
    $found = null;
    if ($membershipId !== '') {
      $st = $pdo->prepare('SELECT * FROM partner_customers WHERE id=? AND partner_id=? LIMIT 1');
      $st->execute([$membershipId, $partnerId]);
      $found = $st->fetch();
    }
    if (!$found) {
      $st = $pdo->prepare('SELECT * FROM partner_customers WHERE partner_id=? AND person_id=? LIMIT 1');
      $st->execute([$partnerId, $personId]);
      $found = $st->fetch();
    }
    $city = (string)($p['city'] ?? '');
    $tags = ylt_tags_store($p['tags'] ?? ($found['tags'] ?? []));
    $notes = array_key_exists('notes', $p) ? (string)$p['notes'] : (string)($found['notes'] ?? '');
    $lastStay = $p['last_stay'] ?? null;
    $lastTrip = $p['last_trip'] ?? null;
    if ($found) {
      $pdo->prepare('UPDATE partner_customers SET person_id=?, name=?, city=COALESCE(NULLIF(?, ""), city), tags=?, notes=?, last_stay=COALESCE(?, last_stay), last_trip=COALESCE(?, last_trip) WHERE id=? AND partner_id=?')
        ->execute([$personId, $name, $city, $tags, $notes, $lastStay ?: null, $lastTrip ?: null, $found['id'], $partnerId]);
      return $found['id'];
    }
    $nid = $membershipId !== '' ? $membershipId : ylt_uuid();
    try {
      $pdo->prepare('INSERT INTO partner_customers (id,partner_id,person_id,name,city,tags,notes,last_stay,last_trip,first_seen) VALUES (?,?,?,?,?,?,?,?,?,NOW())')
        ->execute([$nid, $partnerId, $personId, $name, $city, $tags, $notes, $lastStay ?: null, $lastTrip ?: null]);
      return $nid;
    } catch (Throwable $dup) {
      $st = $pdo->prepare('SELECT id FROM partner_customers WHERE partner_id=? AND person_id=? LIMIT 1');
      $st->execute([$partnerId, $personId]);
      $row = $st->fetch();
      return $row ? $row['id'] : null;
    }
  } catch (Throwable $e) {
    return null;
  }
}

function ylt_crm_person_id($pdo, $membershipId, $partnerId) {
  if (!$membershipId || !$partnerId) return '';
  try {
    $st = $pdo->prepare('SELECT person_id FROM partner_customers WHERE id=? AND partner_id=? LIMIT 1');
    $st->execute([$membershipId, $partnerId]);
    return (string)($st->fetch()['person_id'] ?? '');
  } catch (Throwable $e) {
    return '';
  }
}

function ylt_row_write($pdo, $table, $fields) {
  $cols = ylt_table_cols($pdo, $table);
  $use = [];
  foreach ($fields as $k => $v) {
    if (isset($cols[$k])) $use[$k] = $v;
  }
  if (!$use) return false;
  $names = implode(',', array_map(function ($k) { return "`$k`"; }, array_keys($use)));
  $ph = implode(',', array_fill(0, count($use), '?'));
  try {
    $pdo->prepare("INSERT INTO `$table` ($names) VALUES ($ph)")->execute(array_values($use));
    return true;
  } catch (Throwable $e) {
    if (stripos($e->getMessage(), 'unknown column') === false && stripos($e->getMessage(), "doesn't exist") === false) {
      return false;
    }
    if ($table === 'hotels') ylt_ensure_hotel_cols($pdo);
    else ylt_ensure_crm_table($pdo);
    $cols = ylt_table_cols($pdo, $table);
    $use = [];
    foreach ($fields as $k => $v) {
      if (isset($cols[$k])) $use[$k] = $v;
    }
    if (!$use) return false;
    $names = implode(',', array_map(function ($k) { return "`$k`"; }, array_keys($use)));
    $ph = implode(',', array_fill(0, count($use), '?'));
    try {
      $pdo->prepare("INSERT INTO `$table` ($names) VALUES ($ph)")->execute(array_values($use));
      return true;
    } catch (Throwable $e2) {
      return false;
    }
  }
}

function ylt_ensure_schema($pdo) {
  $users = ylt_table_cols($pdo, 'users');
  $offers = ylt_table_cols($pdo, 'offers');
  $erp = ylt_table_cols($pdo, 'erp_buses');
  if (!$users || !$offers || !$erp) ylt_apply_schema_file($pdo);
  ylt_ensure_columns($pdo);
  ylt_seed_catalog($pdo);
}

function ylt_smtp_cmd($fp, $line, $expect = '') {
  fwrite($fp, $line . "\r\n");
  $resp = '';
  while (!feof($fp)) {
    $chunk = fgets($fp, 512);
    if ($chunk === false) break;
    $resp .= $chunk;
    if (isset($chunk[3]) && $chunk[3] === ' ') break;
  }
  if ($expect !== '' && strpos($resp, $expect) !== 0) {
    throw new RuntimeException(trim($resp) ?: 'SMTP rejected');
  }
  return $resp;
}

function ylt_send_smtp($s, $to, $subject, $html, $attachments = []) {
  $host = $s['smtp_host'] ?? '';
  $port = (int)($s['smtp_port'] ?? 465);
  $user = $s['smtp_user'] ?? '';
  $pass = $s['smtp_password'] ?? '';
  $from = $s['smtp_from_email'] ?: $user;
  $fromName = $s['smtp_from_name'] ?: 'YLT Travels';
  $secure = !empty($s['smtp_secure']);
  if (!$host || !$user || !$pass || !$from) throw new RuntimeException('SMTP incomplete');

  $remote = ($secure && $port === 465) ? "ssl://{$host}:{$port}" : "tcp://{$host}:{$port}";
  $fp = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
  if (!$fp) throw new RuntimeException("SMTP connect failed: $errstr");
  stream_set_timeout($fp, 20);
  fgets($fp, 512);
  ylt_smtp_cmd($fp, 'EHLO ylttravels.com');
  if (!$secure || $port === 587) {
    @ylt_smtp_cmd($fp, 'STARTTLS', '220');
    @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
    ylt_smtp_cmd($fp, 'EHLO ylttravels.com');
  }
  ylt_smtp_cmd($fp, 'AUTH LOGIN', '334');
  ylt_smtp_cmd($fp, base64_encode($user), '334');
  ylt_smtp_cmd($fp, base64_encode($pass), '235');
  ylt_smtp_cmd($fp, "MAIL FROM:<{$from}>", '250');
  ylt_smtp_cmd($fp, "RCPT TO:<{$to}>", '250');
  ylt_smtp_cmd($fp, 'DATA', '354');
  $msg = ylt_mime_body($fromName, $from, $to, $subject, $html, $attachments) . "\r\n.";
  ylt_smtp_cmd($fp, $msg, '250');
  ylt_smtp_cmd($fp, 'QUIT');
  fclose($fp);
}

function ylt_mime_body($fromName, $from, $to, $subject, $html, $attachments = []) {
  $safeSub = '=?UTF-8?B?' . base64_encode($subject) . '?=';
  if (!$attachments) {
    return "From: {$fromName} <{$from}>\r\nTo: <{$to}>\r\nSubject: {$safeSub}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n{$html}";
  }
  $b = 'YLT' . bin2hex(random_bytes(8));
  $out = "From: {$fromName} <{$from}>\r\nTo: <{$to}>\r\nSubject: {$safeSub}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\"{$b}\"\r\n\r\n";
  $out .= "--{$b}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n{$html}\r\n";
  foreach ($attachments as $a) {
    $name = preg_replace('/[^A-Za-z0-9._-]/', '_', $a['name'] ?? 'file.pdf');
    $b64 = preg_replace('/\s+/', '', $a['b64'] ?? '');
    $ctype = $a['type'] ?? 'application/pdf';
    $out .= "--{$b}\r\nContent-Type: {$ctype}; name=\"{$name}\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"{$name}\"\r\n\r\n" . chunk_split($b64) . "\r\n";
  }
  $out .= "--{$b}--";
  return $out;
}

function ylt_send_mail($pdo, $to, $subject, $html, $attachments = []) {
  $st = $pdo->query('SELECT * FROM app_settings WHERE id=1');
  $s = $st ? ($st->fetch() ?: []) : [];
  $smtpReady = !empty($s['smtp_host']) && !empty($s['smtp_user']) && !empty($s['smtp_password']);
  if ($smtpReady) {
    try {
      ylt_send_smtp($s, $to, $subject, $html, $attachments);
      return true;
    } catch (Throwable $e) {
      /* fall through to mail() */
    }
  }
  $from = $s['smtp_from_email'] ?? 'noreply@ylttravels.com';
  $fromName = $s['smtp_from_name'] ?? 'YLT Travels';
  $raw = ylt_mime_body($fromName, $from, $to, $subject, $html, $attachments);
  $parts = preg_split("/\r\n\r\n/", $raw, 2);
  $headers = $parts[0] ?? '';
  $body = $parts[1] ?? $html;
  $headers = preg_replace('/^Subject:.*\r\n/m', '', $headers);
  return @mail($to, $subject, $body, $headers);
}

function ylt_fill_template($html, $vars) {
  foreach ($vars as $k => $v) {
    $html = str_replace('{{' . $k . '}}', htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'), $html);
  }
  return $html;
}

function ylt_wallet_email_block() {
  return '<table cellpadding="0" cellspacing="0" style="margin-top:20px"><tr>'
    . '<td style="padding-right:8px"><a href="{{apple_wallet_url}}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;border-radius:10px;padding:12px 16px;font-size:12px;font-weight:700">Add to Apple Wallet</a></td>'
    . '<td><a href="{{google_wallet_url}}" style="display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;border-radius:10px;padding:12px 16px;font-size:12px;font-weight:700">Add to Google Wallet</a></td>'
    . '</tr></table>'
    . '<p style="color:#6b6b75;font-size:12px;margin:12px 0 0;line-height:1.5">iPhone: open the attached <b>.pkpass</b>. Android: open the attached <b>.ics</b> (Calendar / Wallet). PDF is also attached.</p>';
}

function ylt_blast_offer($pdo, $title, $code, $desc) {
  $rows = $pdo->query('SELECT email FROM newsletter_subscribers LIMIT 250')->fetchAll();
  $html = '<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="color:#0b1f3a">YLT Travels offer</h2><p><strong>' . htmlspecialchars($title) . '</strong></p><p>Use code <span style="font-size:22px;font-weight:800;letter-spacing:2px;color:#c9a227">' . htmlspecialchars($code) . '</span></p><p>' . htmlspecialchars($desc) . '</p><p><a href="https://ylttravels.com" style="background:#0b1f3a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Book now</a></p></div>';
  $n = 0;
  foreach ($rows as $r) {
    $email = $r['email'] ?? '';
    if (!str_contains($email, '@')) continue;
    if (ylt_send_mail($pdo, $email, 'YLT offer: ' . $code . ' · ' . $title, $html)) $n++;
  }
  return $n;
}

function ylt_token_payload($c, $email, $name, $id, $type, $role = null, $remember = false, $products = null) {
  $now = time();
  $p = [
    'iss' => $c['jwt_issuer'],
    'sub' => $id,
    'email' => $email,
    'name' => $name,
    'type' => $type,
    'jti' => ylt_uuid(),
    'remember' => $remember ? 1 : 0,
    'iat' => $now,
    'exp' => $now + ylt_token_ttl($c, $type, $remember),
    'idle' => ylt_idle_seconds($c, []),
  ];
  if ($role) $p['role'] = $role;
  if (is_array($products)) {
    $p['bus_enabled'] = !empty($products['bus']) ? 1 : 0;
    $p['hotel_enabled'] = !empty($products['hotel']) ? 1 : 0;
    $p['car_enabled'] = !empty($products['car']) ? 1 : 0;
  }
  return $p;
}

$pdo = ylt_pdo($c);
ylt_ensure_schema($pdo);
