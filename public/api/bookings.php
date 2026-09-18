<?php
require __DIR__ . '/bootstrap.php';

$p = ylt_body();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($uri, PHP_URL_PATH) ?: '';
$resource = (string)($_GET['resource'] ?? '');

$isHotels = str_contains($path, '/hotels') || $resource === 'hotels';
$isBuses = str_contains($path, '/buses') || $resource === 'buses';
$isHotelBookings = str_contains($path, 'hotel-bookings') || $resource === 'hotel-bookings' || ($p['type'] ?? '') === 'hotel' || !empty($p['hotel_name']);
$isNewsletter = str_contains($path, 'newsletter') || $resource === 'newsletter';
$isPayCreate = str_contains($path, 'create-order') || $resource === 'create-order';
$isPayVerify = (str_contains($path, '/verify') || $resource === 'verify') && !$isHotelBookings;

if ($isPayCreate && $method === 'POST') {
  $st = $pdo->query('SELECT razorpay_key_id, razorpay_secret FROM app_settings WHERE id=1');
  $s = $st ? ($st->fetch() ?: []) : [];
  $key = $s['razorpay_key_id'] ?? '';
  $secret = $s['razorpay_secret'] ?? '';
  $amount = (int) round(((float)($p['amount'] ?? 0)) * 100);
  if ($key && $secret && $amount > 0 && function_exists('curl_init')) {
    $ch = curl_init('https://api.razorpay.com/v1/orders');
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST => true,
      CURLOPT_USERPWD => $key . ':' . $secret,
      CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
      CURLOPT_POSTFIELDS => json_encode(['amount' => $amount, 'currency' => 'INR', 'receipt' => $p['receipt'] ?? ('ylt_' . time())]),
      CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $order = json_decode($raw ?: '', true) ?: [];
    if ($code >= 200 && $code < 300 && !empty($order['id'])) {
      ylt_ok(['success' => true, 'key_id' => $key, 'order' => $order]);
    }
  }
  ylt_ok(['success' => true, 'key_id' => $key, 'order' => null]);
}

if ($isPayVerify && $method === 'POST') {
  $oid = (string)($p['razorpay_order_id'] ?? '');
  $pid = (string)($p['razorpay_payment_id'] ?? '');
  $sig = (string)($p['razorpay_signature'] ?? '');
  if (!ylt_razorpay_valid($pdo, $oid, $pid, $sig)) ylt_fail(400, 'Payment verification failed.');
  ylt_ok(['success' => true]);
}

if ($isNewsletter && $method === 'POST') {
  $email = strtolower(trim((string)($p['email'] ?? '')));
  if (!str_contains($email, '@')) ylt_fail(400, 'Valid email required.');
  $id = ylt_uuid();
  try {
    $pdo->prepare('INSERT INTO newsletter_subscribers (id, email, name, source) VALUES (?,?,?,?)')
      ->execute([$id, $email, $p['name'] ?? '', $p['source'] ?? 'footer']);
  } catch (Throwable $e) {
    /* already subscribed */
  }
  ylt_ok(['ok' => true]);
}

function ylt_json_list($v) {
  if (is_array($v)) return $v;
  if (is_string($v) && $v !== '') {
    $d = json_decode($v, true);
    if (is_array($d)) return $d;
  }
  return [];
}

function ylt_partner_owned_hotel($row) {
  if (!$row) return false;
  $pid = trim((string)($row['partner_id'] ?? ''));
  if ($pid === '') return false;
  if (isset($row['is_active']) && (int)$row['is_active'] === 0) return false;
  if (isset($row['status']) && strtolower((string)$row['status']) === 'inactive') return false;
  return true;
}

