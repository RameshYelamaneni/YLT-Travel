import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Briefcase, Download, Loader2, Plus, Shield, Trash2, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Drawer } from '../erp/ui';

type Queue = 'partner' | 'agent' | 'insurance';

interface PartnerApp {
  id: string;
  email: string;
  name: string;
  agency_name: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  commission_rate: number;
  created_at: string;
  bus_enabled?: number | boolean;
  hotel_enabled?: number | boolean;
  car_enabled?: number | boolean;
  partner_kind?: string;
  source?: string;
  aadhaar_url?: string;
  pan_url?: string;
  gst_url?: string;
  aadhaar_filename?: string;
  pan_filename?: string;
  gst_filename?: string;
  msme?: number | boolean;
  corporate?: number | boolean;
  whatsapp_optin?: number | boolean;
  terms_accepted?: number | boolean;
  reject_reason?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  application?: Record<string, unknown>;
}

function kindLabel(kind?: string) {
  if (kind === 'operator') return 'Bus operator';
  if (kind === 'hotel') return 'Hotel partner';
  if (kind === 'insurance') return 'Insurance partner';
  if (kind === 'agent') return 'Travel agent';
  return kind || 'Partner';
}

function queueMeta(queue: Queue) {
  if (queue === 'agent') {
    return {
      title: 'Agent applications',
      body: 'Travel-agent KYC from agent.ylttravels.com Sign Up. Approve unlocks the agent portal.',
    };
  }
  if (queue === 'insurance') {
    return {
      title: 'Insurance applications',
      body: 'Insurance partner KYC. Access stays locked until YLT approves.',
    };
  }
  return {
    title: 'Partner applications',
    body: 'Bus operator and hotel partner KYC from public Join / registration. Partner ERP stays locked until Approve.',
  };
}

function fileKind(name?: string): 'pdf' | 'image' | 'word' | 'other' {
  const n = String(name || '').toLowerCase();
  if (/\.pdf$/.test(n)) return 'pdf';
  if (/\.(jpe?g|png|webp)$/.test(n)) return 'image';
  if (/\.docx?$/.test(n)) return 'word';
  return 'other';
}

function yesNo(v: unknown) {
  if (v === true || v === 1 || v === '1' || v === 'yes') return 'Yes';
  if (v === false || v === 0 || v === '0' || v === 'no') return 'No';
  return '—';
}

function appVal(p: PartnerApp, key: string): unknown {
  const extra = p.application || {};
  if (extra[key] !== undefined && extra[key] !== null && extra[key] !== '') return extra[key];
  return (p as unknown as Record<string, unknown>)[key];
}

function KycFilePreview({ url, filename, label }: { url?: string; filename?: string; label: string }) {
  const hasFile = Boolean(url);
  const type = fileKind(filename || url);
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        {hasFile && (
          <a className="btn-ghost text-xs" href={url} target="_blank" rel="noreferrer" download={filename || true}>
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        )}
      </div>
      <p className="mb-2 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{hasFile ? (filename || url) : ''}</p>
      {!hasFile && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No file uploaded.</p>}
      {hasFile && type === 'word' && (
        <p className="rounded-lg border px-3 py-4 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          Preview not available in browser for Word documents. Use Download to open the file.
        </p>
      )}
      {hasFile && type === 'image' && <img src={url} alt={label} className="max-h-80 w-full rounded-lg object-contain" />}
      {hasFile && type === 'pdf' && (
        <object data={url} type="application/pdf" className="h-80 w-full rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <iframe title={label} src={url} className="h-80 w-full rounded-lg border-0" />
        </object>
      )}
      {hasFile && type === 'other' && (
        <p className="rounded-lg border px-3 py-4 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          Preview not available in browser. Use Download to open the file.
        </p>
      )}
    </div>
  );
}

function statusTone(status: string) {
  if (status === 'active' || status === 'approved') return 'bg-emerald-500/15 text-emerald-600';
  if (status === 'rejected') return 'bg-red-500/15 text-red-600';
  return 'bg-amber-500/15 text-amber-600';
}

function statusLabel(status: string) {
  if (status === 'active') return 'approved';
  return status || 'pending';
}

