<?php
require __DIR__ . '/bootstrap.php';

$p = ylt_body();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$resource = (string)($_GET['resource'] ?? $p['resource'] ?? 'desk');
$action = (string)($_GET['action'] ?? $p['action'] ?? '');
$auth = ylt_require_staff($c, $pdo);
$partnerId = '';
if (($auth['type'] ?? '') === 'agent') {
  $partnerId = (string)($auth['sub'] ?? '');
} elseif (($auth['type'] ?? '') === 'admin') {
  $partnerId = (string)($_GET['partner_id'] ?? $p['partner_id'] ?? '');
}

function ylt_flag_on($v, $default = 1) {
  if ($v === null || $v === '') return $default;
  if ($v === true || $v === 1 || $v === '1' || $v === 'true' || $v === 'on') return 1;
  return 0;
}

function ylt_nights($in, $out) {
  $a = strtotime((string)$in);
  $b = strtotime((string)$out);
  if (!$a || !$b) return 1;
  $n = (int)round(($b - $a) / 86400);
  return max(1, $n);
}

function ylt_hotel_public($row) {
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

function ylt_booking_view($b) {
  $in = $b['check_in'] ?? '';
  $out = $b['check_out'] ?? '';
  return array_merge($b, [
    'nights' => ylt_nights($in, $out),
    'amount' => (float)($b['total_amount'] ?? 0),
    'guestName' => $b['guest_name'] ?? '',
    'hotelName' => $b['hotel_name'] ?? '',
    'roomType' => $b['room_type'] ?? '',
    'checkIn' => $in,
    'checkOut' => $out,
    'roomNumber' => $b['room_number'] ?? '',
  ]);
}

function ylt_guest_key($name, $phone, $email) {
  $email = strtolower(trim((string)$email));
  $phone = preg_replace('/\D+/', '', (string)$phone);
  if ($email !== '') return 'e:' . $email;
  if ($phone !== '') return 'p:' . $phone;
  return 'n:' . strtolower(trim((string)$name));
}

function ylt_upsert_guest($pdo, $partnerId, $name, $phone, $email) {
  return ylt_upsert_customer($pdo, $partnerId, [
    'name' => $name,
    'phone' => $phone,
    'email' => $email,
  ]);
}

function ylt_upsert_customer($pdo, $partnerId, $p) {
  return ylt_crm_upsert_membership($pdo, $partnerId, $p);
}

function ylt_customer_history($pdo, $partnerId, $row) {
  $personId = (string)($row['person_id'] ?? '');
  $cid = (string)($row['id'] ?? '');
  $email = ylt_crm_norm_email($row['email'] ?? '');
  $phone = ylt_crm_norm_phone($row['phone'] ?? '');
  $stays = [];
  $trips = [];
  try {
    $or = ['1=0'];
    $args = [$partnerId];
    if ($personId !== '') { $or[] = 'person_id=?'; $args[] = $personId; }
    if ($cid !== '') { $or[] = 'customer_id=?'; $args[] = $cid; }
    if ($email !== '') { $or[] = 'LOWER(guest_email)=?'; $args[] = $email; }
    if ($phone !== '') { $or[] = "REPLACE(REPLACE(REPLACE(IFNULL(guest_phone,''),' ',''),'-',''),'+','') LIKE ?"; $args[] = '%' . $phone . '%'; }
    $st = $pdo->prepare('SELECT * FROM hotel_bookings WHERE partner_id=? AND (' . implode(' OR ', $or) . ') ORDER BY created_at DESC LIMIT 100');
    $st->execute($args);
    foreach ($st->fetchAll() ?: [] as $b) $stays[] = ylt_booking_view($b);
  } catch (Throwable $e) { $stays = []; }
  try {
    $bcols = ylt_table_cols($pdo, 'bookings');
    if (isset($bcols['partner_id'])) {
      $parts = ['partner_id=?'];
      $args = [$partnerId];
      $or = [];
      if ($email !== '') { $or[] = 'LOWER(contact_email)=?'; $args[] = $email; }
      if ($phone !== '') { $or[] = "REPLACE(REPLACE(REPLACE(IFNULL(contact_phone,''),' ',''),'-',''),'+','') LIKE ?"; $args[] = '%' . $phone . '%'; }
      if ($or) {
        $st = $pdo->prepare('SELECT * FROM bookings WHERE partner_id=? AND (' . implode(' OR ', $or) . ') ORDER BY created_at DESC LIMIT 100');
        $st->execute(array_merge([$partnerId], array_slice($args, 1)));
        $trips = $st->fetchAll() ?: [];
      }
    }
  } catch (Throwable $e) { $trips = []; }
  $lastStay = '';
  if ($stays) $lastStay = substr((string)($stays[0]['check_in'] ?? $stays[0]['checkIn'] ?? ''), 0, 10);
  $lastTrip = $trips ? substr((string)($trips[0]['travel_date'] ?? ''), 0, 10) : '';
  return [$stays, $trips, $lastStay, $lastTrip];
}

function ylt_customer_public($pdo, $partnerId, $g) {
  $person = [
    'email' => $g['email'] ?? '',
    'phone' => $g['phone'] ?? '',
    'name' => $g['person_name'] ?? $g['name'] ?? '',
  ];
  $row = array_merge($g, $person);
  list($stays, $trips, $lastStay, $lastTrip) = ylt_customer_history($pdo, $partnerId, $row);
  $tags = $g['tags'] ?? [];
  if (is_string($tags)) {
    $d = json_decode($tags, true);
    $tags = is_array($d) ? $d : array_values(array_filter(array_map('trim', explode(',', $tags))));
  }
  if (!is_array($tags)) $tags = [];
  if ($lastStay || $lastTrip) {
    try {
      $pdo->prepare('UPDATE partner_customers SET last_stay=COALESCE(NULLIF(?, ""), last_stay), last_trip=COALESCE(NULLIF(?, ""), last_trip) WHERE id=? AND partner_id=?')
        ->execute([$lastStay ?: null, $lastTrip ?: null, $g['id'], $partnerId]);
    } catch (Throwable $e) { /* ignore */ }
  }
  return [
    'id' => $g['id'],
    'person_id' => $g['person_id'] ?? '',
    'partner_id' => $partnerId,
    'name' => $g['name'] ?: ($person['name'] ?? ''),
    'email' => $person['email'] ?? '',
    'phone' => $person['phone'] ?? '',
    'city' => $g['city'] ?? '',
    'tags' => $tags,
    'notes' => $g['notes'] ?? '',
    'last_stay' => $lastStay ?: ($g['last_stay'] ?? ''),
    'last_trip' => $lastTrip ?: ($g['last_trip'] ?? ''),
    'first_seen' => $g['first_seen'] ?? $g['created_at'] ?? '',
    'created_at' => $g['created_at'] ?? '',
    'stays' => $stays,
    'trips' => $trips,
  ];
}

function ylt_partner_customers($pdo, $partnerId) {
  if (!$partnerId) return [];
  ylt_ensure_crm_table($pdo);
  $rows = [];
  try {
    $st = $pdo->prepare('SELECT pc.*, pe.email, pe.phone, pe.name AS person_name
      FROM partner_customers pc
      LEFT JOIN crm_people pe ON pe.id = pc.person_id
      WHERE pc.partner_id=?
      ORDER BY pc.updated_at DESC, pc.created_at DESC');
    $st->execute([$partnerId]);
    $rows = $st->fetchAll() ?: [];
  } catch (Throwable $e) {
    try {
      $st = $pdo->prepare('SELECT * FROM partner_customers WHERE partner_id=? ORDER BY created_at DESC');
      $st->execute([$partnerId]);
      $rows = $st->fetchAll() ?: [];
    } catch (Throwable $e2) { return []; }
  }
  $out = [];
  foreach ($rows as $g) $out[] = ylt_customer_public($pdo, $partnerId, $g);
  return $out;
}

function ylt_partner_guests($pdo, $partnerId, $bookings) {
  return ylt_partner_customers($pdo, $partnerId);
}

function ylt_partner_hotels($pdo, $partnerId) {
  if ($partnerId) {
    $st = $pdo->prepare('SELECT * FROM hotels WHERE partner_id=? ORDER BY created_at DESC');
    $st->execute([$partnerId]);
    return array_map('ylt_hotel_public', $st->fetchAll());
  }
  return [];
}

if ($resource === 'hotels' && $method === 'GET') {
  ylt_ok(['ok' => true, 'hotels' => ylt_partner_hotels($pdo, $partnerId)]);
}

if ($resource === 'media') {
  if ($method === 'GET') {
    ylt_ok(['ok' => true, 'files' => ylt_staff_list_images($auth, $p)]);
  }
  if ($method === 'POST') {
    ylt_ok(ylt_staff_store_image($auth, $p), 201);
  }
}

if ($resource === 'hotels' && $method === 'POST') {
  if ($partnerId === '') ylt_fail(400, 'Sign in as a partner to add a property.');
  ylt_ensure_hotel_cols($pdo);
  $id = $p['id'] ?? ylt_uuid();
  $name = trim((string)($p['name'] ?? ''));
  if ($name === '') ylt_fail(400, 'Hotel name required.');
  $amenities = $p['amenities'] ?? [];
  $amenJson = is_string($amenities) ? $amenities : json_encode($amenities);
  $roomsN = max(1, (int)($p['rooms_available'] ?? $p['room_count'] ?? 8));
  $rate = (float)($p['price_per_night'] ?? 2000);
  $status = strtolower(trim((string)($p['status'] ?? 'active')));
  if ($status !== 'maintenance' && $status !== 'inactive') $status = 'active';
  $fields = [
    'id' => $id,
    'name' => $name,
    'city' => trim((string)($p['city'] ?? '')),
    'area' => $p['area'] ?? '',
    'address' => $p['address'] ?? '',
    'star_rating' => (int)($p['stars'] ?? $p['star_rating'] ?? 3),
    'description' => $p['description'] ?? '',
    'amenities' => $amenJson,
    'image_url' => ylt_public_image_url($p['photo'] ?? $p['image_url'] ?? ''),
    'gallery_urls' => json_encode(ylt_public_image_list($p['gallery'] ?? $p['gallery_urls'] ?? [])),
    'price_per_night' => $rate,
    'rooms_available' => $roomsN,
    'rating' => 4.2,
    'reviews' => 0,
    'is_active' => $status === 'inactive' ? 0 : 1,
    'partner_id' => $partnerId,
    'contact_phone' => $p['contact_phone'] ?? $p['contactPhone'] ?? '',
    'sla_verified' => ylt_flag_on($p['slaVerified'] ?? $p['sla_verified'] ?? 1),
    'status' => $status,
  ];
  $cols = ylt_table_cols($pdo, 'hotels');
  $exists = $pdo->prepare('SELECT id, partner_id FROM hotels WHERE id=?');
  $exists->execute([$id]);
  try {
    $existing = $exists->fetch();
    if ($existing) {
      if ((string)($existing['partner_id'] ?? '') !== $partnerId) ylt_fail(403, 'Not your property.');
      $sets = [];
      $vals = [];
      foreach ($fields as $k => $v) {
        if ($k === 'id' || !isset($cols[$k])) continue;
        $sets[] = "`$k`=?";
        $vals[] = $v;
      }
      if ($sets) {
        $vals[] = $id;
        $vals[] = $partnerId;
        $pdo->prepare('UPDATE hotels SET ' . implode(',', $sets) . ' WHERE id=? AND partner_id=?')->execute($vals);
      }
    } else {
      if (!ylt_row_write($pdo, 'hotels', $fields)) {
        ylt_fail(500, 'Could not save hotel.');
      }
      $types = $p['room_types'] ?? [['type' => 'Standard', 'rate' => $rate], ['type' => 'Deluxe', 'rate' => $rate * 1.4]];
      $n = 0;
      foreach ($types as $ti => $t) {
        $per = (int)ceil($roomsN / max(1, count($types)));
        for ($i = 1; $i <= $per && $n < $roomsN; $i++) {
          $n++;
          $rid = ylt_uuid();
          $num = (string)((100 * ($ti + 1)) + $i);
          try {
            $pdo->prepare('INSERT INTO hotel_rooms (id,hotel_id,partner_id,room_number,floor,room_type,rate,status,hk_status) VALUES (?,?,?,?,?,?,?,?,?)')
              ->execute([$rid, $id, $partnerId, $num, (string)($ti + 1), $t['type'] ?? 'Standard', (float)($t['rate'] ?? $rate), 'vacant', 'clean']);
          } catch (Throwable $e) { /* room rack optional */ }
        }
      }
    }
  } catch (Throwable $e) {
    ylt_fail(500, 'Could not save hotel.');
  }
  ylt_ok(['ok' => true, 'id' => $id]);
}

if ($resource === 'hotels' && $method === 'DELETE') {
  $id = (string)($_GET['id'] ?? $p['id'] ?? '');
  if (!$id) ylt_fail(400, 'id required');
  if ($partnerId === '') ylt_fail(401, 'Sign in as a partner to remove a property.');
  $pdo->prepare('DELETE FROM hotel_rooms WHERE hotel_id=? AND (partner_id=? OR partner_id IS NULL)')->execute([$id, $partnerId]);
  $pdo->prepare('DELETE FROM hotels WHERE id=? AND partner_id=?')->execute([$id, $partnerId]);
  ylt_ok(['ok' => true]);
}

if ($resource === 'rooms' && $method === 'GET') {
  $hotelId = (string)($_GET['hotel_id'] ?? '');
  if ($hotelId && $partnerId) {
    $st = $pdo->prepare('SELECT * FROM hotel_rooms WHERE hotel_id=? AND partner_id=? ORDER BY room_number');
    $st->execute([$hotelId, $partnerId]);
    $rooms = $st->fetchAll() ?: [];
    foreach ($rooms as &$room) {
      if (!empty($room['photo_url'])) $room['photo_url'] = ylt_public_image_url($room['photo_url']);
    }
    unset($room);
    ylt_ok(['ok' => true, 'rooms' => $rooms]);
  }
  if ($partnerId) {
    $st = $pdo->prepare('SELECT * FROM hotel_rooms WHERE partner_id=? ORDER BY hotel_id, room_number');
    $st->execute([$partnerId]);
    $rooms = $st->fetchAll() ?: [];
    foreach ($rooms as &$room) {
      if (!empty($room['photo_url'])) $room['photo_url'] = ylt_public_image_url($room['photo_url']);
    }
    unset($room);
    ylt_ok(['ok' => true, 'rooms' => $rooms]);
  }
  ylt_ok(['ok' => true, 'rooms' => []]);
}

if ($resource === 'rooms' && ($method === 'POST' || $method === 'PUT')) {
  $id = $p['id'] ?? ylt_uuid();
  ylt_add_col($pdo, 'hotel_rooms', 'photo_url', 'photo_url TEXT');
  $cols = ylt_table_cols($pdo, 'hotel_rooms');
  if ($action === 'photo' || (array_key_exists('photo_url', $p) && $action !== 'hk')) {
    $url = ylt_public_image_url((string)($p['photo_url'] ?? ''));
    if ($partnerId) {
      $pdo->prepare('UPDATE hotel_rooms SET photo_url=? WHERE id=? AND partner_id=?')->execute([$url, $id, $partnerId]);
    } else {
      $pdo->prepare('UPDATE hotel_rooms SET photo_url=? WHERE id=?')->execute([$url, $id]);
    }
    ylt_ok(['ok' => true, 'id' => $id, 'photo_url' => $url]);
  }
  if ($action === 'hk' || (($p['hk_status'] ?? $p['hkStatus'] ?? '') !== '' && $action !== 'photo')) {
    $st = $pdo->prepare('UPDATE hotel_rooms SET status=COALESCE(?, status), hk_status=COALESCE(?, hk_status) WHERE id=?');
    $st->execute([$p['status'] ?? null, $p['hk_status'] ?? $p['hkStatus'] ?? null, $id]);
    ylt_ok(['ok' => true, 'id' => $id]);
  }
  $exists = $pdo->prepare('SELECT id FROM hotel_rooms WHERE id=?');
  $exists->execute([$id]);
  if ($exists->fetch()) {
    $photo = array_key_exists('photo_url', $p) ? ylt_public_image_url((string)$p['photo_url']) : null;
    if ($photo !== null && isset($cols['photo_url'])) {
      $pdo->prepare('UPDATE hotel_rooms SET room_number=?, floor=?, room_type=?, rate=?, status=?, hk_status=?, photo_url=? WHERE id=?')
        ->execute([$p['room_number'] ?? '', $p['floor'] ?? '1', $p['room_type'] ?? 'Standard', (float)($p['rate'] ?? 0), $p['status'] ?? 'vacant', $p['hk_status'] ?? 'clean', $photo, $id]);
    } else {
      $pdo->prepare('UPDATE hotel_rooms SET room_number=?, floor=?, room_type=?, rate=?, status=?, hk_status=? WHERE id=?')
        ->execute([$p['room_number'] ?? '', $p['floor'] ?? '1', $p['room_type'] ?? 'Standard', (float)($p['rate'] ?? 0), $p['status'] ?? 'vacant', $p['hk_status'] ?? 'clean', $id]);
    }
  } else {
    $pdo->prepare('INSERT INTO hotel_rooms (id,hotel_id,partner_id,room_number,floor,room_type,rate,status,hk_status,photo_url) VALUES (?,?,?,?,?,?,?,?,?,?)')
      ->execute([$id, $p['hotel_id'] ?? '', $partnerId ?: null, $p['room_number'] ?? '', $p['floor'] ?? '1', $p['room_type'] ?? 'Standard', (float)($p['rate'] ?? 0), 'vacant', 'clean', ylt_public_image_url((string)($p['photo_url'] ?? ''))]);
  }
  ylt_ok(['ok' => true, 'id' => $id]);
}

if ($resource === 'bookings' && $method === 'GET') {
  $limit = min(300, max(1, (int)($_GET['limit'] ?? 200)));
  if (!$partnerId) {
    ylt_ok(['ok' => true, 'bookings' => []]);
  }
  $st = $pdo->prepare("SELECT * FROM hotel_bookings WHERE partner_id=? ORDER BY created_at DESC LIMIT {$limit}");
  $st->execute([$partnerId]);
  $rows = $st ? $st->fetchAll() : [];
  ylt_ok(['ok' => true, 'bookings' => array_map('ylt_booking_view', $rows ?: [])]);
}

if ($resource === 'bookings' && $method === 'POST') {
  $id = ylt_uuid();
  $pnr = $p['pnr'] ?? ('YLH' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)));
  $in = $p['check_in'] ?? $p['checkIn'] ?? date('Y-m-d');
  $nights = max(1, (int)($p['nights'] ?? 1));
  $out = $p['check_out'] ?? $p['checkOut'] ?? date('Y-m-d', strtotime($in . " +{$nights} day"));
  $hotelId = $p['hotel_id'] ?? $p['hotelId'] ?? '';
  $hotelName = $p['hotel_name'] ?? $p['hotelName'] ?? 'Hotel';
  $city = $p['city'] ?? '';
  if ($hotelId) {
    $h = $pdo->prepare('SELECT name, city FROM hotels WHERE id=?');
    $h->execute([$hotelId]);
    $hr = $h->fetch();
    if ($hr) { $hotelName = $hr['name']; $city = $city ?: ($hr['city'] ?? ''); }
  }
  $custId = ylt_upsert_customer($pdo, $partnerId, [
    'id' => $p['customer_id'] ?? $p['customerId'] ?? '',
    'name' => $p['guest_name'] ?? $p['guestName'] ?? '',
    'email' => $p['guest_email'] ?? $p['guestEmail'] ?? '',
    'phone' => $p['guest_phone'] ?? $p['guestPhone'] ?? '',
    'city' => $city,
    'last_stay' => substr((string)$in, 0, 10),
  ]);
  $personId = '';
  if ($custId) {
    try {
      $st = $pdo->prepare('SELECT person_id FROM partner_customers WHERE id=? AND partner_id=? LIMIT 1');
      $st->execute([$custId, $partnerId]);
      $personId = (string)($st->fetch()['person_id'] ?? '');
    } catch (Throwable $e) { $personId = ''; }
  }
  $cols = ylt_table_cols($pdo, 'hotel_bookings');
  $fields = [
    'id' => $id, 'pnr' => $pnr, 'hotel_id' => $hotelId, 'hotel_name' => $hotelName,
    'city' => $city, 'guest_name' => $p['guest_name'] ?? $p['guestName'] ?? '',
    'guest_email' => $p['guest_email'] ?? $p['guestEmail'] ?? '',
    'guest_phone' => $p['guest_phone'] ?? $p['guestPhone'] ?? '',
    'check_in' => $in, 'check_out' => $out, 'rooms' => (int)($p['rooms'] ?? 1),
    'guests' => (int)($p['guests'] ?? 1), 'room_type' => $p['room_type'] ?? $p['roomType'] ?? 'Standard',
    'total_amount' => (float)($p['total_amount'] ?? $p['amount'] ?? 0),
    'status' => $p['status'] ?? 'confirmed',
    'user_identifier' => $p['user_identifier'] ?? $partnerId,
    'payment_status' => $p['payment_status'] ?? 'paid',
    'partner_id' => $partnerId ?: null,
    'room_id' => $p['room_id'] ?? null,
    'room_number' => $p['room_number'] ?? $p['roomNumber'] ?? '',
    'customer_id' => $custId,
    'person_id' => $personId ?: null,
  ];
  $use = [];
  foreach ($fields as $k => $v) {
    if (isset($cols[$k])) $use[$k] = $v;
  }
  $names = implode(',', array_map(function ($k) { return "`$k`"; }, array_keys($use)));
  $ph = implode(',', array_fill(0, count($use), '?'));
  $pdo->prepare("INSERT INTO hotel_bookings ($names) VALUES ($ph)")->execute(array_values($use));
  try {
    $fid = ylt_uuid();
    $amt = (float)($fields['total_amount'] ?? 0);
    $pdo->prepare('INSERT INTO hotel_folio_charges (id,partner_id,booking_id,pnr,description,amount,charge_type) VALUES (?,?,?,?,?,?,?)')
      ->execute([$fid, $partnerId ?: null, $id, $pnr, 'Room charge', $amt, 'room']);
  } catch (Throwable $e) { /* folio table may be new */ }
  ylt_ok(['ok' => true, 'id' => $id, 'pnr' => $pnr], 201);
}