function ylt_stop_list($raw, $fallbackCity, $startTime) {
  $items = ylt_json_list($raw);
  $out = [];
  $i = 0;
  foreach ($items as $item) {
    if (is_array($item)) {
      $name = trim((string)($item['name'] ?? $item['stop'] ?? ''));
      $time = (string)($item['time'] ?? '');
    } else {
      $name = trim((string)$item);
      $time = '';
    }
    if ($name === '') continue;
    $out[] = ['name' => $name, 'time' => $time];
    $i++;
  }
  if (!$out && $fallbackCity !== '') $out[] = ['name' => $fallbackCity, 'time' => $startTime];
  return $out;
}

function ylt_layout_seats($total, $price, $sleeper) {
  $n = max(8, min(72, (int)$total ?: 36));
  $seats = [];
  $lower = $sleeper ? (int)ceil($n / 2) : $n;
  for ($i = 1; $i <= $lower; $i++) {
    $label = $sleeper ? ('L' . $i) : (string)$i;
    $seats[] = [
      'id' => $label,
      'label' => $label,
      'type' => $sleeper ? 'sleeper-lower' : 'seater',
      'price' => (float)$price,
      'is_booked' => false,
      'deck' => 'lower',
      'is_ladies' => $i <= 4,
      'is_window' => $i % 4 === 1 || $i % 4 === 0,
      'is_single' => $i % 5 === 0,
    ];
  }
  if ($sleeper) {
    $upper = $n - $lower;
    for ($i = 1; $i <= $upper; $i++) {
      $label = 'U' . $i;
      $seats[] = [
        'id' => $label,
        'label' => $label,
        'type' => 'sleeper-upper',
        'price' => (float)$price,
        'is_booked' => false,
        'deck' => 'upper',
        'is_ladies' => $i <= 2,
        'is_window' => $i % 2 === 0,
        'is_single' => $i % 4 === 0,
      ];
    }
  }
  return $seats;
}

function ylt_trip_seats($pdo, $busId, $date, $total, $price, $sleeper) {
  $rows = [];
  try {
    $st = $pdo->prepare('SELECT seat_number, status FROM erp_seat_inventory WHERE bus_id=? AND travel_date=?');
    $st->execute([$busId, $date]);
    $rows = $st->fetchAll() ?: [];
  } catch (Throwable $e) { $rows = []; }
  if (!$rows) return ylt_layout_seats($total, $price, $sleeper);
  $seats = [];
  foreach ($rows as $r) {
    $label = (string)($r['seat_number'] ?? '');
    if ($label === '') continue;
    $stt = strtolower((string)($r['status'] ?? 'available'));
    $upper = str_starts_with(strtoupper($label), 'U');
    $seats[] = [
      'id' => $label,
      'label' => $label,
      'type' => $upper ? 'sleeper-upper' : ($sleeper ? 'sleeper-lower' : 'seater'),
      'price' => (float)$price,
      'is_booked' => in_array($stt, ['booked', 'locked', 'blocked', 'sold'], true),
      'deck' => $upper ? 'upper' : 'lower',
      'is_ladies' => false,
      'is_window' => false,
      'is_single' => false,
    ];
  }
  return $seats ?: ylt_layout_seats($total, $price, $sleeper);
}

