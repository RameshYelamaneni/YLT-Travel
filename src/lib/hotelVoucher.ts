import type { HotelBooking } from '../types-hotel';

function fmt(d: string): string {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtINR(n: number) { return Math.round(n).toLocaleString('en-IN'); }

export function printHotelVoucher(b: HotelBooking): void {
  const stars = '\u2605'.repeat(b.hotel_stars) + '\u2606'.repeat(5 - b.hotel_stars);
  const gstLabel = b.rate_per_night >= 7500 ? '18% GST' : '12% GST';
  const w = window.open('', '_blank', 'width=520,height=900');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>YLT Hotel Voucher ${b.pnr}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact}
body{font-family:Inter,sans-serif;background:#0f0f12;padding:24px;color:#fff}
.v{max-width:480px;margin:0 auto;background:linear-gradient(180deg,#1a1a20,#0f0f12);border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,.06)}
.hero{background:linear-gradient(135deg,#0369a1,#075985);padding:28px}.brand{display:flex;align-items:center;gap:10px}.brand .logo{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px}.brand h1{font-size:18px;font-weight:800}
.pnr{font-size:30px;font-weight:800;letter-spacing:4px;margin-top:16px}.badge{display:inline-block;background:rgba(34,197,94,.15);color:#22c55e;border-radius:999px;padding:3px 12px;font-size:10px;font-weight:700;text-transform:uppercase;margin-top:10px}
.hh{padding:24px 28px;border-bottom:1px solid rgba(255,255,255,.06)}.hh .n{font-size:20px;font-weight:700}.hh .s{color:#fbbf24;font-size:14px}
.dates{display:flex;padding:20px 28px;gap:12px}.dc{flex:1;background:rgba(255,255,255,.04);border-radius:14px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,.06)}.dc .l{font-size:9px;color:#6b6b75;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px}.dc .val{font-size:14px;font-weight:700}
.nb{display:flex;align-items:center;justify-content:center;min-width:52px}.nb .num{background:linear-gradient(135deg,#0369a1,#075985);border-radius:12px;padding:8px 14px;font-size:18px;font-weight:800}.nb .sub{font-size:9px;color:#a8a8b0;text-transform:uppercase;margin-top:4px;text-align:center}
.body{padding:8px 28px 20px}.row{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}.row .l{color:#6b6b75;font-size:11px;text-transform:uppercase}.row .r{font-weight:600;text-align:right;max-width:60%}
.pri{padding:0 28px 20px}.pr{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}.pr .l{color:#a8a8b0}.pr .r{font-weight:600}.pr.tot{border-top:1px solid rgba(255,255,255,.12);margin-top:8px;padding-top:12px;font-size:20px;font-weight:800}.pr.tot .r{color:#0ea5e9}
.ft{text-align:center;padding:16px 28px 24px;font-size:10px;color:#4a4a52;line-height:1.6}
@media print{body{background:#0f0f12;padding:0}}
</style></head><body>
<div class="v">
<div class="hero"><div class="brand"><div class="logo">Y</div><div><h1>YLT Hotels</h1></div></div>
<div class="pnr">${b.pnr}</div><span class="badge">${b.status}</span></div>
<div class="hh"><div class="n">${b.hotel_name}</div><div class="s">${stars}</div></div>
<div class="dates"><div class="dc"><div class="l">Check-in</div><div class="val">${fmt(b.check_in)}</div></div>
<div class="nb"><div><div class="num">${b.nights}</div><div class="sub">${b.nights === 1 ? 'Night' : 'Nights'}</div></div></div>
<div class="dc"><div class="l">Check-out</div><div class="val">${fmt(b.check_out)}</div></div></div>
<div class="body">
<div class="row"><span class="l">Guest</span><span class="r">${b.guest_name}</span></div>
<div class="row"><span class="l">Phone</span><span class="r">${b.guest_phone}</span></div>
<div class="row"><span class="l">Room</span><span class="r">${b.room_type} (${b.bed_type})</span></div>
<div class="row"><span class="l">Guests</span><span class="r">${b.guests}</span></div>
${b.special_requests ? `<div class="row"><span class="l">Requests</span><span class="r">${b.special_requests}</span></div>` : ''}</div>
<div class="pri">
<div class="pr"><span class="l">Rate/night</span><span class="r">Rs ${fmtINR(b.rate_per_night)}</span></div>
<div class="pr"><span class="l">x ${b.nights} nights</span><span class="r">Rs ${fmtINR(b.subtotal)}</span></div>
<div class="pr"><span class="l">${gstLabel}</span><span class="r">Rs ${fmtINR(b.gst)}</span></div>
<div class="pr tot"><span>Total</span><span class="r">Rs ${fmtINR(b.total)}</span></div></div>
<div class="ft">YLT Hotels &middot; YLT Transit OS<br>Present this voucher at check-in. Valid ID required.<br>Booked on ${fmt(b.created_at)}</div>
</div><script>window.onload=function(){setTimeout(function(){window.print()},400)};</script></body></html>`);
  w.document.close();
}