export default function KycQueueTab({ queue }: { queue: Queue }) {
  const { user } = useAuth();
  const coreAdmin = String(user?.role || 'admin').toLowerCase() === 'admin' || !user?.role;
  const meta = queueMeta(queue);
  const [rows, setRows] = useState<PartnerApp[]>([]);
  const [live, setLive] = useState<PartnerApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [open, setOpen] = useState<PartnerApp | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    email: '', password: '', name: '', agency_name: '', phone: '', city: '',
    partner_kind: 'operator', commission_rate: 0.08, bus_enabled: true, hotel_enabled: false, car_enabled: false,
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(`/api/auth/partners?queue=${queue}`);
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error ?? 'Load failed.');
      else setRows(data.partners ?? []);
      if (coreAdmin && queue === 'partner') {
        const liveRes = await apiFetch('/api/auth/partners?queue=live');
        const liveData = await liveRes.json().catch(() => ({}));
        setLive(Array.isArray(liveData.partners) ? liveData.partners : []);
      } else {
        setLive([]);
      }
    } catch {
      setError('Network error.');
    }
    setLoading(false);
  }
  useEffect(() => { void load(); }, [queue]);

  const visible = useMemo(() => {
    const list = rows.filter((p) => {
      const st = p.status === 'active' ? 'approved' : p.status;
      if (filter === 'all') return true;
      if (filter === 'approved') return st === 'approved';
      return st === filter;
    });
    const rank = (s: string) => (s === 'pending' ? 0 : s === 'rejected' ? 1 : 2);
    return [...list].sort((a, b) => rank(a.status) - rank(b.status) || String(b.created_at).localeCompare(String(a.created_at)));
  }, [rows, filter]);

  async function approve(p: PartnerApp) {
    setBusy(true); setError(null);
    try {
      const res = await apiFetch(`/api/auth/partners/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) setError(data.error ?? 'Approve failed.');
      else { setOpen(null); await load(); }
    } catch { setError('Network error.'); }
    setBusy(false);
  }

  async function reject(p: PartnerApp) {
    const reason = rejectReason.trim();
    if (!reason) { setError('Enter a reject reason.'); return; }
    setBusy(true); setError(null);
    try {
      const res = await apiFetch(`/api/auth/partners/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', reject_reason: reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) setError(data.error ?? 'Reject failed.');
      else { setOpen(null); setRejectReason(''); await load(); }
    } catch { setError('Network error.'); }
    setBusy(false);
  }

  async function createLive() {
    if (!draft.email || !draft.password || !draft.name) { setError('Email, password, and name are required.'); return; }
    setSaving(true); setError(null);
    try {
      const res = await apiFetch('/api/auth/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error ?? 'Create failed.');
      else {
        setShowAdd(false);
        setDraft({ email: '', password: '', name: '', agency_name: '', phone: '', city: '', partner_kind: 'operator', commission_rate: 0.08, bus_enabled: true, hotel_enabled: false, car_enabled: false });
        await load();
      }
    } catch { setError('Network error.'); }
    setSaving(false);
  }

  async function removeLive(id: string) {
    if (!confirm('Delete this admin-created partner?')) return;
    try {
      await apiFetch(`/api/auth/partners/${id}`, { method: 'DELETE' });
      await load();
    } catch { setError('Network error.'); }
  }

  async function toggleLiveStatus(p: PartnerApp) {
    const next = p.status === 'active' ? 'suspended' : 'active';
    try {
      await apiFetch(`/api/auth/partners/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
      await load();
    } catch { setError('Network error.'); }
  }

  if (loading) return <div className="surface p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>;

  const pendingCount = rows.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              <Briefcase className="h-5 w-5 text-crimson-600" /> {meta.title}
            </h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{meta.body}</p>
          </div>
          {coreAdmin && queue === 'partner' && (
            <button onClick={() => setShowAdd(true)} className="btn-primary text-xs"><Plus className="h-4 w-4" /> Add Partner</button>
          )}
        </div>
        {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"><AlertCircle className="h-4 w-4" /> {error}</div>}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {(['pending', 'all', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 font-semibold capitalize ${filter === f ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {f}{f === 'pending' ? ` · ${pendingCount}` : ''}
            </button>
          ))}
        </div>
        <div className="mt-5 overflow-x-auto">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              {filter === 'pending' ? 'No pending KYC applications in this queue.' : 'No applications in this filter.'}
            </p>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Kind</th>
                  <th className="pb-3 pr-4 font-medium">Company</th>
                  <th className="pb-3 pr-4 font-medium">City</th>
                  <th className="pb-3 pr-4 font-medium">Submitted</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer border-b hover:bg-emerald-50/60"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => { setOpen(p); setRejectReason(p.reject_reason || ''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(p); setRejectReason(p.reject_reason || ''); } }}
                  >
                    <td className="py-3 pr-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                    <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{kindLabel(p.partner_kind)}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{p.agency_name || '—'}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{p.city || '—'}</td>
                    <td className="py-3 pr-4 text-xs">{p.created_at ? new Date(p.created_at).toLocaleString('en-IN') : '—'}</td>
                    <td className="py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(p.status)}`}>{statusLabel(p.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {coreAdmin && queue === 'partner' && (
        <div className="surface p-6">
          <h4 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Admin-created live partners</h4>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Created with Add Partner. Already active — not part of the public KYC queue.</p>
          {live.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>None yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Kind</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {live.map((p) => (
                    <tr key={p.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-3 pr-4">{p.name}</td>
                      <td className="py-3 pr-4">{p.email}</td>
                      <td className="py-3 pr-4 text-xs">{kindLabel(p.partner_kind)}</td>
                      <td className="py-3 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(p.status)}`}>{p.status}</span></td>
                      <td className="py-3">
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => void toggleLiveStatus(p)} className="rounded-lg p-1.5 transition hover:bg-[var(--bg-raised)]" title={p.status === 'active' ? 'Suspend' : 'Activate'} style={{ color: 'var(--text-muted)' }}><Shield className="h-4 w-4" /></button>
                          <button type="button" onClick={() => void removeLive(p.id)} className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open ? open.name : 'Application'} wide>
        {open && (
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-crimson-700">YLT Travels · KYC review</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Partner type</dt><dd className="font-semibold">{kindLabel(String(appVal(open, 'partner_kind') || open.partner_kind))}</dd></div>
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Status</dt><dd><span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(open.status)}`}>{statusLabel(open.status)}</span></dd></div>
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Full name</dt><dd>{String(appVal(open, 'name') || open.name)}</dd></div>
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Mobile</dt><dd>{String(appVal(open, 'phone') || open.phone || '—')}</dd></div>
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Email</dt><dd>{String(appVal(open, 'email') || open.email)}</dd></div>
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Company</dt><dd>{String(appVal(open, 'agency_name') || open.agency_name || '—')}</dd></div>
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>City</dt><dd>{String(appVal(open, 'city') || open.city || '—')}</dd></div>
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>MSME</dt><dd>{yesNo(appVal(open, 'msme'))}</dd></div>
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Corporate entity</dt><dd>{yesNo(appVal(open, 'corporate'))}</dd></div>
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>WhatsApp</dt><dd>{yesNo(appVal(open, 'whatsapp_optin'))}</dd></div>
              <div><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Terms accepted</dt><dd>{yesNo(appVal(open, 'terms') ?? open.terms_accepted)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Submitted</dt><dd>{open.created_at ? new Date(open.created_at).toLocaleString('en-IN') : '—'}</dd></div>
              {open.reject_reason && <div className="sm:col-span-2"><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Reject reason</dt><dd>{open.reject_reason}</dd></div>}
            </dl>
            <KycFilePreview url={String(appVal(open, 'gst_url') || open.gst_url || '')} filename={String(appVal(open, 'gst_filename') || open.gst_filename || '')} label="GST certificate" />
            <KycFilePreview url={String(appVal(open, 'pan_url') || open.pan_url || '')} filename={String(appVal(open, 'pan_filename') || open.pan_filename || '')} label="PAN" />
            <KycFilePreview url={String(appVal(open, 'aadhaar_url') || open.aadhaar_url || '')} filename={String(appVal(open, 'aadhaar_filename') || open.aadhaar_filename || '')} label="Aadhaar" />
            {open.status === 'pending' && (
              <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <label className="block">
                  <span className="label-text">Reject reason</span>
                  <textarea className="input-field mt-1.5 min-h-[72px] text-sm" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Shown to the applicant" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => void approve(open)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Approve</button>
                  <button type="button" disabled={busy} onClick={() => void reject(open)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Reject</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {showAdd && (
        <div className="erp-overlay-enter erp-backdrop fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setShowAdd(false)}>
          <div className="erp-modal-enter erp-modal-card w-full max-w-lg rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add Partner</h3>
              <button onClick={() => setShowAdd(false)} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Creates an already-active partner. This is not a public KYC application.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block"><span className="label-text">Name *</span><input className="input-field mt-1.5 text-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
              <label className="block"><span className="label-text">Email *</span><input type="email" className="input-field mt-1.5 text-sm" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
              <label className="block"><span className="label-text">Password *</span><input type="password" className="input-field mt-1.5 text-sm" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} /></label>
              <label className="block"><span className="label-text">Kind</span>
                <select className="input-field mt-1.5 text-sm" value={draft.partner_kind} onChange={(e) => setDraft({ ...draft, partner_kind: e.target.value })}>
                  <option value="operator">Bus operator</option>
                  <option value="hotel">Hotel partner</option>
                  <option value="agent">Travel agent</option>
                  <option value="insurance">Insurance partner</option>
                </select>
              </label>
              <label className="block"><span className="label-text">Agency Name</span><input className="input-field mt-1.5 text-sm" value={draft.agency_name} onChange={(e) => setDraft({ ...draft, agency_name: e.target.value })} /></label>
              <label className="block"><span className="label-text">Phone</span><input className="input-field mt-1.5 text-sm" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
              <label className="block"><span className="label-text">City</span><input className="input-field mt-1.5 text-sm" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></label>
              <label className="block"><span className="label-text">Commission Rate</span><input type="number" step="0.01" className="input-field mt-1.5 text-sm" value={draft.commission_rate} onChange={(e) => setDraft({ ...draft, commission_rate: +e.target.value })} /></label>
              <div className="col-span-2 flex flex-wrap gap-3 pt-1 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.bus_enabled} onChange={(e) => setDraft({ ...draft, bus_enabled: e.target.checked })} /> Bus ERP</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.hotel_enabled} onChange={(e) => setDraft({ ...draft, hotel_enabled: e.target.checked })} /> Hotel ERP</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.car_enabled} onChange={(e) => setDraft({ ...draft, car_enabled: e.target.checked })} /> Car fleet</label>
              </div>
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button onClick={() => void createLive()} disabled={saving} className="btn-primary mt-5 w-full text-sm disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Partner</button>
          </div>
        </div>
      )}
    </div>
  );
}