function ylt_map_public_trip($pdo, $row) {
  $from = (string)($row['from_city'] ?? '');
  $to = (string)($row['to_city'] ?? '');
  $date = (string)($row['departure_date'] ?? '');
  $dep = (string)($row['departure_time'] ?? '18:00');
  $arr = (string)($row['arrival_time'] ?? '');
  $dur = (int)($row['duration_mins'] ?? 0);
  $layout = strtolower((string)($row['layout'] ?? $row['bus_name'] ?? ''));
  $sleeper = str_contains($layout, 'sleeper');
  $ac = !str_contains($layout, 'non') && (str_contains($layout, 'ac') || str_contains($layout, 'a/c') || str_contains($layout, 'volvo') || $sleeper);
  $volvo = str_contains($layout, 'volvo');
  $total = (int)($row['total_seats'] ?? 36) ?: 36;
  $fare = (float)($row['base_fare'] ?? 0);
  $amenities = ylt_json_list($row['amenities'] ?? []);
  $amenities = array_values(array_filter(array_map(function ($a) {
    return is_string($a) ? $a : (string)($a['name'] ?? '');
  }, $amenities)));
  $seats = ylt_trip_seats($pdo, (string)($row['bus_id'] ?? ''), $date, $total, $fare, $sleeper);
  $available = 0;
  foreach ($seats as $s) { if (empty($s['is_booked'])) $available++; }
  $operator = trim((string)($row['agency_name'] ?? $row['partner_name'] ?? $row['bus_name'] ?? 'YLT Travels'));
  if ($operator === '') $operator = 'YLT Travels';
  $stops = ylt_json_list($row['stops'] ?? []);
  $via = [];
  foreach ($stops as $st) {
    $via[] = is_array($st) ? (string)($st['name'] ?? $st['stop'] ?? '') : (string)$st;
  }
  $via = array_values(array_filter($via));
  return [
    'id' => (string)($row['schedule_id'] ?? $row['id'] ?? ''),
    'fleet_bus_id' => (string)($row['bus_id'] ?? ''),
    'operator' => $operator,
    'bus_type' => (string)($row['layout'] ?? $row['bus_name'] ?? 'YLT Coach'),
    'service_number' => (string)($row['registration_number'] ?? $row['route_name'] ?? ''),
    'departure_time' => $dep,
    'arrival_time' => $arr,
    'duration_mins' => $dur,
    'price' => $fare,
    'original_price' => $fare,
    'rating' => 4.2,
    'reviews' => 0,
    'is_ac' => $ac,
    'is_sleeper' => $sleeper,
    'is_volvo' => $volvo,
    'live_tracking' => strtolower((string)($row['gps_status'] ?? '')) === 'online',
    'sla_verified' => true,
    'women_safety' => true,
    'amenities' => $amenities,
    'from' => $from,
    'to' => $to,
    'date' => $date,
    'via' => $via,
    'seats_total' => $total,
    'seats_available' => $available,
    'single_seats' => (int)floor($available * 0.15),
    'ladies_seats' => min(4, $available),
    'window_seats' => (int)floor($available * 0.4),
    'boarding_points' => ylt_stop_list($row['stops'] ?? [], $from, $dep),
    'dropping_points' => [['name' => $to, 'time' => $arr]],
    'cancellation' => 'partial',
    'rest_stop_rating' => 4,
    'delay_mins' => 0,
    'co2_kg' => 16,
    'hotel_bundle_saving' => 0,
    'punctuality' => 90,
    'meals' => in_array('Snacks', $amenities, true) || in_array('Meals', $amenities, true),
    'accessible' => false,
    'night_crew' => true,
    'delay_guarantee' => false,
    'prime' => false,
    'insurance_available' => true,
    'smart_score' => 80,
    'seats' => $seats,
    'photo_url' => ylt_public_image_url($row['photo_url'] ?? ''),
  ];
}

function ylt_hotel_row($row) {
  if (!$row) return $row;
  foreach (['amenities', 'gallery_urls'] as $k) {
    if (!isset($row[$k])) continue;
    if (is_string($row[$k])) {
      $decoded = json_decode($row[$k], true);
      if (is_array($decoded)) $row[$k] = $decoded;
    }
  }
  if (!empty($row['image_url'])) $row['image_url'] = ylt_public_image_url($row['image_url']);
  if (!empty($row['gallery_urls']) && is_array($row['gallery_urls'])) {
    $row['gallery_urls'] = ylt_public_image_list($row['gallery_urls']);
  }
  return $row;
}

