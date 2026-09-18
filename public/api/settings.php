<?php
require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$p = ylt_body();
$uri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($uri, PHP_URL_PATH) ?: '';
$rest = $_GET['rest'] ?? '';

$isDirectors = str_contains($path, 'directors') || $rest === 'directors';
$isTemplates = str_contains($path, 'email-templates') || str_contains($rest, 'email-templates');
$isFiles = str_contains($path, 'employees/files') || str_contains($rest, 'employees/files');
$isTestEmail = str_contains($path, 'test-email') || str_contains($rest, 'test-email');
$isHealth = str_contains($path, 'health') || $rest === 'health';

if ($isHealth) {
  ylt_ok(['ok' => true, 'api' => 'ylt-php']);
}

if ($isTestEmail && $method === 'POST') {
  ylt_require_admin($c, $pdo);
  $st = $pdo->query('SELECT * FROM app_settings WHERE id=1');
  $s = $st ? ($st->fetch() ?: []) : [];
  $to = trim((string)($p['to'] ?? $s['smtp_user'] ?? ''));
  if (!str_contains($to, '@')) ylt_fail(400, 'Enter a destination email.');
  $ok = ylt_send_mail($pdo, $to, 'YLT Travels SMTP test', '<p>Your YLT Travels SMTP settings work.</p>');
  if (!$ok) ylt_fail(500, 'Could not send test email. Check SMTP in Admin → Email.');
  ylt_ok(['ok' => true]);
}

if ($isDirectors) {
  if ($method === 'GET') {
    $dcols = ylt_table_cols($pdo, 'directors');
    $order = !empty($dcols['order_index']) ? 'order_index ASC, created_at DESC' : 'created_at DESC';
    ylt_ok($pdo->query("SELECT * FROM directors ORDER BY {$order}")->fetchAll());
  }
  ylt_require_admin($c, $pdo);
  if ($method === 'POST') {
    $id = $p['id'] ?? ylt_uuid();
    $name = $p['full_name'] ?? $p['name'] ?? '';
    $title = $p['title'] ?? $p['role'] ?? '';
    $exists = $pdo->prepare('SELECT id FROM directors WHERE id=?');
    $exists->execute([$id]);
    $cols = ylt_table_cols($pdo, 'directors');
    if ($exists->fetch()) {
      $sql = 'UPDATE directors SET full_name=?, title=?, bio=?, image_url=?';
      $vals = [$name, $title, $p['bio'] ?? '', $p['image_url'] ?? ''];
      if (isset($cols['linkedin_url'])) { $sql .= ', linkedin_url=?'; $vals[] = $p['linkedin_url'] ?? ''; }
      if (isset($cols['order_index'])) { $sql .= ', order_index=?'; $vals[] = (int)($p['order_index'] ?? 0); }
      $sql .= ' WHERE id=?';
      $vals[] = $id;
      $pdo->prepare($sql)->execute($vals);
    } else {
      $pdo->prepare('INSERT INTO directors (id, full_name, title, bio, image_url) VALUES (?,?,?,?,?)')
        ->execute([$id, $name, $title, $p['bio'] ?? '', $p['image_url'] ?? '']);
      if (isset($cols['linkedin_url']) || isset($cols['order_index'])) {
        $pdo->prepare('UPDATE directors SET linkedin_url=?, order_index=? WHERE id=?')
          ->execute([$p['linkedin_url'] ?? '', (int)($p['order_index'] ?? 0), $id]);
      }
    }
    ylt_ok(['ok' => true, 'id' => $id]);
  }
  if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) ylt_fail(400, 'id required');
    $pdo->prepare('DELETE FROM directors WHERE id=?')->execute([$id]);
    ylt_ok(['ok' => true]);
  }
}

if ($isTemplates) {
  ylt_require_admin($c, $pdo);
  try {
    if ($method === 'GET') {
      ylt_ok($pdo->query('SELECT * FROM email_templates ORDER BY name')->fetchAll());
    }
    if ($method === 'POST' || $method === 'PUT') {
      if (empty($p['id'])) ylt_fail(400, 'id required');
      $html = (string)($p['body_html'] ?? '');
      if (!empty($p['body_b64'])) {
        $bin = base64_decode(preg_replace('/\s+/', '', (string)$p['body_b64']), true);
        if ($bin !== false) $html = $bin;
      }
      $pdo->prepare('UPDATE email_templates SET subject=?, body_html=?, is_active=? WHERE id=?')
        ->execute([$p['subject'] ?? '', $html, !empty($p['is_active']) ? 1 : 0, $p['id']]);
      ylt_ok(['ok' => true]);
    }
  } catch (Throwable $e) {
    ylt_fail(500, 'Template save failed.');
  }
}