if ($resource === 'bookings' && $method === 'PUT') {
  $id = (string)($_GET['id'] ?? $p['id'] ?? '');
  if (!$id) ylt_fail(400, 'id required');
  if ($partnerId === '') ylt_fail(401, 'Sign in as a partner.');
  $own = $pdo->prepare('SELECT id FROM hotel_bookings WHERE id=? AND partner_id=? LIMIT 1');
  $own->execute([$id, $partnerId]);
  if (!$own->fetch()) ylt_fail(404, 'Booking not found.');
  $status = $p['status'] ?? '';
  $roomId = $p['room_id'] ?? $p['roomId'] ?? '';
  $roomNo = $p['room_number'] ?? $p['roomNumber'] ?? '';
  if ($action === 'checkin' || $status === 'checked-in') {
    if ($roomId) {
      $r = $pdo->prepare('SELECT room_number FROM hotel_rooms WHERE id=?');
      $r->execute([$roomId]);
      $rr = $r->fetch();
      if ($rr) $roomNo = $rr['room_number'];
      $pdo->prepare('UPDATE hotel_rooms SET status=?, booking_id=?, guest_name=(SELECT guest_name FROM hotel_bookings WHERE id=?) WHERE id=?')
        ->execute(['occupied', $id, $id, $roomId]);
    }
    $pdo->prepare('UPDATE hotel_bookings SET status=?, room_id=?, room_number=?, checked_in_at=NOW() WHERE id=?')
      ->execute(['checked-in', $roomId ?: null, $roomNo, $id]);
    ylt_ok(['ok' => true]);
  }
  if ($action === 'checkout' || $status === 'checked-out') {
    $pdo->prepare("UPDATE hotel_rooms SET status='dirty', hk_status='dirty', booking_id=NULL, guest_name=NULL WHERE booking_id=?")->execute([$id]);
    $token = bin2hex(random_bytes(16));
    try {
      $pdo->prepare("UPDATE hotel_bookings SET status='checked-out', checked_out_at=NOW(), feedback_token=COALESCE(NULLIF(feedback_token,''), ?), feedback_status=IF(feedback_status='rated','rated','pending') WHERE id=?")->execute([$token, $id]);
    } catch (Throwable $e) {
      $pdo->prepare("UPDATE hotel_bookings SET status='checked-out', checked_out_at=NOW() WHERE id=?")->execute([$id]);
    }
    $st = $pdo->prepare('SELECT feedback_token FROM hotel_bookings WHERE id=?');
    $st->execute([$id]);
    $tok = ($st->fetch()['feedback_token'] ?? '') ?: $token;
    ylt_ok(['ok' => true, 'feedback_token' => $tok, 'feedback_url' => '/?rate=' . $tok]);
  }
  if ($status === 'cancelled') {
    $pdo->prepare("UPDATE hotel_rooms SET status='vacant', booking_id=NULL, guest_name=NULL WHERE booking_id=?")->execute([$id]);
    $pdo->prepare("UPDATE hotel_bookings SET status='cancelled' WHERE id=?")->execute([$id]);
    ylt_ok(['ok' => true]);
  }
  if ($status === 'confirmed') {
    $pdo->prepare("UPDATE hotel_bookings SET status='confirmed' WHERE id=?")->execute([$id]);
    ylt_ok(['ok' => true]);
  }
  $pdo->prepare('UPDATE hotel_bookings SET status=? WHERE id=?')->execute([$status ?: 'confirmed', $id]);
  ylt_ok(['ok' => true]);
}