function ylt_attach_hotel_rooms($pdo, $rows) {
  if (!$rows) return $rows;
  $ids = [];
  foreach ($rows as $r) {
    if (!empty($r['id'])) $ids[] = $r['id'];
  }
  if (!$ids) return $rows;
  $roomsBy = [];
  try {
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $st = $pdo->prepare("SELECT * FROM hotel_rooms WHERE hotel_id IN ($ph) ORDER BY room_number");
    $st->execute(array_values($ids));
    foreach ($st->fetchAll() ?: [] as $room) {
      $hid = (string)($room['hotel_id'] ?? '');
      if ($hid === '') continue;
      $roomsBy[$hid][] = $room;
    }
  } catch (Throwable $e) { $roomsBy = []; }
  foreach ($rows as &$row) {
    $row['rooms'] = $roomsBy[(string)($row['id'] ?? '')] ?? [];
    $row = ylt_hotel_row($row);
  }
  unset($row);
  return $rows;
}

function ylt_map_bus_booking($b) {
  return array_merge($b, [
    'feedback_token' => $b['feedback_token'] ?? null,
    'feedback_status' => $b['feedback_status'] ?? null,
    'type' => 'bus',
    'route' => trim(($b['from_city'] ?? '') . ' → ' . ($b['to_city'] ?? ''), " →"),
    'date' => $b['travel_date'] ?? '',
    'total' => (float)($b['total_amount'] ?? 0),
  ]);
}

function ylt_map_hotel_booking($hb) {
  return [
    'id' => $hb['id'] ?? null,
    'pnr' => $hb['pnr'],
    'type' => 'hotel',
    'operator' => $hb['hotel_name'],
    'from_city' => $hb['city'] ?? '',
    'to_city' => $hb['hotel_name'] ?? '',
    'route' => $hb['city'] ?? '',
    'travel_date' => $hb['check_in'] ?? '',
    'date' => $hb['check_in'] ?? '',
    'departure_time' => 'Check-in',
    'seats' => $hb['room_type'] ?? '',
    'total_amount' => (float)($hb['total_amount'] ?? 0),
    'total' => (float)($hb['total_amount'] ?? 0),
    'created_at' => $hb['created_at'] ?? null,
    'feedback_token' => $hb['feedback_token'] ?? null,
    'feedback_status' => $hb['feedback_status'] ?? null,
    'status' => $hb['status'] ?? 'confirmed',
  ];
}

if ($isHotels) {
  ylt_ensure_hotel_cols($pdo);
  ylt_ensure_sample_hotels($pdo);
  $cols = ylt_table_cols($pdo, 'hotels');
  if ($method === 'GET' && !empty($_GET['id'])) {
    $st = $pdo->prepare('SELECT * FROM hotels WHERE id=? LIMIT 1');
    $st->execute([$_GET['id']]);
    $row = $st->fetch();
    $ok = $row && (ylt_partner_owned_hotel($row) || (ylt_is_sample_hotel_id($row['id'] ?? '') && (int)($row['is_active'] ?? 1) !== 0));
    if (!$ok) ylt_fail(404, 'Hotel not found.');
    $withRooms = ylt_attach_hotel_rooms($pdo, [$row]);
    ylt_ok($withRooms[0]);
  }
  /* Public list: live partner properties + restored catalog seeds. Partner rows never replaced. */
  $sampleIds = ylt_sample_hotel_ids();
  $samplePh = implode(',', array_fill(0, count($sampleIds), '?'));
  $partnerBits = ["IFNULL(partner_id,'') <> ''"];
  if (isset($cols['is_active'])) $partnerBits[] = 'IFNULL(is_active,1)=1';
  if (isset($cols['status'])) $partnerBits[] = "IFNULL(status,'active') <> 'inactive'";
  $catalogBits = ["id IN ($samplePh)", "IFNULL(partner_id,'') = ''"];
  if (isset($cols['is_active'])) $catalogBits[] = 'IFNULL(is_active,1)=1';
  $sql = 'SELECT * FROM hotels WHERE ((' . implode(' AND ', $partnerBits) . ') OR (' . implode(' AND ', $catalogBits) . '))';
  $args = $sampleIds;
  if (!empty($_GET['city']) && $_GET['city'] !== 'all') {
    $sql .= ' AND city LIKE ?';
    $args[] = '%' . trim((string)$_GET['city']) . '%';
  }
  $sql .= isset($cols['created_at']) ? ' ORDER BY created_at DESC' : '';
  $st = $pdo->prepare($sql);
  $st->execute($args);
  $rows = ylt_attach_hotel_rooms($pdo, $st->fetchAll() ?: []);
  ylt_ok(['ok' => true, 'hotels' => $rows]);
}

