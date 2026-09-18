import { useEffect, useMemo, useState } from 'react';
import { Plus, MapPin, Route, Trash2, Settings2 } from 'lucide-react';
import { useErpStore, type ErpSchedule } from '../../store/erpStore';
import { apiFetch } from '../../lib/api';
import { authUserId } from '../../lib/auth';
import { Card, Badge, Field, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';

const DAYS = [
  { id: '1', label: 'Mon' },
  { id: '2', label: 'Tue' },
  { id: '3', label: 'Wed' },
  { id: '4', label: 'Thu' },
  { id: '5', label: 'Fri' },
  { id: '6', label: 'Sat' },
  { id: '0', label: 'Sun' },
];

const BUS_TYPES = ['AC Seater', 'AC Sleeper', 'Non-AC Seater', 'Sleeper (2+1)', 'Semi-Sleeper 2x2'];

function asList<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function parseStops(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x ?? '').trim()).filter(Boolean);
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return [];
    try {
      const p = JSON.parse(t);
      if (Array.isArray(p)) return p.map((x) => String(x ?? '').trim()).filter(Boolean);
    } catch { /* comma list */ }
    return t.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function parseDays(v: unknown): string[] {
  const list = parseStops(v);
  return list.length ? list : DAYS.map((d) => d.id);
}

type Policy = { id: string; name: string; hours_before: number; refund_pct: number; body: string };
type CityRow = { id: string; name: string };

type ServiceForm = {
  service_name: string;
  from_city: string;
  to_city: string;
  via: string;
  bus_type: string;
  bus_id: string;
  status: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
  depot: string;
  days: string[];
  policy_id: string;
  offer_price: string;
};

const emptyForm = (): ServiceForm => ({
  service_name: '',
  from_city: '',
  to_city: '',
  via: '',
  bus_type: 'AC Seater',
  bus_id: '',
  status: 'active',
  departure_date: new Date().toISOString().slice(0, 10),
  departure_time: '18:00',
  arrival_time: '06:00',
  depot: '',
  days: DAYS.map((d) => d.id),
  policy_id: '',
  offer_price: '',
});

