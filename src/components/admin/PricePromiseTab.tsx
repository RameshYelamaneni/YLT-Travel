import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { applySaverSettings, saverSettings } from '../../lib/yltSaver';
import { formatINR } from '../../lib/format';
import {
  fetchPricePromises, fetchPromiseScreenshot, reviewPricePromise, type PromiseRow,
} from '../../lib/attraction';

export default function PricePromiseTab() {
  const current = saverSettings();
  const [rupees, setRupees] = useState(String(current.rupees));
  const [cap, setCap] = useState(String(current.promiseCap));
  const [credit, setCredit] = useState(String(current.referralCredit));
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [rows, setRows] = useState<PromiseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<{ id: string; url: string } | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<Record<string, 'difference' | 'under50'>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, promises] = await Promise.all([
        apiFetch('/api/settings'),
        fetchPricePromises(),
      ]);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        applySaverSettings(data);
        const s = saverSettings();
        setRupees(String(s.rupees));
        setCap(String(s.promiseCap));
        setCredit(String(s.referralCredit));
      }
      setRows(promises);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the queue.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => () => { if (shot?.url) URL.revokeObjectURL(shot.url); }, [shot]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNote(null);
    try {
      const body = {
        ylt_saver_rupees: Math.max(0, Math.min(500, Math.round(Number(rupees) || 0))),
        price_promise_cap: Math.max(0, Math.min(2000, Math.round(Number(cap) || 0))),
        referral_credit: Math.max(0, Math.min(500, Math.round(Number(credit) || 0))),
      };
      const res = await apiFetch('/api/settings', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setNote(String(data.error || 'Could not save settings.'));
      } else {
        applySaverSettings({ ...body, ...data });
        setNote('Saved. Seat fares use this YLT Saver amount.');
      }
    } catch {
      setNote('Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function openShot(id: string) {
    setError(null);
    try {
      if (shot?.url) URL.revokeObjectURL(shot.url);
      const url = await fetchPromiseScreenshot(id);
      setShot({ id, url });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the screenshot.');
    }
  }

  async function review(row: PromiseRow, action: 'approve' | 'reject') {
    setError(null);
    const res = await reviewPricePromise({
      id: row.id,
      action,
      mode: mode[row.id] || 'difference',
      reason: reason[row.id] || '',
    });
    if (!res.ok) { setError(res.message); return; }
    setNote(res.coupon_code ? `${res.message} Code ${res.coupon_code} for ${formatINR(res.coupon_value || 0)}.` : res.message);
    await load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveSettings} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
        <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>YLT Saver</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Rupees off our listed seat fare. The floor still applies: never more than 8% of the fare, and never below 80% of that fare. Customers see the struck price before they pay.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Saver rupees
            <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }} value={rupees} onChange={(e) => setRupees(e.target.value)} inputMode="numeric" />
          </label>
          <label className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Price-promise cap (₹)
            <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }} value={cap} onChange={(e) => setCap(e.target.value)} inputMode="numeric" />
          </label>
          <label className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Refer-a-friend credit (₹)
            <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }} value={credit} onChange={(e) => setCredit(e.target.value)} inputMode="numeric" />
          </label>
        </div>
        <button type="submit" disabled={saving} className="btn-primary mt-3 text-xs">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </form>

      <div>
        <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Price promise queue</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Proofs stay pending until you approve or reject. Approve writes a one-time coupon. Nothing is looked up on other sites.
        </p>
        {note && <p className="mt-2 text-sm text-emerald-700">{note}</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Loader2 className="h-4 w-4 animate-spin" /> Loading proofs</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>No proofs yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-2xl border p-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{row.route}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {row.travel_date || 'Date not set'} · Their fare {formatINR(row.their_price)} · Our fare {formatINR(row.our_fare)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.contact_email || 'No email'} · {row.status}</p>
                    {row.coupon_code && <p className="mt-1 text-xs font-semibold text-emerald-700">Coupon {row.coupon_code} · {formatINR(row.coupon_value)}</p>}
                    {row.reject_reason && <p className="mt-1 text-xs text-red-600">{row.reject_reason}</p>}
                  </div>
                  {row.has_file && (
                    <button type="button" className="text-xs font-semibold text-crimson-600" onClick={() => openShot(row.id)}>View screenshot</button>
                  )}
                </div>
                {shot?.id === row.id && (
                  <img src={shot.url} alt="Fare proof" className="mt-2 max-h-64 rounded-lg border object-contain" style={{ borderColor: 'var(--border)' }} />
                )}
                {row.status === 'pending' && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-3 text-xs">
                      <label className="flex items-center gap-1.5">
                        <input type="radio" name={`mode-${row.id}`} checked={(mode[row.id] || 'difference') === 'difference'} onChange={() => setMode((m) => ({ ...m, [row.id]: 'difference' }))} />
                        Coupon equal to the difference, capped
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="radio" name={`mode-${row.id}`} checked={mode[row.id] === 'under50'} onChange={() => setMode((m) => ({ ...m, [row.id]: 'under50' }))} />
                        ₹50 under their claimed price, capped
                      </label>
                    </div>
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-xs"
                      style={{ borderColor: 'var(--border)' }}
                      placeholder="Reject reason (required to reject)"
                      value={reason[row.id] || ''}
                      onChange={(e) => setReason((r) => ({ ...r, [row.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary text-xs" onClick={() => review(row, 'approve')}>Approve</button>
                      <button type="button" className="btn-ghost text-xs" onClick={() => review(row, 'reject')}>Reject</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
