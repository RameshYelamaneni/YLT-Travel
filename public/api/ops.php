<?php
require __DIR__ . '/bootstrap.php';

$p = ylt_body();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$resource = (string)($_GET['resource'] ?? $p['resource'] ?? 'help');

function ylt_ops_tables($pdo) {
  $ddl = [
    "CREATE TABLE IF NOT EXISTS partner_leads (
      id CHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      city VARCHAR(120),
      note TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'new',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX partner_leads_created_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
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
    "CREATE TABLE IF NOT EXISTS erp_operating_cities (
      id CHAR(36) NOT NULL PRIMARY KEY,
      partner_id VARCHAR(64) NOT NULL,
      name VARCHAR(120) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX erp_cities_partner_idx (partner_id)
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
  ylt_add_col($pdo, 'erp_schedules', 'days_of_week', 'days_of_week VARCHAR(80)');
  ylt_add_col($pdo, 'erp_schedules', 'offer_price', 'offer_price DECIMAL(10,2)');
  ylt_add_col($pdo, 'erp_buses', 'bus_type', "bus_type VARCHAR(80) NOT NULL DEFAULT 'AC Seater'");
  ylt_add_col($pdo, 'jobs', 'requirements', 'requirements TEXT');
  ylt_add_col($pdo, 'job_applications', 'resume_path', 'resume_path VARCHAR(500)');
  ylt_add_col($pdo, 'job_applications', 'resume_filename', 'resume_filename VARCHAR(255)');
  ylt_add_col($pdo, 'job_applications', 'id_proof_path', 'id_proof_path VARCHAR(500)');
  ylt_add_col($pdo, 'job_applications', 'id_proof_filename', 'id_proof_filename VARCHAR(255)');
}

function ylt_help_seed($pdo) {
  try {
    $n = (int)$pdo->query('SELECT COUNT(*) FROM help_articles')->fetchColumn();
  } catch (Throwable $e) { return; }
  if ($n > 0) return;
  $rows = [
    ['technical', 'Technical issues', 'Account, tickets, and payment problems', "If checkout fails, retry with the same email so your PNR stays attached. For Razorpay errors, wait two minutes before paying again.\n\nStill stuck? Email care@ylttravels.com with the PNR and a screenshot. YLT Care is staffed 24/7."],
    ['referral', 'Referral help', 'Share YLT with travellers you trust', "Referral credits apply to the next confirmed bus or hotel stay on the same email. Credits are not cash and cannot be transferred.\n\nPartners cannot issue referral codes from this page — use Partner ERP campaigns."],
    ['booking', 'New booking help', 'How to search, seat, and pay', "Search buses or hotels, pick a date, then pay on Razorpay. Your PNR appears under Bookings immediately after a successful payment.\n\nWalk-in stays are posted by hotel partners from Hotel ERP → Availability."],
    ['offers', 'Offers', 'Promo codes and seasonal fares', "Valid codes are listed on Offers. Enter the code at checkout. Expired or partner-only campaigns will not apply on the public site."],
    ['wallet', 'YLT Pay help', 'UPI, cards, and refunds', "We do not keep a stored wallet balance. Refunds return to the original Razorpay method. Hotel check-out can generate a guest rating link from the folio."],
  ];
  $i = 0;
  foreach ($rows as $r) {
    try {
      $pdo->prepare('INSERT INTO help_articles (id,slug,category,title,summary,body,sort_order,is_active) VALUES (?,?,?,?,?,?,?,1)')
        ->execute([ylt_uuid(), $r[0], $r[1], $r[1], $r[2], $r[3], $i++]);
    } catch (Throwable $e) { /* unique */ }
  }
}

ylt_ops_tables($pdo);
ylt_help_seed($pdo);

$auth = ylt_auth_claims($c, $pdo);
$partnerId = '';
$isStaff = $auth && ylt_is_staff_type($auth['type'] ?? '');
if (($auth['type'] ?? '') === 'agent') $partnerId = (string)($auth['sub'] ?? '');
elseif (($auth['type'] ?? '') === 'admin') $partnerId = (string)($_GET['partner_id'] ?? $p['partner_id'] ?? '');

if ($resource === 'partner-leads' && $method === 'POST') {
  $name = trim((string)($p['name'] ?? ''));
  $phone = trim((string)($p['phone'] ?? ''));
  $digits = preg_replace('/\D+/', '', $phone);
  if ($name === '' || strlen($digits) < 10) ylt_fail(400, 'Name and a valid mobile number are required.');
  if (!ylt_throttle($pdo, 'partner_lead:' . ylt_client_ip(), 6, 30)) ylt_fail(429, 'Too many call-back requests. Try again shortly.');
  $id = ylt_uuid();
  $email = strtolower(trim((string)($p['email'] ?? '')));
  $city = trim((string)($p['city'] ?? ''));
  $note = trim((string)($p['note'] ?? ''));
  try {
    $pdo->prepare('INSERT INTO partner_leads (id,name,phone,email,city,note,status) VALUES (?,?,?,?,?,?,?)')
      ->execute([$id, $name, $phone, $email, $city, $note, 'new']);
  } catch (Throwable $e) {
    ylt_fail(500, 'Could not save request.');
  }
  $html = '<p>Call-back request from <strong>' . htmlspecialchars($name) . '</strong></p><p>Mobile: ' . htmlspecialchars($phone) . '</p><p>City: ' . htmlspecialchars($city) . '</p><p>' . nl2br(htmlspecialchars($note)) . '</p>';
  try { ylt_send_mail($pdo, 'care@ylttravels.com', 'YLT partner call-back request', $html); } catch (Throwable $e) { /* optional */ }
  if (str_contains($email, '@')) {
    try { ylt_send_mail($pdo, $email, 'YLT Travels received your call-back request', '<p>Thanks, ' . htmlspecialchars($name) . '. Our onboard team will call you on ' . htmlspecialchars($phone) . '.</p>'); } catch (Throwable $e) { /* optional */ }
  }
  ylt_ok(['ok' => true, 'id' => $id, 'message' => 'Request received. YLT onboard will call you back.']);
}

if ($resource === 'help' && $method === 'GET') {
  $st = $pdo->query('SELECT * FROM help_articles WHERE is_active=1 ORDER BY sort_order, title');
  ylt_ok(['ok' => true, 'articles' => $st ? ($st->fetchAll() ?: []) : []]);
}

if ($resource === 'help' && ($method === 'POST' || $method === 'PUT')) {
  if (!$isStaff || ($auth['type'] ?? '') !== 'admin') ylt_fail(403, 'Admin required to edit YLT Care.');
  $id = $p['id'] ?? ylt_uuid();
  $title = trim((string)($p['title'] ?? ''));
  if ($title === '') ylt_fail(400, 'Title required.');
  $slug = trim((string)($p['slug'] ?? '')) ?: preg_replace('/[^a-z0-9]+/', '-', strtolower($title));
  $exists = $pdo->prepare('SELECT id FROM help_articles WHERE id=?');
  $exists->execute([$id]);
  if ($exists->fetch()) {
    $pdo->prepare('UPDATE help_articles SET slug=?, category=?, title=?, summary=?, body=?, sort_order=?, is_active=? WHERE id=?')
      ->execute([$slug, $p['category'] ?? 'Booking', $title, $p['summary'] ?? '', $p['body'] ?? '', (int)($p['sort_order'] ?? 0), !empty($p['is_active']) ? 1 : 0, $id]);
  } else {
    $pdo->prepare('INSERT INTO help_articles (id,slug,category,title,summary,body,sort_order,is_active) VALUES (?,?,?,?,?,?,?,?)')
      ->execute([$id, $slug, $p['category'] ?? 'Booking', $title, $p['summary'] ?? '', $p['body'] ?? '', (int)($p['sort_order'] ?? 0), 1]);
  }
  ylt_ok(['ok' => true, 'id' => $id]);
}

$authType = (string)($auth['type'] ?? '');
$authRole = strtolower((string)($auth['role'] ?? ''));
$isCompanyAdmin = $isStaff && $authType === 'admin';
$canPostCompanyJobs = $isCompanyAdmin && ($authRole === '' || $authRole === 'admin');
$canReviewCompanyJobs = $isCompanyAdmin;

if ($resource === 'jobs' && $method === 'GET') {
  $mine = (string)($_GET['mine'] ?? '') === '1';
  if ($mine) {
    if (!$canReviewCompanyJobs) ylt_fail(403, 'Only YLT Admin and HR can manage company jobs.');
    $st = $pdo->query("SELECT * FROM jobs WHERE partner_id IS NULL OR partner_id='' ORDER BY created_at DESC");
    ylt_ok(['ok' => true, 'jobs' => $st ? ($st->fetchAll() ?: []) : []]);
  }
  $st = $pdo->query("SELECT id, title, location, department, employment_type, description, requirements, created_at FROM jobs WHERE status='open' AND (partner_id IS NULL OR partner_id='') ORDER BY created_at DESC");
  ylt_ok(['ok' => true, 'jobs' => $st ? ($st->fetchAll() ?: []) : []]);
}

if ($resource === 'jobs' && ($method === 'POST' || $method === 'PUT')) {
  if (!$canPostCompanyJobs) ylt_fail(403, 'Only Admin can post YLT Travels jobs.');
  $id = $p['id'] ?? ylt_uuid();
  $title = trim((string)($p['title'] ?? ''));
  if ($title === '') ylt_fail(400, 'Job title required.');
  $status = strtolower((string)($p['status'] ?? 'open'));
  if (!in_array($status, ['open', 'closed'], true)) $status = 'open';
  $reqText = (string)($p['requirements'] ?? '');
  $exists = $pdo->prepare("SELECT id FROM jobs WHERE id=? AND (partner_id IS NULL OR partner_id='')");
  $exists->execute([$id]);
  $row = $exists->fetch();
  if ($row) {
    $pdo->prepare('UPDATE jobs SET title=?, location=?, department=?, employment_type=?, description=?, requirements=?, status=?, partner_id=NULL WHERE id=?')
      ->execute([$title, $p['location'] ?? '', $p['department'] ?? 'Operations', $p['employment_type'] ?? 'Full-time', $p['description'] ?? '', $reqText, $status, $id]);
  } else {
    $pdo->prepare('INSERT INTO jobs (id,partner_id,posted_by,title,location,department,employment_type,description,requirements,status) VALUES (?,?,?,?,?,?,?,?,?,?)')
      ->execute([$id, null, (string)($auth['sub'] ?? ''), $title, $p['location'] ?? '', $p['department'] ?? 'Operations', $p['employment_type'] ?? 'Full-time', $p['description'] ?? '', $reqText, $status]);
  }
  ylt_ok(['ok' => true, 'id' => $id]);
}

if ($resource === 'apply' && $method === 'POST') {
  $jobId = (string)($p['job_id'] ?? $_POST['job_id'] ?? '');
  $name = trim((string)($p['name'] ?? $_POST['name'] ?? ''));
  $email = trim((string)($p['email'] ?? $_POST['email'] ?? ''));
  if ($jobId === '' || $name === '' || $email === '') ylt_fail(400, 'Name, email, and job are required.');
  if (!ylt_throttle($pdo, 'job_apply:' . ylt_client_ip(), 8, 30)) ylt_fail(429, 'Too many applications. Try again shortly.');
  $open = $pdo->prepare("SELECT id FROM jobs WHERE id=? AND status='open' AND (partner_id IS NULL OR partner_id='')");
  $open->execute([$jobId]);
  if (!$open->fetch()) ylt_fail(404, 'This role is not open.');
  $resume = ylt_careers_bin_from_request($p, 'resume');
  $idProof = ylt_careers_bin_from_request($p, 'id_proof');
  if (!$resume || !$idProof) ylt_fail(400, 'Resume and ID proof are required.');
  $resumeStored = ylt_careers_store_file($jobId, 'resume', $resume['bin'], $resume['name']);
  $idStored = ylt_careers_store_file($jobId, 'id_proof', $idProof['bin'], $idProof['name']);
  $id = ylt_uuid();
  $pdo->prepare('INSERT INTO job_applications (id,job_id,name,email,phone,cover_note,resume_path,resume_filename,id_proof_path,id_proof_filename) VALUES (?,?,?,?,?,?,?,?,?,?)')
    ->execute([
      $id, $jobId, $name, $email,
      $p['phone'] ?? $_POST['phone'] ?? '',
      $p['cover_note'] ?? $p['note'] ?? $_POST['cover_note'] ?? '',
      $resumeStored['path'], $resumeStored['filename'],
      $idStored['path'], $idStored['filename'],
    ]);
  ylt_ok(['ok' => true, 'id' => $id], 201);
}

if ($resource === 'application-file' && $method === 'GET') {
  if (!$canReviewCompanyJobs) ylt_fail(403, 'Only YLT Admin and HR can view application files.');
  $id = trim((string)($_GET['id'] ?? $p['id'] ?? ''));
  $kind = strtolower(trim((string)($_GET['kind'] ?? $p['kind'] ?? 'resume')));
  if ($id === '' || !in_array($kind, ['resume', 'id_proof'], true)) ylt_fail(400, 'Application and file kind required.');
  $st = $pdo->prepare("SELECT a.* FROM job_applications a INNER JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND (j.partner_id IS NULL OR j.partner_id='') LIMIT 1");
  $st->execute([$id]);
  $row = $st->fetch();
  if (!$row) ylt_fail(404, 'Application not found.');
  $stored = $kind === 'id_proof' ? (string)($row['id_proof_path'] ?? '') : (string)($row['resume_path'] ?? '');
  $orig = $kind === 'id_proof' ? (string)($row['id_proof_filename'] ?? 'id-proof') : (string)($row['resume_filename'] ?? 'resume');
  $abs = ylt_careers_abs_path($stored);
  if ($abs === '') ylt_fail(404, 'File not found.');
  $download = (string)($_GET['download'] ?? '') !== '';
  ylt_careers_send_file($abs, $orig, $download);
}

if ($resource === 'applications' && $method === 'GET') {
  if (!$canReviewCompanyJobs) ylt_fail(403, 'Only YLT Admin and HR can view applications.');
  $jobId = trim((string)($_GET['job_id'] ?? $p['job_id'] ?? ''));
  $sql = "SELECT a.*, j.title AS job_title FROM job_applications a INNER JOIN jobs j ON j.id=a.job_id WHERE (j.partner_id IS NULL OR j.partner_id='')";
  if ($jobId !== '') {
    $st = $pdo->prepare($sql . ' AND a.job_id=? ORDER BY a.created_at DESC LIMIT 200');
    $st->execute([$jobId]);
  } else {
    $st = $pdo->query($sql . ' ORDER BY a.created_at DESC LIMIT 200');
  }
  ylt_ok(['ok' => true, 'applications' => $st ? ($st->fetchAll() ?: []) : []]);
}

if ($resource === 'inventory' && $method === 'GET') {
  if (!$isStaff) ylt_fail(401, 'Sign in as a partner.');
  if ($partnerId === '') ylt_fail(401, 'Partner session required.');
  $date = substr((string)($_GET['date'] ?? date('Y-m-d')), 0, 10);
  $channels = ['office' => 0, 'agent' => 0, 'api' => 0, 'website' => 0];
  $revenue = 0.0;
  $bookedSeats = 0;
  try {
    $st = $pdo->prepare("SELECT channel, seats, total_amount, status FROM bookings WHERE partner_id=? AND LEFT(travel_date,10)=? AND status<>'cancelled'");
    $st->execute([$partnerId, $date]);
    foreach ($st->fetchAll() ?: [] as $b) {
      $ch = strtolower((string)($b['channel'] ?? 'website'));
      if (!isset($channels[$ch])) $ch = 'website';
      $seats = $b['seats'];
      $n = 1;
      if (is_string($seats)) {
        $d = json_decode($seats, true);
        $n = is_array($d) ? max(1, count($d)) : 1;
      } elseif (is_array($seats)) $n = max(1, count($seats));
      $channels[$ch] += $n;
      $bookedSeats += $n;
      $revenue += (float)($b['total_amount'] ?? 0);
    }
  } catch (Throwable $e) { /* bookings */ }
  $blocked = 0;
  $available = 0;
  try {
    $st = $pdo->prepare('SELECT status, COUNT(*) c FROM erp_seat_inventory WHERE partner_id=? AND travel_date=? GROUP BY status');
    $st->execute([$partnerId, $date]);
    foreach ($st->fetchAll() ?: [] as $r) {
      if (($r['status'] ?? '') === 'blocked') $blocked = (int)$r['c'];
      if (($r['status'] ?? '') === 'available') $available = (int)$r['c'];
    }
  } catch (Throwable $e) { /* inventory */ }
  $recent = [];
  try {
    $st = $pdo->prepare('SELECT pnr, from_city, to_city, status, created_at, channel FROM bookings WHERE partner_id=? ORDER BY created_at DESC LIMIT 8');
    $st->execute([$partnerId]);
    $recent = $st->fetchAll() ?: [];
  } catch (Throwable $e) { $recent = []; }
  ylt_ok([
    'ok' => true,
    'date' => $date,
    'booked' => $bookedSeats,
    'blocked' => $blocked,
    'quota' => $available,
    'revenue' => $revenue,
    'mix' => $channels,
    'recent' => $recent,
  ]);
}

if ($resource === 'policies' && $method === 'GET') {
  if (!$isStaff || !$partnerId) ylt_fail(401, 'Sign in as a partner.');
  $st = $pdo->prepare('SELECT * FROM erp_cancel_policies WHERE partner_id=? ORDER BY created_at DESC');
  $st->execute([$partnerId]);
  ylt_ok(['ok' => true, 'policies' => $st->fetchAll() ?: []]);
}

if ($resource === 'policies' && $method === 'POST') {
  if (!$isStaff || !$partnerId) ylt_fail(401, 'Sign in as a partner.');
  $id = $p['id'] ?? ylt_uuid();
  $name = trim((string)($p['name'] ?? ''));
  if ($name === '') ylt_fail(400, 'Policy name required.');
  $exists = $pdo->prepare('SELECT id FROM erp_cancel_policies WHERE id=? AND partner_id=?');
  $exists->execute([$id, $partnerId]);
  if ($exists->fetch()) {
    $pdo->prepare('UPDATE erp_cancel_policies SET name=?, hours_before=?, refund_pct=?, body=?, status=? WHERE id=? AND partner_id=?')
      ->execute([$name, (int)($p['hours_before'] ?? 6), (float)($p['refund_pct'] ?? 80), $p['body'] ?? '', $p['status'] ?? 'active', $id, $partnerId]);
  } else {
    $pdo->prepare('INSERT INTO erp_cancel_policies (id,partner_id,name,hours_before,refund_pct,body,status) VALUES (?,?,?,?,?,?,?)')
      ->execute([$id, $partnerId, $name, (int)($p['hours_before'] ?? 6), (float)($p['refund_pct'] ?? 80), $p['body'] ?? '', $p['status'] ?? 'active']);
  }
  ylt_ok(['ok' => true, 'id' => $id]);
}

if ($resource === 'campaigns' && $method === 'GET') {
  if (!$isStaff || !$partnerId) ylt_fail(401, 'Sign in as a partner.');
  $st = $pdo->prepare('SELECT * FROM partner_campaigns WHERE partner_id=? ORDER BY created_at DESC');
  $st->execute([$partnerId]);
  ylt_ok(['ok' => true, 'campaigns' => $st->fetchAll() ?: []]);
}

if ($resource === 'campaigns' && $method === 'POST') {
  if (!$isStaff || !$partnerId) ylt_fail(401, 'Sign in as a partner.');
  $id = $p['id'] ?? ylt_uuid();
  $title = trim((string)($p['title'] ?? ''));
  if ($title === '') ylt_fail(400, 'Campaign title required.');
  $exists = $pdo->prepare('SELECT id FROM partner_campaigns WHERE id=? AND partner_id=?');
  $exists->execute([$id, $partnerId]);
  if ($exists->fetch()) {
    $pdo->prepare('UPDATE partner_campaigns SET title=?, body=?, status=? WHERE id=? AND partner_id=?')
      ->execute([$title, $p['body'] ?? '', $p['status'] ?? 'active', $id, $partnerId]);
  } else {
    $pdo->prepare('INSERT INTO partner_campaigns (id,partner_id,title,body,status) VALUES (?,?,?,?,?)')
      ->execute([$id, $partnerId, $title, $p['body'] ?? '', $p['status'] ?? 'active']);
  }
  ylt_ok(['ok' => true, 'id' => $id]);
}

if ($resource === 'cities' && $method === 'GET') {
  if (!$isStaff || $partnerId === '') ylt_fail(401, 'Partner session required.');
  $st = $pdo->prepare('SELECT * FROM erp_operating_cities WHERE partner_id=? ORDER BY name');
  $st->execute([$partnerId]);
  ylt_ok(['ok' => true, 'cities' => $st->fetchAll() ?: []]);
}

if ($resource === 'cities' && ($method === 'POST' || $method === 'PUT')) {
  if (!$isStaff || $partnerId === '') ylt_fail(401, 'Partner session required.');
  $id = $p['id'] ?? ylt_uuid();
  $name = trim((string)($p['name'] ?? ''));
  if ($name === '') ylt_fail(400, 'City name required.');
  $exists = $pdo->prepare('SELECT id FROM erp_operating_cities WHERE id=? AND partner_id=?');
  $exists->execute([$id, $partnerId]);
  if ($exists->fetch()) {
    $pdo->prepare('UPDATE erp_operating_cities SET name=?, status=? WHERE id=? AND partner_id=?')
      ->execute([$name, $p['status'] ?? 'active', $id, $partnerId]);
  } else {
    $dup = $pdo->prepare('SELECT id FROM erp_operating_cities WHERE partner_id=? AND name=?');
    $dup->execute([$partnerId, $name]);
    $row = $dup->fetch();
    if ($row) ylt_ok(['ok' => true, 'id' => $row['id']]);
    $pdo->prepare('INSERT INTO erp_operating_cities (id,partner_id,name,status) VALUES (?,?,?,?)')
      ->execute([$id, $partnerId, $name, $p['status'] ?? 'active']);
  }
  ylt_ok(['ok' => true, 'id' => $id]);
}

if ($resource === 'cities' && $method === 'DELETE') {
  if (!$isStaff || $partnerId === '') ylt_fail(401, 'Partner session required.');
  $id = (string)($_GET['id'] ?? $p['id'] ?? '');
  if ($id === '') ylt_fail(400, 'City id required.');
  $pdo->prepare('DELETE FROM erp_operating_cities WHERE id=? AND partner_id=?')->execute([$id, $partnerId]);
  ylt_ok(['ok' => true]);
}

ylt_fail(400, 'Unknown ops request.');
