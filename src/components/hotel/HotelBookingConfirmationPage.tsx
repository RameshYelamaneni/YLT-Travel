import { useState } from 'react';
import { CheckCircle2, Copy, Star, BedDouble, Users, Calendar, Download, Home, Shield } from 'lucide-react';
import { formatINR } from '../../lib/format';
import { printHotelVoucher } from '../../lib/hotelVoucher';
import type { HotelBooking } from '../../types-hotel';

function fmtDate(d: string) {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export default function HotelBookingConfirmationPage({ booking, go }: { booking: HotelBooking; go: (v: any) => void }) {
  const [copied, setCopied] = useState(false);

  function copyPNR() {
    navigator.clipboard.writeText(booking.pnr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)' }}>
            <CheckCircle2 className="h-10 w-10 text-emerald-400" style={{ animation: 'fadeIn 0.3s ease-in 0.3s both' }} />
          </div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Booking Confirmed!</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Your hotel reservation has been confirmed successfully.</p>
        </div>

        <div className="mb-6 rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Booking PNR</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="font-display text-3xl font-bold tracking-widest" style={{ color: 'var(--text-primary)' }}>{booking.pnr}</span>
            <button onClick={copyPNR} className="rounded-lg border p-2 transition hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)' }}>
              <Copy className={`h-4 w-4 ${copied ? 'text-emerald-400' : ''}`} style={copied ? undefined : { color: 'var(--text-muted)' }} />
            </button>
          </div>
          {copied && <p className="mt-1 text-xs text-emerald-400">Copied!</p>}
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
          {booking.hotel_photo && <img src={booking.hotel_photo} alt="" className="h-40 w-full object-cover" />}
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{booking.hotel_name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex">{Array.from({ length: booking.hotel_stars }, (_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}</div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{booking.hotel_city}</span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase text-emerald-400">{booking.status}</span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <Calendar className="mx-auto h-4 w-4 text-sky-400" />
                <p className="mt-1 text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Check-in</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmtDate(booking.check_in)}</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-lg font-bold text-white">{booking.nights}</div>
                <p className="mt-1 text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{booking.nights === 1 ? 'Night' : 'Nights'}</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <Calendar className="mx-auto h-4 w-4 text-sky-400" />
                <p className="mt-1 text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Check-out</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmtDate(booking.check_out)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2"><BedDouble className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} /><div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Room</p><p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{booking.room_type} ({booking.bed_type})</p></div></div>
              <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} /><div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Guests</p><p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{booking.guests}</p></div></div>
            </div>

            <div className="mt-4 space-y-1.5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>Guest</span><span style={{ color: 'var(--text-primary)' }}>{booking.guest_name}</span></div>
              <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>Email</span><span style={{ color: 'var(--text-primary)' }}>{booking.guest_email}</span></div>
              <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>Phone</span><span style={{ color: 'var(--text-primary)' }}>{booking.guest_phone}</span></div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Payment Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>Rate/night</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(booking.rate_per_night)}</span></div>
            <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>{booking.nights} night{booking.nights > 1 ? 's' : ''}</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(booking.subtotal)}</span></div>
            <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>GST</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(booking.gst)}</span></div>
            <div className="flex justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total Paid</span>
              <span className="text-lg font-bold text-navy-800">{formatINR(booking.total)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Payment Method</span>
              <span className="uppercase" style={{ color: 'var(--text-primary)' }}>{booking.payment_method}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Status</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">PAID</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => printHotelVoucher(booking)}
            className="flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition hover:bg-[var(--bg-raised)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <Download className="h-4 w-4" /> Download Voucher
          </button>
          <button onClick={() => go({ name: 'home' })}
            className="flex items-center justify-center gap-2 rounded-xl bg-gold-500 text-navy-950 hover:bg-gold-400">
            <Home className="h-4 w-4" /> Back to Home
          </button>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          A confirmation email will be sent to {booking.guest_email}. Present this voucher at check-in with a valid ID.
        </p>
      </div>

      <style>{`
        @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