if ($resource === 'cars' && $method === 'GET') {
  if (!$partnerId) ylt_ok(['ok' => true, 'cars' => []]);
  $st = $pdo->prepare('SELECT * FROM partner_cars WHERE partner_id=? ORDER BY created_at DESC');
  $st->execute([$partnerId]);
  ylt_ok(['ok' => true, 'cars' => $st ? $st->fetchAll() : []]);
}

if ($resource === 'cars' && $method === 'POST') {
  $id = $p['id'] ?? ylt_uuid();
  $pdo->prepare('INSERT INTO partner_cars (id,partner_id,name,type,pricing_model,rate,status,fuel_pct,driver_name,next_maintenance) VALUES (?,?,?,?,?,?,?,?,?,?)')
    ->execute([$id, $partnerId ?: null, $p['name'] ?? 'Car', $p['type'] ?? 'Sedan', $p['pricing_model'] ?? $p['pricingModel'] ?? 'per_km', (float)($p['rate'] ?? 0), $p['status'] ?? 'active', (int)($p['fuel_pct'] ?? $p['fuelPct'] ?? 100), $p['driver_name'] ?? $p['driverName'] ?? '', $p['next_maintenance'] ?? $p['nextMaintenance'] ?? null]);
  ylt_ok(['ok' => true, 'id' => $id], 201);
}

