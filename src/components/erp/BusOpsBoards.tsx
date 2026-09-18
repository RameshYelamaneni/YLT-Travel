import { useEffect, useMemo, useState } from 'react';
import { Plus, Printer, Search } from 'lucide-react';
import { useErpStore, fmtINR, type ErpSchedule } from '../../store/erpStore';
import { usePartnerStore } from '../../store/partnerStore';
import { apiFetch } from '../../lib/api';
import { inputCls } from './ui';

export type BusExtraView = 'search' | 'print' | 'cities' | 'types' | 'cancel' | 'analytics' | 'campaigns' | 'offers' | 'deposits';

const box = { borderColor: 'var(--border)', background: 'var(--bg-surface)' as const };

export default function BusOpsBoards({ view }: { view: BusExtraView }) {
  if (view === 'search') return <ServiceSearch />;
  if (view === 'print') return <PrintDesk />;
  if (view === 'cities') return <CitiesBoard />;
  if (view === 'types') return <TypesBoard />;
  if (view === 'cancel') return <CancelBoard />;
  if (view === 'analytics') return <AnalyticsBoard />;
  if (view === 'campaigns' || view === 'offers') return <CampaignsBoard />;
  return <DepositsBoard />;
}

function Title({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{kicker}</p>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

function ServiceSearch() {
  const { routes, schedules, buses, insert } = useErpStore();
  const [src, setSrc] = useState('');
  const [dst, setDst] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ service_name: '', route_id: '', bus_id: '', departure_date: '', departure_time: '18:00', arrival_time: '06:00', depot: '', status: 'scheduled' });

  const types = [...new Set((buses || []).map((b) => (b as { bus_type?: string }).bus_type || b.layout || 'Coach'))];
  const rows = (schedules || []).filter((s) => {
    const route = routes.find((r) => r.id === s.route_id);
    const bus = buses.find((b) => b.id === s.bus_id);
    const from = (route?.from_city || '').toLowerCase();
    const to = (route?.to_city || '').toLowerCase();
    if (src && !from.includes(src.toLowerCase())) return false;
    if (dst && !to.includes(dst.toLowerCase())) return false;
    if (status !== 'all' && s.status !== status) return false;
    if (type !== 'all') {
      const t = (bus as { bus_type?: string } | undefined)?.bus_type || bus?.layout || '';
      if (t !== type) return false;
    }
    return true;
  });

  async function add() {
    await insert('erp_schedules', {
      ...f,
      id: crypto.randomUUID(),
      departure_date: f.departure_date || new Date().toISOString().slice(0, 10),
    });
    setAdding(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Title kicker="Bus" title="Service search" sub="Filter live trips from erp_schedules. Add a service to post a new departure." />
        <button className="btn-primary text-sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add service</button>
      </div>
      <div className="grid gap-2 rounded-2xl border p-4 md:grid-cols-5" style={box}>
        <input className={inputCls} placeholder="Source" value={src} onChange={(e) => setSrc(e.target.value)} />
        <input className={inputCls} placeholder="Destination" value={dst} onChange={(e) => setDst(e.target.value)} />
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="btn-ghost text-sm"><Search className="h-4 w-4" /> Search</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border" style={box}>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <th className="px-3 py-2">Service name</th>
              <th className="px-3 py-2">Bus type</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Destination</th>
              <th className="px-3 py-2">Dep</th>
              <th className="px-3 py-2">Arr</th>
              <th className="px-3 py-2">Depot</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s: ErpSchedule & { service_name?: string; depot?: string }) => {
              const route = routes.find((r) => r.id === s.route_id);
              const bus = buses.find((b) => b.id === s.bus_id);
              return (
                <tr key={s.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-3 py-2 font-semibold">{s.service_name || route?.name || 'Service'}</td>
                  <td className="px-3 py-2">{(bus as { bus_type?: string } | undefined)?.bus_type || bus?.layout || '—'}</td>
                  <td className="px-3 py-2">{route?.from_city || '—'}</td>
                  <td className="px-3 py-2">{route?.to_city || '—'}</td>
                  <td className="px-3 py-2">{s.departure_time}</td>
                  <td className="px-3 py-2">{s.arrival_time || '—'}</td>
                  <td className="px-3 py-2">{s.depot || '—'}</td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={7} className="px-3 py-8" style={{ color: 'var(--text-muted)' }}>No services in the database for these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {adding && (
        <div className="erp-overlay-enter erp-backdrop fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setAdding(false)}>
          <div className="erp-modal-enter erp-modal-card w-full max-w-lg space-y-3 rounded-2xl border p-6" style={box} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">Add service</h3>
            <input className={inputCls} placeholder="Service name" value={f.service_name} onChange={(e) => setF({ ...f, service_name: e.target.value })} />
            <select className={inputCls} value={f.route_id} onChange={(e) => setF({ ...f, route_id: e.target.value })}>
              <option value="">Route</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className={inputCls} value={f.bus_id} onChange={(e) => setF({ ...f, bus_id: e.target.value })}>
              <option value="">Coach</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input type="date" className={inputCls} value={f.departure_date} onChange={(e) => setF({ ...f, departure_date: e.target.value })} />
              <input className={inputCls} value={f.departure_time} onChange={(e) => setF({ ...f, departure_time: e.target.value })} />
              <input className={inputCls} value={f.arrival_time} onChange={(e) => setF({ ...f, arrival_time: e.target.value })} />
            </div>
            <input className={inputCls} placeholder="Depot" value={f.depot} onChange={(e) => setF({ ...f, depot: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost text-sm" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn-primary text-sm" disabled={!f.route_id} onClick={() => void add()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrintDesk() {
  const bookings = usePartnerStore((s) => (Array.isArray(s.bookings) ? s.bookings : []).filter((b) => b.type === 'bus'));
  const [q, setQ] = useState('');
  const hit = bookings.find((b) => b.pnr.toLowerCase() === q.trim().toLowerCase());
  return (
    <div className="space-y-4">
      <Title kicker="Bus" title="Print ticket" sub="Look up a live PNR from your partner bookings and print the YLT ticket." />
      <div className="flex max-w-md gap-2">
        <input className={inputCls} placeholder="PNR" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary text-sm" disabled={!hit} onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</button>
      </div>
      {q && !hit && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No booking with that PNR on this partner.</p>}
      {hit && (
        <div className="max-w-md rounded-2xl border p-5 print:border-0" style={box}>
          <p className="font-display text-xl font-bold">YLT Travels</p>
          <p className="font-mono text-lg font-bold">{hit.pnr}</p>
          <p className="mt-2 text-sm">{hit.route}</p>
          <p className="text-sm">{hit.date} · ₹{fmtINR(hit.amount)}</p>
          <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{hit.status}</p>
        </div>
      )}
    </div>
  );
}

function CitiesBoard() {
  const routes = useErpStore((s) => s.routes || []);
  const cities = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => { if (r.from_city) set.add(r.from_city); if (r.to_city) set.add(r.to_city); });
    return [...set].sort();
  }, [routes]);
  return (
    <div className="space-y-4">
      <Title kicker="Bus" title="Operating cities" sub="Derived from your live routes — nothing is invented." />
      <div className="flex flex-wrap gap-2">
        {cities.map((c) => <span key={c} className="rounded-full border px-3 py-1 text-sm" style={{ borderColor: 'var(--border)' }}>{c}</span>)}
        {!cities.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add a route under Schedule to list cities.</p>}
      </div>
    </div>
  );
}

function TypesBoard() {
  const { buses, update } = useErpStore();
  const [type, setType] = useState('AC Seater');
  const groups = useMemo(() => {
    const m = new Map<string, number>();
    buses.forEach((b) => {
      const t = (b as { bus_type?: string }).bus_type || b.layout || 'Coach';
      m.set(t, (m.get(t) || 0) + 1);
    });
    return [...m.entries()];
  }, [buses]);
  return (
    <div className="space-y-4">
      <Title kicker="Bus" title="Bus types" sub="Label coaches (AC seater, sleeper). Updates erp_buses.bus_type." />
      <div className="flex flex-wrap gap-2">
        {['AC Seater', 'AC Sleeper', 'Non-AC Seater', 'Sleeper (2+1)'].map((t) => (
          <button key={t} className={`rounded-full px-3 py-1 text-sm ${type === t ? 'bg-crimson-600 text-white' : 'border'}`} style={type === t ? undefined : { borderColor: 'var(--border)' }} onClick={() => setType(t)}>{t}</button>
        ))}
      </div>
      <ul className="space-y-2">
        {buses.map((b) => (
          <li key={b.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm" style={box}>
            <span>{b.name} · {(b as { bus_type?: string }).bus_type || b.layout}</span>
            <button className="text-xs font-semibold text-crimson-700" onClick={() => void update('erp_buses', b.id, { bus_type: type })}>Set {type}</button>
          </li>
        ))}
      </ul>
      {groups.map(([t, n]) => <p key={t} className="text-xs" style={{ color: 'var(--text-muted)' }}>{t}: {n}</p>)}
    </div>
  );
}

function CancelBoard() {
  const { schedules, update } = useErpStore();
  const [policies, setPolicies] = useState<{ id: string; name: string; hours_before: number; refund_pct: number; body: string }[]>([]);
  const [f, setF] = useState({ name: 'Standard 6h', hours_before: 6, refund_pct: 80, body: 'Full refund minus a processing fee if cancelled 6 hours before departure.' });
  async function load() {
    const res = await apiFetch('/api/ops.php?resource=policies');
    const data = await res.json().catch(() => ({}));
    setPolicies(Array.isArray(data.policies) ? data.policies : []);
  }
  useEffect(() => { void load(); }, []);
  async function save() {
    await apiFetch('/api/ops.php?resource=policies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    await load();
  }
  return (
    <div className="space-y-4">
      <Title kicker="Bus" title="Cancellation policy" sub="Write the rule travellers see. Bind it to a live trip from the list below." />
      <div className="grid gap-2 rounded-2xl border p-4 md:grid-cols-4" style={box}>
        <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={inputCls} type="number" value={f.hours_before} onChange={(e) => setF({ ...f, hours_before: +e.target.value })} />
        <input className={inputCls} type="number" value={f.refund_pct} onChange={(e) => setF({ ...f, refund_pct: +e.target.value })} />
        <button className="btn-primary text-sm" onClick={() => void save()}>Save policy</button>
        <textarea className={inputCls + ' md:col-span-4 min-h-[72px]'} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
      </div>
      <ul className="space-y-2 text-sm">
        {policies.map((p) => (
          <li key={p.id} className="rounded-xl border p-3" style={box}>
            <p className="font-semibold">{p.name} · {p.hours_before}h · {p.refund_pct}%</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.body}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {schedules.slice(0, 8).map((s) => (
                <button key={s.id} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold" onClick={() => void update('erp_schedules', s.id, { policy_id: p.id })}>
                  Bind {s.departure_time} {s.departure_date}
                </button>
              ))}
            </div>
          </li>
        ))}
        {!policies.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No policies yet.</p>}
      </ul>
    </div>
  );
}

function AnalyticsBoard() {
  const bookings = usePartnerStore((s) => (Array.isArray(s.bookings) ? s.bookings : []).filter((b) => b.type === 'bus'));
  const live = bookings.filter((b) => b.status !== 'cancelled');
  const byChannel: Record<string, number> = {};
  live.forEach((b) => {
    const ch = (b as { channel?: string }).channel || 'website';
    byChannel[ch] = (byChannel[ch] || 0) + 1;
  });
  const rev = live.reduce((s, b) => s + Number(b.amount || 0), 0);
  return (
    <div className="space-y-4">
      <Title kicker="Bus" title="Analytics" sub="Attribution from bookings.channel on live trips." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border p-4" style={box}><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trips</p><p className="font-display text-2xl font-bold">{live.length}</p></div>
        <div className="rounded-2xl border p-4" style={box}><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Revenue</p><p className="font-display text-2xl font-bold">₹{fmtINR(rev)}</p></div>
        {Object.entries(byChannel).map(([k, v]) => (
          <div key={k} className="rounded-2xl border p-4" style={box}><p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{k}</p><p className="font-display text-2xl font-bold">{v}</p></div>
        ))}
      </div>
    </div>
  );
}

function CampaignsBoard() {
  const [rows, setRows] = useState<{ id: string; title: string; body: string; status: string }[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  async function load() {
    const res = await apiFetch('/api/ops.php?resource=campaigns');
    const data = await res.json().catch(() => ({}));
    setRows(Array.isArray(data.campaigns) ? data.campaigns : []);
  }
  useEffect(() => { void load(); }, []);
  async function save() {
    if (!title.trim()) return;
    await apiFetch('/api/ops.php?resource=campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body }) });
    setTitle(''); setBody('');
    await load();
  }
  return (
    <div className="space-y-4">
      <Title kicker="Bus" title="Campaigns / offer price" sub="Partner-only campaigns stored in MySQL. Public Offers stay on the YLT offers table." />
      <div className="grid gap-2 rounded-2xl border p-4 md:grid-cols-[1fr_1fr_auto]" style={box}>
        <input className={inputCls} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={inputCls} placeholder="Copy" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn-primary text-sm" onClick={() => void save()}>Post</button>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border p-3 text-sm" style={box}>
            <p className="font-semibold">{r.title}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.body}</p>
          </li>
        ))}
        {!rows.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No campaigns yet.</p>}
      </ul>
    </div>
  );
}

function DepositsBoard() {
  const { settlements, payouts } = useErpStore();
  return (
    <div className="space-y-4">
      <Title kicker="Bus" title="Deposit history" sub="Settlements and payouts from your ERP tables." />
      <ul className="space-y-2 text-sm">
        {(settlements || []).map((s) => (
          <li key={s.id} className="rounded-xl border px-3 py-2" style={box}>Settlement {s.period || ''} · ₹{fmtINR(Number(s.net_payable || s.gross_amount || 0))} · {s.status}</li>
        ))}
        {(payouts || []).map((s: { id: string; amount?: number; status?: string }) => (
          <li key={s.id} className="rounded-xl border px-3 py-2" style={box}>Payout · ₹{fmtINR(Number(s.amount || 0))} · {s.status}</li>
        ))}
        {!settlements?.length && !payouts?.length && <p style={{ color: 'var(--text-muted)' }}>No deposits posted yet.</p>}
      </ul>
    </div>
  );
}