if ($isBuses) {
  ylt_ensure_columns($pdo);
  $from = trim((string)($_GET['from'] ?? $_GET['from_city'] ?? ''));
  $to = trim((string)($_GET['to'] ?? $_GET['to_city'] ?? ''));
  $date = trim((string)($_GET['date'] ?? $_GET['travel_date'] ?? ''));
  $id = trim((string)($_GET['id'] ?? ''));
  $sql = "SELECT s.id AS schedule_id, s.id, s.bus_id, s.route_id, s.departure_date, s.departure_time, s.arrival_time, s.status AS schedule_status,
      r.name AS route_name, r.from_city, r.to_city, r.stops, r.duration_mins, r.base_fare, r.distance_km,
      b.name AS bus_name, b.layout, b.total_seats, b.amenities, b.photo_url, b.registration_number, b.gps_status, b.partner_id,
      p.agency_name, p.name AS partner_name
    FROM erp_schedules s
    INNER JOIN erp_routes r ON r.id = s.route_id
    INNER JOIN erp_buses b ON b.id = s.bus_id
    LEFT JOIN partners p ON p.id = b.partner_id
    WHERE IFNULL(b.partner_id,'') <> ''
      AND IFNULL(b.status,'active') <> 'inactive'
      AND IFNULL(s.status,'scheduled') NOT IN ('cancelled','draft','inactive')";
  $args = [];
  if ($id !== '') {
    $sql .= ' AND s.id=?';
    $args[] = $id;
  } else {
    if ($from !== '') { $sql .= ' AND r.from_city LIKE ?'; $args[] = '%' . $from . '%'; }
    if ($to !== '') { $sql .= ' AND r.to_city LIKE ?'; $args[] = '%' . $to . '%'; }
    if ($date !== '') { $sql .= ' AND s.departure_date=?'; $args[] = $date; }
  }
  $sql .= ' ORDER BY s.departure_time ASC LIMIT 200';
  $out = [];
  try {
    $st = $pdo->prepare($sql);
    $st->execute($args);
    foreach ($st->fetchAll() ?: [] as $row) {
      $out[] = ylt_map_public_trip($pdo, $row);
    }
  } catch (Throwable $e) {
    $out = [];
  }
  if ($id !== '') {
    if (!$out) ylt_fail(404, 'Trip not found.');
    ylt_ok($out[0]);
  }
  ylt_ok(['ok' => true, 'buses' => $out]);
}

if ($isHotelBookings && $method === 'GET') {
  $auth = ylt_require_auth($c, $pdo);
  $limit = min(200, max(1, (int)($_GET['limit'] ?? 50)));
  $want = strtolower(trim((string)($_GET['user'] ?? '')));
  $email = strtolower((string)($auth['email'] ?? ''));
  $staff = ylt_is_staff_type($auth['type'] ?? '');
  if ($want && $want !== $email && !$staff) ylt_fail(403, 'forbidden');
  if (($auth['type'] ?? '') === 'agent') {
    $st = $pdo->prepare("SELECT * FROM hotel_bookings WHERE partner_id=? ORDER BY created_at DESC LIMIT {$limit}");
    $st->execute([(string)($auth['sub'] ?? '')]);
    ylt_ok($st->fetchAll());
  }
  if (!$want && !$staff) $want = $email;
  if ($want) {
    $st = $pdo->prepare("SELECT * FROM hotel_bookings WHERE guest_email=? OR user_identifier=? ORDER BY created_at DESC LIMIT {$limit}");
    $st->execute([$want, $want]);
    ylt_ok($st->fetchAll());
  }
  ylt_ok([]);
}