if ($resource === 'cars' && $method === 'PUT') {
  $id = (string)($_GET['id'] ?? $p['id'] ?? '');
  $pdo->prepare('UPDATE partner_cars SET name=?, type=?, pricing_model=?, rate=?, status=?, fuel_pct=?, driver_name=?, next_maintenance=? WHERE id=?')
    ->execute([$p['name'] ?? 'Car', $p['type'] ?? 'Sedan', $p['pricing_model'] ?? 'per_km', (float)($p['rate'] ?? 0), $p['status'] ?? 'active', (int)($p['fuel_pct'] ?? 100), $p['driver_name'] ?? '', $p['next_maintenance'] ?? null, $id]);
  ylt_ok(['ok' => true]);
}

if ($resource === 'cars' && $method === 'DELETE') {
  $id = (string)($_GET['id'] ?? $p['id'] ?? '');
  $pdo->prepare('DELETE FROM partner_cars WHERE id=? AND partner_id=?')->execute([$id, $partnerId]);
  ylt_ok(['ok' => true]);
}

if ($resource === 'guests' && $method === 'GET') {
  ylt_ok(['ok' => true, 'guests' => ylt_partner_customers($pdo, $partnerId)]);
}

if ($resource === 'guests' && $method === 'POST') {
  if ($partnerId === '') ylt_fail(401, 'Sign in as a partner to save customers.');
  $name = trim((string)($p['name'] ?? $p['guest_name'] ?? ''));
  if ($name === '') ylt_fail(400, 'Guest name required.');
  try {
    $id = ylt_upsert_customer($pdo, $partnerId, $p);
    if (!$id) ylt_fail(400, 'Could not save guest.');
    ylt_ok(['ok' => true, 'id' => $id]);
  } catch (Throwable $e) {
    ylt_fail(500, 'Could not save guest.');
  }
}

