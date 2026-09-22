import { useState } from 'react';
import { X } from 'lucide-react';
import { formatINR } from '../lib/format';
import { submitPricePromise } from '../lib/attraction';
import { useAuth } from '../lib/auth';

export default function PricePromiseForm({
  open,
  onClose,
  route,
  date,
  ourFare,
}: {
  open: boolean;
  onClose: () => void;
  route: string;
  date: string;
  ourFare: number;
}) {
  const { user } = useAuth();
  const [theirPrice, setTheirPrice] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const price = Math.round(Number(theirPrice));
    if (!file) { setNote('Add a screenshot of the fare you found.'); return; }
    if (!Number.isFinite(price) || price < 1) { setNote('Enter the fare you found, in rupees.'); return; }
    if (file.size > 2_000_000) { setNote('Screenshot must be under 2 MB.'); return; }
    setBusy(true);
    setNote(null);
    try {
      const res = await submitPricePromise({
        route,
        travelDate: date,
        theirPrice: price,
        ourFare,
        contactEmail: email.trim(),
        screenshot: file,
      });
      setNote(res.message);
      setDone(res.ok);
    } catch {
      setNote('Could not send your proof.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close" onClick={onClose} />
      <form onSubmit={send} className="relative w-full max-w-md rounded-2xl border bg-[var(--bg-surface)] p-4 shadow-xl" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Found a lower fare?</h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Send the route, date, the price you saw, and a screenshot. We review it ourselves. We do not look it up on other sites.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border p-1" style={{ borderColor: 'var(--border)' }} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {done ? (
          <p className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-3 text-sm font-semibold text-emerald-800">{note || "We'll review your proof."}</p>
        ) : (
          <div className="mt-3 space-y-2">
            <label className="block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              Route
              <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-input)' }} value={route} readOnly />
            </label>
            <label className="block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              Date
              <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-input)' }} value={date} readOnly />
            </label>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Our seat fare on this screen: {formatINR(ourFare)}</p>
            <label className="block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              Fare you found (₹)
              <input
                inputMode="numeric"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-input)' }}
                value={theirPrice}
                onChange={(e) => setTheirPrice(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Amount in rupees"
                required
              />
            </label>
            <label className="block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              Email for a coupon if we approve
              <input
                type="email"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-input)' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
            </label>
            <label className="block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              Screenshot
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-1 block w-full text-xs"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </label>
            {note && <p className="text-xs text-red-600">{note}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full text-xs disabled:opacity-50">
              {busy ? 'Sending…' : 'Send proof'}
            </button>
            <p className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>Status stays pending until an admin reviews it. We'll review your proof.</p>
          </div>
        )}
      </form>
    </div>
  );
}
