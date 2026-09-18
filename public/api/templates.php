<?php
require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$p = ylt_body();

function ylt_default_booking_html() {
  return <<<'HTML'
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f12;font-family:Inter,Segoe UI,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="color:#fff;font-size:22px;margin:0;letter-spacing:0.5px">YLT Travels</h1>
      <p style="color:#c81e44;font-size:12px;margin:4px 0 0">Premium Bus Services</p>
    </div>
    <div style="background:#1a1a20;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.06)">
      <h2 style="color:#fff;font-size:18px;margin:0 0 4px">Booking Confirmed</h2>
      <p style="color:#a8a8b0;font-size:14px;margin:0 0 24px">Your ticket PDF and wallet files are attached. Show them at boarding.</p>
      <table style="width:100%;font-size:14px;color:#a8a8b0">
        <tr><td style="padding:6px 0;color:#6b6b75">PNR</td><td style="padding:6px 0;color:#fff;text-align:right;font-weight:700">{{pnr}}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b75">Operator</td><td style="padding:6px 0;color:#fff;text-align:right">{{operator}}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b75">Route</td><td style="padding:6px 0;color:#fff;text-align:right">{{from_city}} → {{to_city}}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b75">Date</td><td style="padding:6px 0;color:#fff;text-align:right">{{travel_date}}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b75">Departure</td><td style="padding:6px 0;color:#fff;text-align:right">{{departure_time}}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b75">Seats</td><td style="padding:6px 0;color:#fff;text-align:right">{{seats}}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b75">Amount</td><td style="padding:6px 0;color:#c81e44;text-align:right;font-weight:700">₹{{amount}}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b75">Contact</td><td style="padding:6px 0;color:#fff;text-align:right">{{email}} · {{phone}}</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" style="margin-top:24px"><tr>
        <td style="padding-right:8px"><a href="{{apple_wallet_url}}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;border-radius:10px;padding:12px 16px;font-size:12px;font-weight:700;border:1px solid #333">Add to Apple Wallet</a></td>
        <td><a href="{{google_wallet_url}}" style="display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;border-radius:10px;padding:12px 16px;font-size:12px;font-weight:700">Add to Google Wallet</a></td>
      </tr></table>
      <p style="color:#6b6b75;font-size:12px;margin:16px 0 0;line-height:1.5">iPhone: open the attached <b>.pkpass</b>. Android: open the attached <b>.ics</b>. PDF is also attached. Arrive 15 minutes early.</p>
    </div>
    <p style="color:#4a4a52;font-size:11px;text-align:center;margin:24px 0 0">© YLT Travels · Tirupati, Andhra Pradesh</p>
  </div>
</body>
</html>
HTML;
}

function ylt_decode_html_field($p) {
  if (!empty($p['body_b64'])) {
    $raw = preg_replace('/\s+/', '', (string)$p['body_b64']);
    $bin = base64_decode($raw, true);
    if ($bin !== false) return $bin;
  }
  return (string)($p['body_html'] ?? '');
}

try {
  if ($method === 'GET') {
    ylt_require_admin($c, $pdo);
    $rows = $pdo->query('SELECT * FROM email_templates ORDER BY name')->fetchAll();
    ylt_ok($rows);
  }

  if ($method === 'POST' || $method === 'PUT') {
    ylt_require_admin($c, $pdo);
    $id = (string)($p['id'] ?? '');
    $html = ylt_decode_html_field($p);
    $subject = (string)($p['subject'] ?? '');
    $name = (string)($p['name'] ?? '');
    $desc = (string)($p['description'] ?? '');
    $active = !empty($p['is_active']) ? 1 : 0;
    if ($html === '' && ($p['apply_wallet_default'] ?? false)) {
      $html = ylt_default_booking_html();
    }
    if ($id === '') ylt_fail(400, 'id required');
    $cols = ylt_table_cols($pdo, 'email_templates');
    $sets = ['subject=?', 'body_html=?', 'is_active=?'];
    $vals = [$subject, $html, $active];
    if (isset($cols['name']) && $name !== '') { $sets[] = 'name=?'; $vals[] = $name; }
    if (isset($cols['description'])) { $sets[] = 'description=?'; $vals[] = $desc; }
    $vals[] = $id;
    $st = $pdo->prepare('UPDATE email_templates SET ' . implode(',', $sets) . ' WHERE id=?');
    $st->execute($vals);
    if ($st->rowCount() === 0) {
      $key = (string)($p['key'] ?? 'booking_confirmation');
      $ins = $pdo->prepare('INSERT INTO email_templates (id, `key`, name, description, subject, body_html, is_active) VALUES (?,?,?,?,?,?,?)');
      try {
        $ins->execute([$id, $key, $name ?: 'Booking Confirmation', $desc, $subject, $html, $active]);
      } catch (Throwable $e) {
        /* id existed but no row change */
      }
    }
    ylt_ok(['ok' => true, 'id' => $id]);
  }
} catch (Throwable $e) {
  ylt_fail(500, 'Template save failed.');
}

ylt_fail(405, 'Method not allowed.');