if ($resource === 'customers' || $resource === 'crm') {
  if ($partnerId === '') {
    if (($auth['type'] ?? '') === 'admin') {
      $people = 0;
      $members = 0;
      try { $people = (int)$pdo->query('SELECT COUNT(*) FROM crm_people')->fetchColumn(); } catch (Throwable $e) {}
      try { $members = (int)$pdo->query('SELECT COUNT(*) FROM partner_customers')->fetchColumn(); } catch (Throwable $e) {}
      ylt_ok(['ok' => true, 'customers' => [], 'people_count' => $people, 'membership_count' => $members]);
    }
    ylt_fail(401, 'Sign in as a partner to use CRM.');
  }
  if ($method === 'GET') {
    $id = (string)($_GET['id'] ?? '');
    if ($id !== '') {
      $st = $pdo->prepare('SELECT pc.*, pe.email, pe.phone, pe.name AS person_name FROM partner_customers pc LEFT JOIN crm_people pe ON pe.id = pc.person_id WHERE pc.id=? AND pc.partner_id=? LIMIT 1');
      $st->execute([$id, $partnerId]);
      $row = $st->fetch();
      if (!$row) ylt_fail(404, 'Customer not found.');
      ylt_ok(['ok' => true, 'customer' => ylt_customer_public($pdo, $partnerId, $row)]);
    }
    ylt_ok(['ok' => true, 'customers' => ylt_partner_customers($pdo, $partnerId)]);
  }
  if ($method === 'POST' || $method === 'PUT') {
    $name = trim((string)($p['name'] ?? ''));
    if ($name === '') ylt_fail(400, 'Customer name required.');
    $id = ylt_upsert_customer($pdo, $partnerId, $p);
    if (!$id) ylt_fail(400, 'Could not save customer.');
    $st = $pdo->prepare('SELECT pc.*, pe.email, pe.phone, pe.name AS person_name FROM partner_customers pc LEFT JOIN crm_people pe ON pe.id = pc.person_id WHERE pc.id=? AND pc.partner_id=? LIMIT 1');
    $st->execute([$id, $partnerId]);
    $row = $st->fetch();
    ylt_ok(['ok' => true, 'id' => $id, 'customer' => $row ? ylt_customer_public($pdo, $partnerId, $row) : null]);
  }
  if ($method === 'DELETE') {
    $id = (string)($_GET['id'] ?? $p['id'] ?? '');
    if (!$id) ylt_fail(400, 'id required');
    $pdo->prepare('DELETE FROM partner_customers WHERE id=? AND partner_id=?')->execute([$id, $partnerId]);
    ylt_ok(['ok' => true]);
  }
}