export default function BusConfiguration() {
  const store = useErpStore();
  const routes = asList<typeof store.routes[number]>(store.routes);
  const schedules = asList<ErpSchedule>(store.schedules);
  const buses = asList<typeof store.buses[number]>(store.buses);
  const insert = store.insert;
  const update = store.update;
  const remove = store.remove;
  const logAction = store.logAction;
  const loading = store.loading;

  const [cities, setCities] = useState<CityRow[]>([]);
  const [cityName, setCityName] = useState('');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const cityNames = useMemo(() => {
    const set = new Set<string>();
    cities.forEach((c) => { if (c.name) set.add(c.name); });
    routes.forEach((r) => {
      if (r.from_city) set.add(r.from_city);
      if (r.to_city) set.add(r.to_city);
      parseStops(r.stops).forEach((s) => set.add(s));
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [cities, routes]);

  async function loadOps() {
    try {
      const [pRes, cRes] = await Promise.all([
        apiFetch('/api/ops.php?resource=policies'),
        apiFetch('/api/ops.php?resource=cities'),
      ]);
      const pData = await pRes.json().catch(() => ({}));
      const cData = await cRes.json().catch(() => ({}));
      setPolicies(Array.isArray(pData.policies) ? pData.policies : []);
      setCities(Array.isArray(cData.cities) ? cData.cities : []);
    } catch {
      setPolicies([]);
    }
  }

  useEffect(() => { void loadOps(); }, []);

  async function addCity() {
    const name = cityName.trim();
    if (!name) return;
    setErr(null);
    const res = await apiFetch('/api/ops.php?resource=cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      setErr(data.error || 'Could not save city.');
      return;
    }
    setCityName('');
    await loadOps();
  }

  async function saveService() {
    const from = form.from_city.trim();
    const to = form.to_city.trim();
    if (!from || !to) {
      setErr('Source and destination are required.');
      return;
    }
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const via = form.via.split(',').map((s) => s.trim()).filter(Boolean);
      let route = routes.find((r) =>
        (r.from_city || '').toLowerCase() === from.toLowerCase()
        && (r.to_city || '').toLowerCase() === to.toLowerCase(),
      );
      const partner_id = authUserId() || undefined;
      const fare = Number(form.offer_price || 0);
      if (!route) {
        const routeId = crypto.randomUUID();
        await insert('erp_routes', {
          id: routeId,
          name: form.service_name.trim() || `${from} → ${to}`,
          from_city: from,
          to_city: to,
          stops: via,
          status: 'active',
          partner_id,
          base_fare: fare || 0,
          distance_km: 0,
          duration_mins: 0,
        });
        route = { id: routeId, name: `${from} → ${to}`, from_city: from, to_city: to, stops: via, distance_km: 0, duration_mins: 0, base_fare: fare, status: 'active' };
      } else if (via.length) {
        await update('erp_routes', route.id, { stops: via, base_fare: fare || route.base_fare });
      }
      if (form.bus_id && form.bus_type) {
        await update('erp_buses', form.bus_id, { bus_type: form.bus_type });
      }
      await insert('erp_schedules', {
        id: crypto.randomUUID(),
        route_id: route.id,
        bus_id: form.bus_id || null,
        service_name: form.service_name.trim() || `${from} → ${to}`,
        depot: form.depot.trim(),
        departure_date: form.departure_date,
        departure_time: form.departure_time,
        arrival_time: form.arrival_time,
        status: form.status === 'inactive' ? 'inactive' : 'active',
        recurrence: form.days.length === 7 ? 'daily' : 'weekly',
        days_of_week: form.days,
        policy_id: form.policy_id || null,
        offer_price: fare || null,
        partner_id,
      });
      await logAction('add_service', 'erp_schedules', '', { from, to });
      setForm(emptyForm());
      setOk(`Service saved: ${from} → ${to}. It uses YLT inventory (ylt_db).`);
      await loadOps();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save service.');
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(id: string) {
    setForm((s) => ({
      ...s,
      days: s.days.includes(id) ? s.days.filter((d) => d !== id) : [...s.days, id],
    }));
  }

  if (loading && !routes.length && !schedules.length) return <ErpLoader label="Loading bus configuration…" />;

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={['Bus', 'Configuration']}
        title="Bus configuration"
        description="This is the one place to set from → to, via stops, coach, timetable, cancellation, and offer price. Live MySQL (erp_routes / erp_schedules) with your partner JWT."
      />

      {err && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{err}</p>}
      {ok && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{ok}</p>}

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-display font-bold"><MapPin className="h-4 w-4 text-crimson-600" /> Operating cities</h3>
        <div className="mb-3 flex max-w-md gap-2">
          <input className={inputCls} placeholder="Add a city (e.g. Tirupati)" value={cityName} onChange={(e) => setCityName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void addCity()} />
          <RippleButton className="text-sm" onClick={() => void addCity()}><Plus className="h-4 w-4" /> Add city</RippleButton>
        </div>
        <div className="flex flex-wrap gap-2">
          {cityNames.map((c) => (
            <span key={c} className="rounded-full border px-3 py-1 text-sm" style={{ borderColor: 'var(--border)' }}>{c}</span>
          ))}
          {!cityNames.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No cities yet. Add one here or type source/destination on a service.</p>}
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 flex items-center gap-2 font-display font-bold"><Route className="h-4 w-4 text-crimson-600" /> Add service (from → to)</h3>
        <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>Source, destination, via, coach, days, depot, cancellation, and offer price in one save.</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Service name"><input className={inputCls} value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} placeholder="Night service" /></Field>
          <Field label="Source (from)">
            <input className={inputCls} list="ylt-cities" value={form.from_city} onChange={(e) => setForm({ ...form, from_city: e.target.value })} placeholder="From city" />
          </Field>
          <Field label="Destination (to)">
            <input className={inputCls} list="ylt-cities" value={form.to_city} onChange={(e) => setForm({ ...form, to_city: e.target.value })} placeholder="To city" />
          </Field>
          <Field label="Via / stops"><input className={inputCls} value={form.via} onChange={(e) => setForm({ ...form, via: e.target.value })} placeholder="Chittoor, Vellore" /></Field>
          <Field label="Bus type">
            <select className={inputCls} value={form.bus_type} onChange={(e) => setForm({ ...form, bus_type: e.target.value })}>
              {BUS_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Assigned bus">
            <select className={inputCls} value={form.bus_id} onChange={(e) => setForm({ ...form, bus_id: e.target.value })}>
              <option value="">Select coach</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.name} · {(b as { bus_type?: string }).bus_type || b.layout}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Departure date"><input type="date" className={inputCls} value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} /></Field>
          <Field label="Dep time"><input type="time" className={inputCls} value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} /></Field>
          <Field label="Arr time"><input type="time" className={inputCls} value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} /></Field>
          <Field label="Depot"><input className={inputCls} value={form.depot} onChange={(e) => setForm({ ...form, depot: e.target.value })} placeholder="Depot / garage" /></Field>
          <Field label="Offer / price (₹)"><input type="number" className={inputCls} value={form.offer_price} onChange={(e) => setForm({ ...form, offer_price: e.target.value })} placeholder="Base fare" /></Field>
          <Field label="Cancellation policy">
            <select className={inputCls} value={form.policy_id} onChange={(e) => setForm({ ...form, policy_id: e.target.value })}>
              <option value="">None</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.hours_before}h · {p.refund_pct}%</option>)}
            </select>
          </Field>
        </div>
        <datalist id="ylt-cities">{cityNames.map((c) => <option key={c} value={c} />)}</datalist>
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Days of week</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDay(d.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${form.days.includes(d.id) ? 'bg-crimson-600 text-white' : 'border'}`}
                style={form.days.includes(d.id) ? undefined : { borderColor: 'var(--border)' }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <RippleButton className="text-sm" disabled={saving || !form.from_city.trim() || !form.to_city.trim()} onClick={() => void saveService()}>
            <Plus className="h-4 w-4" /> {saving ? 'Saving…' : 'Save service'}
          </RippleButton>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 flex items-center gap-2 font-display font-bold"><Settings2 className="h-4 w-4 text-crimson-600" /> Configured services</h3>
        {schedules.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="px-2 py-2">From → to</th>
                  <th className="px-2 py-2">Via</th>
                  <th className="px-2 py-2">Coach</th>
                  <th className="px-2 py-2">Times</th>
                  <th className="px-2 py-2">Days</th>
                  <th className="px-2 py-2">Depot</th>
                  <th className="px-2 py-2">Price</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => {
                  const route = routes.find((r) => r.id === s.route_id);
                  const bus = buses.find((b) => b.id === s.bus_id);
                  const extra = s as ErpSchedule & { service_name?: string; depot?: string; offer_price?: number; days_of_week?: unknown; policy_id?: string };
                  const from = route?.from_city || '—';
                  const to = route?.to_city || '—';
                  const via = parseStops(route?.stops).join(', ') || '—';
                  const days = parseDays(extra.days_of_week);
                  const active = s.status !== 'inactive' && s.status !== 'cancelled';
                  return (
                    <tr key={s.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-2 py-2 font-semibold">{extra.service_name || route?.name || `${from} → ${to}`}<p className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{from} → {to}</p></td>
                      <td className="px-2 py-2">{via}</td>
                      <td className="px-2 py-2">{bus?.name || '—'}<p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(bus as { bus_type?: string } | undefined)?.bus_type || bus?.layout || form.bus_type}</p></td>
                      <td className="px-2 py-2">{s.departure_time}{s.arrival_time ? ` → ${s.arrival_time}` : ''}<p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.departure_date}</p></td>
                      <td className="px-2 py-2 text-xs">{days.map((id) => DAYS.find((d) => d.id === id)?.label || id).join(' ')}</td>
                      <td className="px-2 py-2">{extra.depot || '—'}</td>
                      <td className="px-2 py-2">{extra.offer_price ? `₹${extra.offer_price}` : (route?.base_fare ? `₹${route.base_fare}` : '—')}</td>
                      <td className="px-2 py-2">
                        <button type="button" onClick={() => void update('erp_schedules', s.id, { status: active ? 'inactive' : 'active' })}>
                          <Badge tone={active ? 'green' : 'gray'}>{active ? 'active' : 'inactive'}</Badge>
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <button type="button" className="text-red-500" onClick={() => { void remove('erp_schedules', s.id); void logAction('delete_schedule', 'erp_schedules', s.id); }}><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyStateCard icon={Route} title="No services yet" description="Add a from → to service above. Public search only lists active trips from this partner." />
        )}
      </Card>
    </div>
  );
}
