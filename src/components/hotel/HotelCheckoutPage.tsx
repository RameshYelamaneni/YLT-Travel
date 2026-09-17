import { useState } from 'react';
import { ArrowLeft, CreditCard, Smartphone, Landmark, BedDouble, Users, Star, Shield, Loader2 } from 'lucide-react';
import { useHotelStore, calcBookingPricing, nightsBetween } from '../../store/hotelStore';
import { formatINR } from '../../lib/format';

export default function HotelCheckoutPage({ hotelId, roomId, go }: { hotelId: string; roomId: string; go: (v: any) => void }) {
  const store = useHotelStore();
  const hotel = store.getHotel(hotelId);
  const room = hotel?.rooms.find(r => r.id === roomId);

  const [form, setForm] = useState({
    guest_name: '', guest_email: '', guest_phone: '',
    check_in: store.filters.checkIn || '', check_out: store.filters.checkOut || '',
    guests: store.filters.guests || 2, special_requests: '', payment_method: 'upi',
    card_number: '', card_expiry: '', card_cvv: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!hotel || !room) return (
    <div className="grid min-h-[60vh] place-items-center" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="text-center">
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Room not found</p>
        <button onClick={() => go({ name: 'hotels' })} className="mt-3 rounded-lg bg-crimson-600 px-4 py-2 text-sm text-white">Back to Search</button>
      </div>
    </div>
  );

  const h = hotel;
  const r = room;
  const today = new Date().toISOString().slice(0, 10);
  const nights = form.check_in && form.check_out ? nightsBetween(form.check_in, form.check_out) : 1;
  const pricing = calcBookingPricing(r.price_per_night, nights);

  function upd(key: string, value: string | number) { setForm(f => ({ ...f, [key]: value })); setErrors(e => { const n = { ...e }; delete n[key]; return n; }); }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.guest_name.trim()) e.guest_name = 'Required';
    if (!form.guest_email.trim() || !/\S+@\S+\.\S+/.test(form.guest_email)) e.guest_email = 'Valid email required';
    if (!form.guest_phone.trim() || form.guest_phone.replace(/\D/g, '').length < 10) e.guest_phone = 'Valid phone required';
    if (!form.check_in) e.check_in = 'Required';
    if (!form.check_out) e.check_out = 'Required';
    if (form.check_in && form.check_out && form.check_out <= form.check_in) e.check_out = 'Must be after check-in';
    if (form.guests < 1) e.guests = 'Min 1';
    if (form.guests > r.max_guests) e.guests = `Max ${r.max_guests} guests`;
    if (form.payment_method === 'card') {
      if (form.card_number.replace(/\s/g, '').length < 16) e.card_number = 'Enter 16 digits';
      if (!form.card_expiry) e.card_expiry = 'Required';
      if (form.card_cvv.length < 3) e.card_cvv = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setTimeout(() => {
      const booking = store.createBooking({
        hotel: h, room: r, guest_name: form.guest_name, guest_email: form.guest_email,
        guest_phone: form.guest_phone, check_in: form.check_in, check_out: form.check_out,
        guests: form.guests, special_requests: form.special_requests, payment_method: form.payment_method,
      });
      setSubmitting(false);
      go({ name: 'hotelConfirmation', booking });
    }, 1200);
  }

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );

  const inputCls = (err?: string) => `w-full rounded-lg border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-1 focus:ring-crimson-500 ${err ? 'border-red-500' : ''}`;
  const inputSty = { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <button onClick={() => go({ name: 'hotelDetails', hotelId })}
          className="mb-6 flex items-center gap-2 text-sm font-medium transition hover:text-crimson-500" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="h-4 w-4" /> Back to Hotel
        </button>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <h2 className="mb-4 font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Guest Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name" error={errors.guest_name}>
                  <input value={form.guest_name} onChange={e => upd('guest_name', e.target.value)} className={inputCls(errors.guest_name)} style={inputSty} placeholder="John Doe" />
                </Field>
                <Field label="Email" error={errors.guest_email}>
                  <input type="email" value={form.guest_email} onChange={e => upd('guest_email', e.target.value)} className={inputCls(errors.guest_email)} style={inputSty} placeholder="john@email.com" />
                </Field>
                <Field label="Phone (+91)" error={errors.guest_phone}>
                  <input type="tel" value={form.guest_phone} onChange={e => upd('guest_phone', e.target.value)} className={inputCls(errors.guest_phone)} style={inputSty} placeholder="9876543210" />
                </Field>
                <Field label="Guests" error={errors.guests}>
                  <input type="number" min={1} max={r.max_guests} value={form.guests} onChange={e => upd('guests', +e.target.value)} className={inputCls(errors.guests)} style={inputSty} />
                </Field>
                <Field label="Check-in" error={errors.check_in}>
                  <input type="date" min={today} value={form.check_in} onChange={e => upd('check_in', e.target.value)} className={inputCls(errors.check_in)} style={inputSty} />
                </Field>
                <Field label="Check-out" error={errors.check_out}>
                  <input type="date" min={form.check_in || today} value={form.check_out} onChange={e => upd('check_out', e.target.value)} className={inputCls(errors.check_out)} style={inputSty} />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Special Requests (optional)" error={undefined}>
                  <textarea rows={3} value={form.special_requests} onChange={e => upd('special_requests', e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm" style={inputSty} placeholder="Early check-in, extra pillows, etc." />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <h2 className="mb-4 font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Payment Method</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {([['upi', 'UPI', Smartphone], ['card', 'Credit Card', CreditCard], ['netbanking', 'Net Banking', Landmark]] as const).map(([val, label, Icon]) => (
                  <button key={val} onClick={() => upd('payment_method', val)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm font-medium transition ${form.payment_method === val ? 'border-crimson-500 bg-crimson-500/5' : 'hover:bg-[var(--bg-raised)]'}`}
                    style={{ borderColor: form.payment_method === val ? undefined : 'var(--border)', color: 'var(--text-primary)' }}>
                    <Icon className={`h-5 w-5 ${form.payment_method === val ? 'text-crimson-500' : ''}`} style={form.payment_method === val ? undefined : { color: 'var(--text-muted)' }} />
                    {label}
                  </button>
                ))}
              </div>
              {form.payment_method === 'card' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Field label="Card Number" error={errors.card_number}>
                    <input value={form.card_number} onChange={e => upd('card_number', e.target.value)} maxLength={19} className={inputCls(errors.card_number)} style={inputSty} placeholder="4242 4242 4242 4242" />
                  </Field>
                  <Field label="Expiry" error={errors.card_expiry}>
                    <input value={form.card_expiry} onChange={e => upd('card_expiry', e.target.value)} maxLength={5} className={inputCls(errors.card_expiry)} style={inputSty} placeholder="MM/YY" />
                  </Field>
                  <Field label="CVV" error={errors.card_cvv}>
                    <input type="password" value={form.card_cvv} onChange={e => upd('card_cvv', e.target.value)} maxLength={4} className={inputCls(errors.card_cvv)} style={inputSty} placeholder="***" />
                  </Field>
                </div>
              )}
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-crimson-600 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-crimson-700 disabled:opacity-60">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Processing...</> : `Confirm & Pay ${formatINR(pricing.total)}`}
            </button>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <img src={h.photos[0]} alt={h.name} className="h-40 w-full rounded-t-xl object-cover" />
              <div className="p-5">
                <h3 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>{h.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex">{Array.from({ length: h.stars }, (_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}</div>
                  {h.sla_verified && <Shield className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
                <div className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><BedDouble className="h-3 w-3" />Room</span>
                    <span style={{ color: 'var(--text-primary)' }}>{r.room_type} ({r.bed_type})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Users className="h-3 w-3" />Max Guests</span>
                    <span style={{ color: 'var(--text-primary)' }}>{r.max_guests}</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>Rate/night</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(r.price_per_night)}</span></div>
                  <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>{nights} night{nights > 1 ? 's' : ''}</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(pricing.subtotal)}</span></div>
                  <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>GST ({Math.round(pricing.gst_rate * 100)}%)</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(pricing.gst)}</span></div>
                  <div className="flex justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total</span>
                    <span className="text-lg font-bold text-crimson-500">{formatINR(pricing.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