if ($isHotelBookings && $method === 'POST') {
  $id = ylt_uuid();
  $pnr = $p['pnr'] ?? ('YLH' . strtoupper(bin2hex(random_bytes(3))));
  $email = $p['guest_email'] ?? '';
  $user = $p['user_identifier'] ?? $email;
  $paid = ylt_razorpay_valid($pdo, (string)($p['razorpay_order_id'] ?? ''), (string)($p['razorpay_payment_id'] ?? ''), (string)($p['razorpay_signature'] ?? ''));
  $staff = ylt_auth_claims($c, $pdo);
  if (!$paid && $staff && ylt_is_staff_type($staff['type'] ?? '') && (($p['payment_status'] ?? '') === 'paid')) $paid = true;
  $hotelId = (string)($p['hotel_id'] ?? '');
  $hotelPartner = '';
  $hotelName = (string)($p['hotel_name'] ?? 'Hotel');
  $city = (string)($p['city'] ?? '');
  if ($hotelId) {
    try {
      $h = $pdo->prepare('SELECT partner_id, name, city FROM hotels WHERE id=? LIMIT 1');
      $h->execute([$hotelId]);
      $hr = $h->fetch();
      if ($hr) {
        $hotelPartner = (string)($hr['partner_id'] ?? '');
        if (!empty($hr['name'])) $hotelName = $hr['name'];
        if ($city === '' && !empty($hr['city'])) $city = $hr['city'];
      }
    } catch (Throwable $e) { $hotelPartner = ''; }
  }
  if (($staff['type'] ?? '') === 'agent') {
    $hotelPartner = (string)($staff['sub'] ?? $hotelPartner);
  }
  $custId = ylt_crm_upsert_membership($pdo, $hotelPartner, [
    'name' => $p['guest_name'] ?? '',
    'email' => $email,
    'phone' => $p['guest_phone'] ?? '',
    'city' => $city,
    'last_stay' => substr((string)($p['check_in'] ?? ''), 0, 10),
  ]);
  $personId = ylt_crm_person_id($pdo, $custId, $hotelPartner);
  $cols = ylt_table_cols($pdo, 'hotel_bookings');
  $fields = [
    'id' => $id, 'pnr' => $pnr, 'hotel_id' => $hotelId ?: null, 'hotel_name' => $hotelName,
    'city' => $city, 'guest_name' => $p['guest_name'] ?? '', 'guest_email' => $email,
    'guest_phone' => $p['guest_phone'] ?? '', 'check_in' => $p['check_in'] ?? '', 'check_out' => $p['check_out'] ?? '',
    'rooms' => (int)($p['rooms'] ?? 1), 'guests' => (int)($p['guests'] ?? 1),
    'room_type' => $p['room_type'] ?? '', 'total_amount' => (float)($p['total_amount'] ?? 0), 'status' => 'confirmed',
    'user_identifier' => $user, 'payment_status' => $paid ? 'paid' : 'pending',
    'partner_id' => $hotelPartner ?: null,
    'customer_id' => $custId,
    'person_id' => $personId ?: null,
  ];
  $use = [];
  foreach ($fields as $k => $v) {
    if (isset($cols[$k]) || $k === 'id' || $k === 'pnr') $use[$k] = $v;
  }
  $names = implode(',', array_map(function ($k) { return "`$k`"; }, array_keys($use)));
  $ph = implode(',', array_fill(0, count($use), '?'));
  $pdo->prepare("INSERT INTO hotel_bookings ($names) VALUES ($ph)")->execute(array_values($use));
  ylt_ok(['ok' => true, 'pnr' => $pnr, 'id' => $id], 201);
}