if ($resource === 'rates' && $method === 'GET') {
  try {
    if (!$partnerId) ylt_ok(['ok' => true, 'rate_plans' => []]);
    $st = $pdo->prepare('SELECT * FROM hotel_rate_plans WHERE partner_id=? ORDER BY created_at DESC');
    $st->execute([$partnerId]);
    ylt_ok(['ok' => true, 'rate_plans' => $st ? $st->fetchAll() : []]);
  } catch (Throwable $e) {
    ylt_ok(['ok' => true, 'rate_plans' => []]);
  }
}

if ($resource === 'rates' && $method === 'POST') {
  $id = $p['id'] ?? ylt_uuid();
  $name = trim((string)($p['name'] ?? ''));
  if ($name === '') ylt_fail(400, 'Rate plan name required.');
  $exists = $pdo->prepare('SELECT id FROM hotel_rate_plans WHERE id=?');
  $exists->execute([$id]);
  if ($exists->fetch()) {
    $pdo->prepare('UPDATE hotel_rate_plans SET hotel_id=?, name=?, room_type=?, amount=?, meal_plan=?, refundable=?, status=? WHERE id=?')
      ->execute([$p['hotel_id'] ?? '', $name, $p['room_type'] ?? 'Standard', (float)($p['amount'] ?? 0), $p['meal_plan'] ?? 'Room only', !empty($p['refundable']) ? 1 : 0, $p['status'] ?? 'active', $id]);
  } else {
    $pdo->prepare('INSERT INTO hotel_rate_plans (id,partner_id,hotel_id,name,room_type,amount,meal_plan,refundable,status) VALUES (?,?,?,?,?,?,?,?,?)')
      ->execute([$id, $partnerId ?: null, $p['hotel_id'] ?? '', $name, $p['room_type'] ?? 'Standard', (float)($p['amount'] ?? 0), $p['meal_plan'] ?? 'Room only', !empty($p['refundable']) ? 1 : 0, $p['status'] ?? 'active']);
  }
  ylt_ok(['ok' => true, 'id' => $id]);
}