if ($isFiles) {
  $auth = ylt_require_admin($c, $pdo);
  if (str_contains($path . $rest, 'folders') && $method === 'GET') {
    try {
      $rows = $pdo->query('SELECT folder, COUNT(*) AS n, COALESCE(SUM(size_bytes),0) AS size FROM employee_files GROUP BY folder')->fetchAll();
    } catch (Throwable $e) {
      $rows = [];
    }
    $folders = array_map(function ($r) {
      return ['folder' => $r['folder'], 'count' => (int)$r['n'], 'size' => (int)$r['size']];
    }, $rows ?: []);
    ylt_ok(['ok' => true, 'folders' => $folders]);
  }
  $id = $_GET['id'] ?? '';
  if (!$id && preg_match('#files/([^/?]+)#', $path . '/' . $rest, $m)) $id = $m[1];
  if ($method === 'GET' && $id) {
    $st = $pdo->prepare('SELECT * FROM employee_files WHERE id=?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) ylt_fail(404, 'File not found.');
    ylt_ok($row);
  }
  if ($method === 'GET') {
    $folder = trim((string)($_GET['folder'] ?? ''));
    if ($folder) {
      $st = $pdo->prepare('SELECT id, uploaded_by_email, uploaded_by_name, filename, mime_type, size_bytes, folder, description, created_at FROM employee_files WHERE folder=? ORDER BY created_at DESC');
      $st->execute([$folder]);
      $rows = $st->fetchAll();
    } else {
      $rows = $pdo->query('SELECT id, uploaded_by_email, uploaded_by_name, filename, mime_type, size_bytes, folder, description, created_at FROM employee_files ORDER BY created_at DESC')->fetchAll();
    }
    ylt_ok(['ok' => true, 'files' => $rows ?: []]);
  }
  if ($method === 'POST') {
    $id = ylt_uuid();
    $pdo->prepare('INSERT INTO employee_files (id, uploaded_by_email, uploaded_by_name, filename, mime_type, size_bytes, folder, description, file_data) VALUES (?,?,?,?,?,?,?,?,?)')
      ->execute([
        $id, $auth['email'] ?? '', $auth['name'] ?? '',
        $p['filename'] ?? 'file', $p['mime_type'] ?? 'application/octet-stream',
        (int)($p['size_bytes'] ?? 0), $p['folder'] ?? 'General', $p['description'] ?? '',
        $p['file_data'] ?? '',
      ]);
    ylt_ok(['ok' => true, 'id' => $id], 201);
  }
  if ($method === 'DELETE' && $id) {
    $pdo->prepare('DELETE FROM employee_files WHERE id=?')->execute([$id]);
    ylt_ok(['ok' => true]);
  }
}

function ylt_public_settings($pdo) {
  $st = $pdo->query('SELECT * FROM app_settings WHERE id=1');
  $row = $st ? ($st->fetch() ?: []) : [];
  $smtpSet = !empty($row['smtp_password']);
  $rzpSet = !empty($row['razorpay_secret']);
  unset($row['smtp_password'], $row['razorpay_secret'], $row['bitla_api_key']);
  $row['ok'] = true;
  $row['smtp_password_set'] = $smtpSet;
  $row['razorpay_secret_set'] = $rzpSet;
  if (empty($row['inventory_provider'])) $row['inventory_provider'] = 'ylt_db';
  if (!isset($row['bitla_api_url'])) $row['bitla_api_url'] = '';
  if (!isset($row['bitla_operator_id'])) $row['bitla_operator_id'] = '';
  $row['bitla_api_key'] = '';
  return $row;
}

if ($method === 'GET') {
  ylt_ok(ylt_public_settings($pdo));
}

if ($method === 'POST' || $method === 'PUT') {
  ylt_require_admin($c, $pdo);
  $fields = [
    'upi_id','upi_name','upi_qr_url','bank_name','account_name','account_number','ifsc','branch',
    'whatsapp_number','support_email','fare_tax_percent','smtp_host','smtp_port','smtp_user',
    'smtp_password','smtp_from_email','smtp_from_name','smtp_secure','email_enabled',
    'razorpay_key_id','razorpay_secret','payment_provider','payments_enabled',
    'inventory_provider','bitla_api_url','bitla_api_key','bitla_operator_id',
  ];
  $sets = [];
  $vals = [];
  foreach ($fields as $f) {
    if (!array_key_exists($f, $p)) continue;
    $v = $p[$f];
    if ($f === 'smtp_password' && ($v === '' || $v === '********')) continue;
    if ($f === 'razorpay_secret' && ($v === '' || $v === '********')) continue;
    if ($f === 'bitla_api_key' && ($v === '' || $v === '********')) continue;
    $sets[] = "`$f`=?";
    if ($f === 'smtp_secure' || $f === 'email_enabled' || $f === 'payments_enabled') $v = $v ? 1 : 0;
    $vals[] = $v;
  }
  if ($sets) {
    $cols = ylt_table_cols($pdo, 'app_settings');
    $useSets = [];
    $useVals = [];
    foreach ($sets as $i => $s) {
      if (preg_match('/`([a-z0-9_]+)`/i', $s, $m) && empty($cols[$m[1]])) continue;
      $useSets[] = $s;
      $useVals[] = $vals[$i];
    }
    if ($useSets) {
      $pdo->prepare('UPDATE app_settings SET ' . implode(',', $useSets) . ' WHERE id=1')->execute($useVals);
    }
  }
  ylt_ok(ylt_public_settings($pdo));
}

ylt_fail(405, 'Method not allowed.');
