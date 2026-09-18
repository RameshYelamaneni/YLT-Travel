<?php
require __DIR__ . '/bootstrap.php';

$p = ylt_body();
$action = (string)($p['action'] ?? $_GET['action'] ?? '');
$uri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($uri, PHP_URL_PATH) ?: '';
if (str_contains($path, 'tickets') || str_contains($path, 'email')) $action = $action ?: 'ticket';

if ($action === 'ticket' || $action === 'tickets/email') {
  $to = strtolower(trim((string)($p['to'] ?? ($p['ticket']['contactEmail'] ?? ''))));
  $ticket = $p['ticket'] ?? [];
  $pnr = (string)($ticket['pnr'] ?? 'YLT');
  if (!str_contains($to, '@')) ylt_fail(400, 'Email required.');
  $auth = ylt_auth_claims($c, $pdo);
  $allowed = $auth && (ylt_is_staff_type($auth['type'] ?? '') || strtolower((string)($auth['email'] ?? '')) === $to);
  if (!$allowed) {
    $hit = false;
    try {
      $st = $pdo->prepare('SELECT 1 FROM bookings WHERE pnr=? AND contact_email=? LIMIT 1');
      $st->execute([$pnr, $to]);
      $hit = (bool)$st->fetchColumn();
    } catch (Throwable $e) { $hit = false; }
    if (!$hit) {
      try {
        $st = $pdo->prepare('SELECT 1 FROM hotel_bookings WHERE pnr=? AND guest_email=? LIMIT 1');
        $st->execute([$pnr, $to]);
        $hit = (bool)$st->fetchColumn();
      } catch (Throwable $e) { $hit = false; }
    }
    if (!$hit) ylt_fail(401, 'Sign in or use the booking email for this PNR.');
  }

  $route = (string)($ticket['route'] ?? '');
  $parts = preg_split('/→|->| to /i', $route);
  $from = trim($parts[0] ?? $route);
  $toCity = trim($parts[1] ?? '');
  $apple = (string)($p['apple_wallet_url'] ?? $ticket['apple_wallet_url'] ?? 'https://ylttravels.com');
  $google = (string)($p['google_wallet_url'] ?? $ticket['google_wallet_url'] ?? 'https://ylttravels.com');

  $vars = [
    'pnr' => $pnr,
    'operator' => $ticket['operator'] ?? '',
    'from_city' => $from,
    'to_city' => $toCity,
    'travel_date' => $ticket['date'] ?? '',
    'departure_time' => $ticket['departure'] ?? '',
    'seats' => $ticket['seats'] ?? '',
    'amount' => $ticket['total'] ?? $ticket['amount'] ?? '',
    'email' => $to,
    'phone' => $ticket['contactPhone'] ?? '',
    'apple_wallet_url' => $apple,
    'google_wallet_url' => $google,
  ];

  $html = '';
  $subject = 'Your YLT Travels Ticket — ' . $pnr;
  try {
    $st = $pdo->prepare("SELECT subject, body_html, is_active FROM email_templates WHERE `key`='booking_confirmation' LIMIT 1");
    $st->execute();
    $tpl = $st->fetch();
    if ($tpl && (int)($tpl['is_active'] ?? 1) === 1 && !empty($tpl['body_html'])) {
      $html = $tpl['body_html'];
      if (!empty($tpl['subject'])) $subject = $tpl['subject'];
    }
  } catch (Throwable $e) {
    $html = '';
  }
  if ($html === '') {
    $html = '<div style="font-family:Arial,sans-serif;max-width:560px;color:#111"><h2>Booking Confirmed</h2><p>PNR <b>{{pnr}}</b> · {{operator}}</p><p>{{from_city}} → {{to_city}} · {{travel_date}} {{departure_time}}</p><p>Seats {{seats}} · ₹{{amount}}</p></div>';
  }
  if (stripos($html, 'apple_wallet') === false && stripos($html, 'Apple Wallet') === false) {
    $html = str_ireplace('</body>', ylt_wallet_email_block() . '</body>', $html);
    if (stripos($html, 'Apple Wallet') === false) $html .= ylt_wallet_email_block();
  }
  $html = ylt_fill_template($html, $vars);
  $subject = ylt_fill_template($subject, $vars);

  $atts = [];
  $addAtt = function ($raw, $name, $type) use (&$atts) {
    $b64 = preg_replace('/\s+/', '', (string)$raw);
    if (str_starts_with($b64, 'data:')) $b64 = substr($b64, strpos($b64, ',') + 1);
    if ($b64 === '') return;
    $atts[] = ['name' => $name, 'b64' => $b64, 'type' => $type];
  };
  $safe = preg_replace('/[^A-Za-z0-9-]/', '', $pnr);
  $addAtt($p['pdf_b64'] ?? '', "YLT-ETicket-{$safe}.pdf", 'application/pdf');
  $addAtt($p['pkpass_b64'] ?? '', "YLT-{$safe}.pkpass", 'application/vnd.apple.pkpass');
  $addAtt($p['ics_b64'] ?? '', "YLT-{$safe}.ics", 'text/calendar');

  $ok = ylt_send_mail($pdo, $to, $subject, $html, $atts);
  if (!$ok) ylt_fail(500, 'Could not send ticket email. Set SMTP in Admin → Email.');
  ylt_ok(['ok' => true, 'message' => 'Ticket emailed to ' . $to . ' with PDF and wallet files.']);
}

if ($action === 'promo') {
  $title = trim((string)($p['title'] ?? ''));
  $code = strtoupper(trim((string)($p['promo_code'] ?? $p['code'] ?? '')));
  $desc = trim((string)($p['description'] ?? ''));
  if ($title === '' || $code === '') ylt_fail(400, 'title and promo_code required');
  $n = ylt_blast_offer($pdo, $title, $code, $desc);
  ylt_ok(['ok' => true, 'sent' => $n]);
}

ylt_fail(400, 'Unknown mail action');