if ($resource === 'rates' && $method === 'DELETE') {
  $id = (string)($_GET['id'] ?? $p['id'] ?? '');
  $pdo->prepare('DELETE FROM hotel_rate_plans WHERE id=? AND partner_id=?')->execute([$id, $partnerId]);
  ylt_ok(['ok' => true]);
}

if ($resource === 'folio' && $method === 'GET') {
  try {
    if (!$partnerId) ylt_ok(['ok' => true, 'charges' => []]);
    $st = $pdo->prepare('SELECT * FROM hotel_folio_charges WHERE partner_id=? ORDER BY created_at DESC LIMIT 400');
    $st->execute([$partnerId]);
    ylt_ok(['ok' => true, 'charges' => $st ? $st->fetchAll() : []]);
  } catch (Throwable $e) {
    ylt_ok(['ok' => true, 'charges' => []]);
  }
}

if ($resource === 'folio' && $method === 'POST') {
  $bookingId = (string)($p['booking_id'] ?? '');
  $desc = trim((string)($p['description'] ?? ''));
  if ($bookingId === '' || $desc === '') ylt_fail(400, 'Booking and description required.');
  $id = ylt_uuid();
  $pdo->prepare('INSERT INTO hotel_folio_charges (id,partner_id,booking_id,pnr,description,amount,charge_type) VALUES (?,?,?,?,?,?,?)')
    ->execute([$id, $partnerId ?: null, $bookingId, $p['pnr'] ?? '', $desc, (float)($p['amount'] ?? 0), $p['charge_type'] ?? 'other']);
  ylt_ok(['ok' => true, 'id' => $id], 201);
}

if ($resource === 'notes' && $method === 'GET') {
  try {
    if (!$partnerId) ylt_ok(['ok' => true, 'notes' => []]);
    $st = $pdo->prepare('SELECT * FROM hotel_notes WHERE partner_id=? ORDER BY created_at DESC LIMIT 200');
    $st->execute([$partnerId]);
    ylt_ok(['ok' => true, 'notes' => $st ? $st->fetchAll() : []]);
  } catch (Throwable $e) {
    ylt_ok(['ok' => true, 'notes' => []]);
  }
}

if ($resource === 'notes' && $method === 'POST') {
  $id = $p['id'] ?? ylt_uuid();
  $title = trim((string)($p['title'] ?? 'Task'));
  $exists = $pdo->prepare('SELECT id FROM hotel_notes WHERE id=?');
  $exists->execute([$id]);
  if ($exists->fetch()) {
    $pdo->prepare('UPDATE hotel_notes SET title=?, body=?, kind=?, due_date=?, status=?, guest_key=?, booking_id=?, hotel_id=? WHERE id=? AND partner_id=?')
      ->execute([$title, $p['body'] ?? '', $p['kind'] ?? 'task', $p['due_date'] ?? null, $p['status'] ?? 'open', $p['guest_key'] ?? '', $p['booking_id'] ?? '', $p['hotel_id'] ?? '', $id, $partnerId]);
  } else {
    $pdo->prepare('INSERT INTO hotel_notes (id,partner_id,hotel_id,booking_id,guest_key,kind,title,body,due_date,status) VALUES (?,?,?,?,?,?,?,?,?,?)')
      ->execute([$id, $partnerId ?: null, $p['hotel_id'] ?? '', $p['booking_id'] ?? '', $p['guest_key'] ?? '', $p['kind'] ?? 'task', $title, $p['body'] ?? '', $p['due_date'] ?? null, $p['status'] ?? 'open']);
  }
  ylt_ok(['ok' => true, 'id' => $id]);
}