if ($method === 'GET') {
  $auth = ylt_require_auth($c, $pdo);
  $limit = min(200, max(1, (int)($_GET['limit'] ?? 50)));
  $out = [];
  $want = strtolower(trim((string)($_GET['user'] ?? '')));
  $email = strtolower((string)($auth['email'] ?? ''));
  $staff = ylt_is_staff_type($auth['type'] ?? '');
  if ($want && $want !== $email && !$staff) ylt_fail(403, 'forbidden');
  if (($auth['type'] ?? '') === 'agent') {
    $pid = (string)($auth['sub'] ?? '');
    $st = $pdo->prepare("SELECT * FROM bookings WHERE partner_id=? ORDER BY created_at DESC LIMIT {$limit}");
    $st->execute([$pid]);
    foreach ($st->fetchAll() as $b) $out[] = ylt_map_bus_booking($b);
    try {
      $hs = $pdo->prepare("SELECT * FROM hotel_bookings WHERE partner_id=? ORDER BY created_at DESC LIMIT {$limit}");
      $hs->execute([$pid]);
      foreach ($hs->fetchAll() as $hb) $out[] = ylt_map_hotel_booking($hb);
    } catch (Throwable $e) { /* hotel table missing */ }
    usort($out, function ($a, $b) {
      return strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? ''));
    });
    ylt_ok($out);
  }
  if (!$want && !$staff) $want = $email;
  if ($want) {
    $st = $pdo->prepare("SELECT * FROM bookings WHERE user_identifier=? OR contact_email=? ORDER BY created_at DESC LIMIT {$limit}");
    $st->execute([$want, $want]);
    foreach ($st->fetchAll() as $b) $out[] = ylt_map_bus_booking($b);
    try {
      $hs = $pdo->prepare("SELECT * FROM hotel_bookings WHERE guest_email=? OR user_identifier=? ORDER BY created_at DESC LIMIT {$limit}");
      $hs->execute([$want, $want]);
      foreach ($hs->fetchAll() as $hb) $out[] = ylt_map_hotel_booking($hb);
    } catch (Throwable $e) { /* hotel table missing */ }
  }
  usort($out, function ($a, $b) {
    return strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? ''));
  });
  ylt_ok($out);
}

