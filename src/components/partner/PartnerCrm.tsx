import { useEffect, useMemo, useState } from 'react';
import { BookUser, Plus, Search, Users, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { fmtINR } from '../../store/partnerHotelStore';
import { usePartnerCrmStore, type PartnerCustomer } from '../../store/partnerCrmStore';
import { ErpLoader } from '../operator/ErpLoader';

const inputCls = 'w-full rounded-lg border bg-[var(--bg-raised)] px-3 py-2 text-sm outline-none focus:border-crimson-500';

export default function PartnerCrm({ mode = 'customers' }: { mode?: 'customers' | 'guestbook' }) {
  const { user } = useAuth();
  const { customers, loading, lastError, load, save, remove } = usePartnerCrmStore();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<PartnerCustomer> | null>(null);
  const [open, setOpen] = useState<PartnerCustomer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const pid = user?.user_id || '';
    if (pid) void load(pid);
  }, [user?.user_id, load]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return customers.filter((c) => {
      if (mode === 'guestbook' && !(c.stays?.length || c.trips?.length)) return false;
      if (!s) return true;
      return [c.name, c.email, c.phone, c.city, ...(c.tags || [])].join(' ').toLowerCase().includes(s);
    });
  }, [customers, q, mode]);

  async function submit() {
    if (!editing?.name?.trim()) { setFormError('Customer name required.'); return; }
    setSaving(true); setFormError(null);
    try {
      await save({
        id: editing.id,
        name: editing.name.trim(),
        email: editing.email || '',
        phone: editing.phone || '',
        city: editing.city || '',
        tags: editing.tags || [],
        notes: editing.notes || '',
      });
      setEditing(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not save customer.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !customers.length) return <ErpLoader label="Loading CRM…" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">CRM</p>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {mode === 'guestbook' ? 'Guest book' : 'Customers'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {mode === 'guestbook'
              ? 'Stays and trips booked with you only. Other hotels’ history for the same traveller stays invisible.'
              : 'One traveller can book many partners. This list is your membership only — notes, tags, and stays never include another hotel’s guests.'}
          </p>
        </div>
        <button className="btn-primary text-sm" onClick={() => { setEditing({ name: '', email: '', phone: '', city: '', tags: [], notes: '' }); setFormError(null); }}>
          <Plus className="h-4 w-4" /> Add customer
        </button>
      </div>

      {(lastError || formError) && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700">{formError || lastError}</div>
      )}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className={inputCls + ' pl-9'} placeholder="Search name, phone, email, city…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Last stay</th>
              <th className="px-4 py-3">Last trip</th>
              <th className="px-4 py-3">History</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="cursor-pointer border-b hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)' }} onClick={() => setOpen(c)}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.email || '—'}</p>
                </td>
                <td className="px-4 py-3">{c.phone || '—'}</td>
                <td className="px-4 py-3">{c.city || '—'}</td>
                <td className="px-4 py-3">{c.last_stay || '—'}</td>
                <td className="px-4 py-3">{c.last_trip || '—'}</td>
                <td className="px-4 py-3">{(c.stays?.length || 0) + (c.trips?.length || 0)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {mode === 'guestbook'
                    ? 'No guests with stays yet. Walk-ins and bus contacts appear here after they book with you.'
                    : 'No customers yet. Add one or save a walk-in. The same email at another hotel does not appear here.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="erp-overlay-enter erp-backdrop fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setEditing(null)}>
          <div className="erp-modal-enter erp-modal-card w-full max-w-lg rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{editing.id ? 'Edit customer' : 'Add customer'}</h3>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>
            {formError && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <div className="space-y-3">
              <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Name
                <input className={inputCls + ' mt-1'} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Phone
                  <input className={inputCls + ' mt-1'} value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </label>
                <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Email
                  <input className={inputCls + ' mt-1'} value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </label>
              </div>
              <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>City
                <input className={inputCls + ' mt-1'} value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
              </label>
              <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tags (comma)
                <input className={inputCls + ' mt-1'} value={(editing.tags || []).join(', ')} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
              </label>
              <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Notes
                <textarea className={inputCls + ' mt-1 min-h-[80px]'} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-ghost text-sm" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={saving} onClick={() => void submit()}>{saving ? 'Saving…' : 'Save to database'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="erp-overlay-enter erp-backdrop fixed inset-0 z-50 flex justify-end" onClick={() => setOpen(null)}>
          <aside className="erp-modal-enter erp-modal-card h-full w-full max-w-md overflow-y-auto border-l bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">{open.name}</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{open.phone || 'No phone'} · {open.email || 'No email'}</p>
                {open.city && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{open.city}</p>}
              </div>
              <button onClick={() => setOpen(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="btn-ghost text-sm" onClick={() => { setEditing(open); setOpen(null); }}><Users className="h-4 w-4" /> Edit</button>
              <button className="btn-ghost text-sm text-red-600" onClick={() => { void remove(open.id); setOpen(null); }}>Delete</button>
            </div>
            <h4 className="mt-6 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Hotel stays</h4>
            <ul className="mt-2 space-y-2">
              {(open.stays || []).map((s) => (
                <li key={s.id} className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--border)' }}>
                  <p className="font-semibold">{s.hotelName} · {s.pnr}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.checkIn} · {s.nights}n · ₹{fmtINR(s.amount)} · {s.status}</p>
                </li>
              ))}
              {!(open.stays || []).length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hotel stays for this partner yet.</p>}
            </ul>
            <h4 className="mt-6 flex items-center gap-1 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}><BookUser className="h-3.5 w-3.5" /> Bus trips</h4>
            <ul className="mt-2 space-y-2">
              {(open.trips || []).map((t, i) => (
                <li key={t.id || t.pnr || i} className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--border)' }}>
                  <p className="font-semibold">{t.pnr || 'Trip'} · {t.from_city} → {t.to_city}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.travel_date} · ₹{fmtINR(Number(t.total_amount || 0))} · {t.status}</p>
                </li>
              ))}
              {!(open.trips || []).length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matching bus bookings for this contact.</p>}
            </ul>
            {open.notes && (
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Your notes</h4>
                <p className="mt-2 text-sm">{open.notes}</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