if ($resource === 'desk' || $resource === 'snapshot') {
  $hotels = ylt_partner_hotels($pdo, $partnerId);
  $rooms = [];
  if ($partnerId) {
    $st = $pdo->prepare('SELECT * FROM hotel_rooms WHERE partner_id=? ORDER BY hotel_id, room_number');
    $st->execute([$partnerId]);
    $rooms = $st->fetchAll() ?: [];
    foreach ($rooms as &$room) {
      if (!empty($room['photo_url'])) $room['photo_url'] = ylt_public_image_url($room['photo_url']);
    }
    unset($room);
    $st = $pdo->prepare('SELECT * FROM hotel_bookings WHERE partner_id=? ORDER BY created_at DESC LIMIT 300');
    $st->execute([$partnerId]);
    $bookings = array_map('ylt_booking_view', $st->fetchAll() ?: []);
  } else {
    $bookings = [];
  }
  $today = date('Y-m-d');
  $arrivals = array_values(array_filter($bookings, function ($b) use ($today) {
    return ($b['check_in'] ?? '') === $today && in_array($b['status'] ?? '', ['confirmed', 'checked-in'], true);
  }));
  $inhouse = array_values(array_filter($bookings, function ($b) {
    return ($b['status'] ?? '') === 'checked-in';
  }));
  $departures = array_values(array_filter($bookings, function ($b) use ($today) {
    return ($b['check_out'] ?? '') === $today && ($b['status'] ?? '') === 'checked-in';
  }));
  $occ = 0;
  if ($rooms) {
    $occ = (int)round(100 * count(array_filter($rooms, function ($r) { return ($r['status'] ?? '') === 'occupied'; })) / count($rooms));
  }
  $stayovers = array_values(array_filter($inhouse, function ($b) use ($today) {
    $in = substr((string)($b['check_in'] ?? $b['checkIn'] ?? ''), 0, 10);
    $out = substr((string)($b['check_out'] ?? $b['checkOut'] ?? ''), 0, 10);
    return $in !== '' && $out !== '' && $in < $today && $out > $today;
  }));
  $week_stats = [];
  $roomN = max(1, count($rooms));
  for ($i = 6; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-{$i} day"));
    $keys = [];
    $rev = 0.0;
    foreach ($bookings as $b) {
      if (($b['status'] ?? '') === 'cancelled') continue;
      $in = substr((string)($b['check_in'] ?? $b['checkIn'] ?? ''), 0, 10);
      $out = substr((string)($b['check_out'] ?? $b['checkOut'] ?? ''), 0, 10);
      if ($in === '' || $out === '') continue;
      if ($in <= $d && $d < $out) {
        $rid = (string)($b['room_id'] ?? '');
        $rno = (string)($b['room_number'] ?? '');
        $hid = (string)($b['hotel_id'] ?? '');
        $k = $rid !== '' ? $rid : ($rno !== '' ? ($rno . '|' . $hid) : (string)($b['id'] ?? uniqid('stay', true)));
        $keys[$k] = true;
        $nights = max(1, (int)($b['nights'] ?? 1));
        $rev += ((float)($b['amount'] ?? 0)) / $nights;
      }
    }
    $occupied = count($keys);
    $week_stats[] = [
      'date' => $d,
      'occupied' => $occupied,
      'occupancy_pct' => (int)round(100 * min($roomN, $occupied) / $roomN),
      'revenue' => round($rev, 2),
    ];
  }
  $today_revenue = 0.0;
  foreach ($week_stats as $row) {
    if (($row['date'] ?? '') === $today) $today_revenue = (float)$row['revenue'];
  }
  $guests = [];
  $ratePlans = [];
  $charges = [];
  $notes = [];
  try { $guests = ylt_partner_guests($pdo, $partnerId, $bookings); } catch (Throwable $e) {}
  $origins = [];
  $cityMap = [];
  foreach ($guests as $g) {
    $city = trim((string)($g['city'] ?? ''));
    if ($city === '') continue;
    $cityMap[$city] = ($cityMap[$city] ?? 0) + 1;
  }
  arsort($cityMap);
  $n = 0;
  foreach ($cityMap as $label => $count) {
    if ($n++ >= 8) break;
    $origins[] = ['label' => $label, 'count' => (int)$count];
  }
  try {
    $st = $pdo->prepare('SELECT * FROM hotel_rate_plans WHERE partner_id=? ORDER BY created_at DESC');
    $st->execute([$partnerId]);
    $ratePlans = $st->fetchAll() ?: [];
  } catch (Throwable $e) {}
  try {
    $st = $pdo->prepare('SELECT * FROM hotel_folio_charges WHERE partner_id=? ORDER BY created_at DESC LIMIT 400');
    $st->execute([$partnerId]);
    $charges = $st->fetchAll() ?: [];
  } catch (Throwable $e) {}
  try {
    $st = $pdo->prepare('SELECT * FROM hotel_notes WHERE partner_id=? ORDER BY created_at DESC LIMIT 200');
    $st->execute([$partnerId]);
    $notes = $st->fetchAll() ?: [];
  } catch (Throwable $e) {}
  ylt_ok([
    'ok' => true,
    'hotels' => $hotels,
    'rooms' => $rooms,
    'bookings' => $bookings,
    'arrivals' => $arrivals,
    'inhouse' => $inhouse,
    'departures' => $departures,
    'stayovers' => $stayovers,
    'occupancy_pct' => $occ,
    'today_revenue' => $today_revenue,
    'week_stats' => $week_stats,
    'origins' => $origins,
    'guests' => $guests,
    'customers' => $guests,
    'rate_plans' => $ratePlans,
    'folio_charges' => $charges,
    'notes' => $notes,
    'as_of' => date('c'),
  ]);
}

ylt_fail(400, 'Unknown PMS request.');