if ($method === 'POST') {
  $id = ylt_uuid();
  $pnr = $p['pnr'] ?? ('YLT' . (string)random_int(100000, 999999));
  $seats = $p['seats'] ?? [];
  $passengers = $p['passengers'] ?? [];
  $paid = ylt_razorpay_valid($pdo, (string)($p['razorpay_order_id'] ?? ''), (string)($p['razorpay_payment_id'] ?? ''), (string)($p['razorpay_signature'] ?? ''));
  $staff = ylt_auth_claims($c, $pdo);
  if (!$paid && $staff && ylt_is_staff_type($staff['type'] ?? '') && (($p['payment_status'] ?? '') === 'paid')) $paid = true;
  $busPartner = '';
  if (($staff['type'] ?? '') === 'agent') $busPartner = (string)($staff['sub'] ?? '');
  $busId = (string)($p['bus_id'] ?? $p['fleet_bus_id'] ?? '');
  $scheduleId = (string)($p['schedule_id'] ?? '');
  if ($busPartner === '' && $busId !== '') {
    try {
      $st = $pdo->prepare('SELECT partner_id FROM erp_buses WHERE id=? LIMIT 1');
      $st->execute([$busId]);
      $busPartner = (string)($st->fetch()['partner_id'] ?? '');
    } catch (Throwable $e) { $busPartner = ''; }
  }
  if ($busPartner === '' && $scheduleId === '' && $busId !== '') $scheduleId = $busId;
  if ($busPartner === '' && $scheduleId !== '') {
    try {
      $st = $pdo->prepare('SELECT s.partner_id AS sid, b.partner_id AS bid, s.bus_id FROM erp_schedules s LEFT JOIN erp_buses b ON b.id=s.bus_id WHERE s.id=? LIMIT 1');
      $st->execute([$scheduleId]);
      $sr = $st->fetch();
      if ($sr) {
        $busPartner = (string)($sr['sid'] ?: $sr['bid'] ?? '');
        if ($busId === '' && !empty($sr['bus_id'])) $busId = (string)$sr['bus_id'];
      }
    } catch (Throwable $e) { /* ignore */ }
  }
  $guestName = '';
  if (is_array($passengers) && $passengers) {
    $guestName = (string)($passengers[0]['name'] ?? $passengers[0]['full_name'] ?? '');
  }
  $custId = null;
  if ($busPartner) {
    $custId = ylt_crm_upsert_membership($pdo, $busPartner, [
      'name' => $guestName,
      'email' => $p['contact_email'] ?? '',
      'phone' => $p['contact_phone'] ?? '',
      'last_trip' => substr((string)($p['travel_date'] ?? ''), 0, 10),
    ]);
  }
  $cols = ylt_table_cols($pdo, 'bookings');
  $fields = [
    'id' => $id,
    'pnr' => $pnr,
    'bus_id' => $busId ?: ($p['bus_id'] ?? ''),
    'bus_name' => $p['bus_name'] ?? '',
    'operator' => $p['operator'] ?? '',
    'from_city' => $p['from_city'] ?? '',
    'to_city' => $p['to_city'] ?? '',
    'travel_date' => $p['travel_date'] ?? '',
    'departure_time' => $p['departure_time'] ?? '',
    'seats' => is_string($seats) ? $seats : json_encode($seats),
    'passengers' => is_string($passengers) ? $passengers : json_encode($passengers),
    'contact_email' => $p['contact_email'] ?? '',
    'contact_phone' => $p['contact_phone'] ?? '',
    'total_amount' => (float)($p['total_amount'] ?? 0),
    'status' => 'confirmed',
    'user_identifier' => $p['user_identifier'] ?? null,
    'user_type' => $p['user_type'] ?? 'customer',
    'boarding_point' => $p['boarding_point'] ?? null,
    'dropping_point' => $p['dropping_point'] ?? null,
    'payment_status' => $paid ? 'paid' : 'pending',
    'partner_id' => $busPartner ?: null,
    'customer_id' => $custId,
    'person_id' => $custId ? ylt_crm_person_id($pdo, $custId, $busPartner) : null,
    'channel' => $p['channel'] ?? ((($staff['type'] ?? '') === 'agent') ? 'office' : 'website'),
  ];
  $use = [];
  foreach ($fields as $k => $v) {
    if (isset($cols[$k])) $use[$k] = $v;
  }
  $names = implode(',', array_map(function ($k) { return "`$k`"; }, array_keys($use)));
  $ph = implode(',', array_fill(0, count($use), '?'));
  $pdo->prepare("INSERT INTO bookings ($names) VALUES ($ph)")->execute(array_values($use));
  $labels = is_array($seats) ? $seats : ylt_json_list($seats);
  $tripDate = substr((string)($p['travel_date'] ?? ''), 0, 10);
  if ($busId && $tripDate && $labels) {
    foreach ($labels as $label) {
      $lab = is_array($label) ? (string)($label['label'] ?? $label['id'] ?? $label['seat'] ?? '') : (string)$label;
      if ($lab === '') continue;
      try {
        $pdo->prepare("UPDATE erp_seat_inventory SET status='booked', booking_pnr=?, passenger_name=? WHERE bus_id=? AND travel_date=? AND seat_number=?")
          ->execute([$pnr, $guestName, $busId, $tripDate, $lab]);
      } catch (Throwable $e) { /* inventory optional */ }
    }
  }
  ylt_ok(['ok' => true, 'pnr' => $pnr, 'id' => $id, 'payment_status' => $paid ? 'paid' : 'pending'], 201);
}

ylt_fail(405, 'Method not allowed.');
