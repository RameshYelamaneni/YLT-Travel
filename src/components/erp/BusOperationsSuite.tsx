import { useState } from 'react';
import {
  Bus, Plus, Fuel, Gauge, ShieldCheck, Wrench, ChevronRight,
  AlertTriangle, Activity, FileText, Trash2, Download,
} from 'lucide-react';
import { useErpStore, fmtINR, type ErpBus } from '../../store/erpStore';
import { Card, StatCard, Badge, Modal, Field, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';
import { PhotoField } from '../partner/MediaUpload';
import { authUserId } from '../../lib/auth';

const today = new Date().toISOString().slice(0, 10);

export type BusOpsView = 'desk' | 'fleet' | 'health' | 'expenses' | 'permits';

const TITLES: Record<BusOpsView, { crumb: string; title: string; sub: string }> = {
  desk: { crumb: 'Operations', title: 'Bus operations', sub: 'Fleet, occupancy, and compliance at a glance. Use the left Bus menu to open each desk.' },
  fleet: { crumb: 'Fleet', title: 'Fleet registry', sub: 'Register coaches, photos, layout, and assigned crew.' },
  health: { crumb: 'Health', title: 'Health & diagnostics', sub: 'Engine, tyre, battery, and emissions records for your fleet.' },
  expenses: { crumb: 'Expenses', title: 'Bus expenses', sub: 'Fuel, toll, maintenance, and other running costs per coach.' },
  permits: { crumb: 'Permits', title: 'Permits & compliance', sub: 'Permit, insurance, and document expiry for each bus.' },
};

export default function BusOperationsSuite({ view = 'fleet' }: { view?: BusOpsView }) {
  const { buses, busHealth, busExpenses, crew, compliance, maintenanceLogs, insert, update, remove, logAction, loading } = useErpStore();
  const [editing, setEditing] = useState<ErpBus | null>(null);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<ErpBus | null>(null);
  const [expenseBusId, setExpenseBusId] = useState<string | null>(null);

  const fleet = Array.isArray(buses) ? buses : [];
  const healthRows = Array.isArray(busHealth) ? busHealth : [];
  const expenseRows = Array.isArray(busExpenses) ? busExpenses : [];
  const crewRows = Array.isArray(crew) ? crew : [];
  const complianceRows = Array.isArray(compliance) ? compliance : [];
  const maintRows = Array.isArray(maintenanceLogs) ? maintenanceLogs : [];

  const activeBuses = fleet.filter((b) => b.status === 'active').length;
  const maintenanceBuses = fleet.filter((b) => b.status === 'maintenance').length;
  const permitAlerts = fleet.filter((b) => b.permit_expiry && b.permit_expiry <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).length;
  const maintAlerts = fleet.filter((b) => b.next_maintenance && b.next_maintenance <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).length;

  if (loading && !fleet.length) return <ErpLoader label="Loading bus operations…" />;

  if (selected) return <BusDetail bus={selected} onBack={() => setSelected(null)} />;

  const meta = TITLES[view] || TITLES.fleet;
  const showFleet = view === 'desk' || view === 'fleet';
  const showHealth = view === 'desk' || view === 'health';
  const showExpenses = view === 'expenses';
  const showPermits = view === 'permits' || view === 'desk';

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={['Bus', meta.crumb]}
        title={meta.title}
        description={meta.sub}
        actions={<RippleButton className="text-sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Register Bus</RippleButton>}
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Total Buses" value={String(fleet.length)} sub={`${activeBuses} active`} icon={Bus} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="In Maintenance" value={String(maintenanceBuses)} icon={Wrench} tone="amber" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Permit Alerts" value={String(permitAlerts)} sub="Next 30 days" icon={ShieldCheck} tone="blue" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Maint. Due" value={String(maintAlerts)} sub="Next 7 days" icon={AlertTriangle} tone="amber" /></div>
      </div>

      {showFleet && (
        <div className="space-y-4">
          {view === 'desk' ? <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Fleet snapshot</h3> : null}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fleet.map((b) => {
              const driver = crewRows.find((c) => c.id === b.driver_id);
              return (
                <Card key={b.id} onClick={() => setSelected(b)}>
                  {b.photo_url ? (
                    <div className="-mx-5 -mt-5 mb-3 h-28 overflow-hidden rounded-t-2xl">
                      <img src={b.photo_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : null}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{b.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.registration_number || 'No reg.'} · {b.layout} · {b.total_seats} seats</p>
                    </div>
                    <Badge tone={b.status === 'active' ? 'green' : b.status === 'maintenance' ? 'amber' : 'gray'}>{b.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(Array.isArray(b.amenities) ? b.amenities : []).slice(0, 4).map((a) => <span key={a} className="rounded-md bg-[var(--bg-raised)] px-2 py-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>{a}</span>)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Mini label="Fuel" value={`${b.fuel_pct}%`} tone={b.fuel_pct < 30 ? 'red' : 'green'} />
                    <Mini label="GPS" value={b.gps_status} tone={b.gps_status === 'online' ? 'green' : 'gray'} />
                    <Mini label="Permit" value={b.permit_expiry ?? '—'} tone={b.permit_expiry && b.permit_expiry <= today ? 'red' : 'gray'} />
                    <Mini label="Maint" value={b.next_maintenance ?? '—'} tone={b.next_maintenance && b.next_maintenance <= today ? 'red' : 'gray'} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Driver: {driver?.name ?? 'Unassigned'}</span>
                    <button type="button" className="text-xs font-semibold text-crimson-600" onClick={(e) => { e.stopPropagation(); setEditing(b); }}>Edit</button>
                  </div>
                </Card>
              );
            })}
          </div>
          {!fleet.length && <EmptyStateCard icon={Bus} title="No buses registered" description="Register your first bus to start managing fleet operations, health, and compliance." ctaLabel="Register Bus" onCta={() => setAdding(true)} />}
        </div>
      )}

      {showHealth && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Bus Health & Diagnostics</h3>
          {healthRows.length ? (
            <div className="space-y-2">
              {healthRows.slice(0, view === 'desk' ? 8 : 20).map((h) => {
                const bus = fleet.find((b) => b.id === h.bus_id);
                return (
                  <div key={h.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                    <Activity className={`h-4 w-4 ${h.emissions_ok ? 'text-emerald-500' : 'text-red-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bus?.name ?? h.bus_id}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(h.recorded_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-3 text-xs">
                      {h.engine_temp_c && <span style={{ color: 'var(--text-secondary)' }}>Engine: {h.engine_temp_c}°C</span>}
                      {h.tire_pressure_psi && <span style={{ color: 'var(--text-secondary)' }}>Tires: {h.tire_pressure_psi} psi</span>}
                      {h.battery_volt && <span style={{ color: 'var(--text-secondary)' }}>Battery: {h.battery_volt}V</span>}
                    </div>
                    <Badge tone={h.emissions_ok ? 'green' : 'red'}>{h.emissions_ok ? 'Emissions OK' : 'Emissions Fail'}</Badge>
                  </div>
                );
              })}
            </div>
          ) : <EmptyStateCard icon={Activity} title="No health diagnostics" description="Bus health records will appear here once diagnostics are recorded." />}
        </Card>
      )}

      {showExpenses && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Bus Expense Ledger</h3>
            {expenseRows.length ? (
              <div className="space-y-2">
                {expenseRows.slice(0, 30).map((e) => {
                  const bus = fleet.find((b) => b.id === e.bus_id);
                  return (
                    <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.category} — {bus?.name ?? 'Unknown bus'}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.date} {e.description ? `· ${e.description}` : ''}</p>
                      </div>
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(e.amount)}</span>
                      <button onClick={() => { remove('erp_bus_expenses', e.id); logAction('delete_expense', 'erp_bus_expenses', e.id); }} className="text-red-500 transition hover:scale-110"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyStateCard icon={FileText} title="No expenses recorded" description="Track fuel, tolls, maintenance and other bus expenses here." ctaLabel="Add Expense" onCta={() => setExpenseBusId('new')} />}
          </Card>
          {expenseBusId && <ExpenseModal busId={expenseBusId === 'new' ? '' : expenseBusId} buses={fleet} onClose={() => setExpenseBusId(null)} onSave={async (data) => { await insert('erp_bus_expenses', data); await logAction('add_expense', 'erp_bus_expenses', '', data); setExpenseBusId(null); }} />}
        </div>
      )}

      {showPermits && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Permit & Compliance</h3>
          {complianceRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>{['Bus', 'Document', 'Number', 'Expiry', 'Status'].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {complianceRows.map((c) => {
                    const bus = fleet.find((b) => b.id === c.bus_id);
                    const expired = c.expiry_date <= today;
                    const soon = c.expiry_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
                    return (
                      <tr key={c.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)' }}>{bus?.name ?? c.bus_id}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{c.doc_type}</td>
                        <td className="px-3 py-2.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{c.doc_number ?? '—'}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{c.expiry_date}</td>
                        <td className="px-3 py-2.5"><Badge tone={expired ? 'red' : soon ? 'amber' : 'green'}>{expired ? 'Expired' : soon ? 'Expiring' : 'Valid'}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyStateCard icon={ShieldCheck} title="No compliance records" description="Add permit and insurance documents to track expiry and compliance." />}
        </Card>
      )}

      {(adding || editing) && (
        <BusForm bus={editing} crew={crewRows} onClose={() => { setAdding(false); setEditing(null); }} onSave={async (data) => {
          if (editing) { await update('erp_buses', editing.id, data); await logAction('update_bus', 'erp_buses', editing.id, data); }
          else { await insert('erp_buses', { ...data, partner_id: authUserId() || undefined }); await logAction('add_bus', 'erp_buses', '', data); }
          setAdding(false); setEditing(null);
        }} />
      )}
    </div>
  );
}

function BusDetail({ bus, onBack }: { bus: ErpBus; onBack: () => void }) {
  const store = useErpStore();
  const crew = Array.isArray(store.crew) ? store.crew : [];
  const busHealth = Array.isArray(store.busHealth) ? store.busHealth : [];
  const maintenanceLogs = Array.isArray(store.maintenanceLogs) ? store.maintenanceLogs : [];
  const busExpenses = Array.isArray(store.busExpenses) ? store.busExpenses : [];
  const driver = crew.find((c) => c.id === bus.driver_id);
  const cleaner = crew.find((c) => c.id === bus.cleaner_id);
  const health = busHealth.filter((h) => h.bus_id === bus.id).slice(0, 5);
  const maint = maintenanceLogs.filter((m) => m.bus_id === bus.id).slice(0, 5);
  const expenses = busExpenses.filter((e) => e.bus_id === bus.id).slice(0, 10);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-crimson-600 transition hover:gap-2.5">
        <ChevronRight className="h-4 w-4 rotate-180" /> Back to Fleet
      </button>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {bus.photo_url ? <img src={bus.photo_url} alt="" className="h-16 w-24 rounded-lg object-cover" /> : null}
          <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{bus.name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{bus.registration_number} · {bus.layout} · {bus.total_seats} seats</p>
          </div>
        </div>
        <Badge tone={bus.status === 'active' ? 'green' : bus.status === 'maintenance' ? 'amber' : 'gray'}>{bus.status}</Badge>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><Card><div className="flex items-center gap-2"><Fuel className="h-5 w-5 text-emerald-500" /><div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fuel</p><p className="font-bold" style={{ color: 'var(--text-primary)' }}>{bus.fuel_pct}%</p></div></div></Card></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><Card><div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-blue-500" /><div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>GPS</p><p className="font-bold" style={{ color: 'var(--text-primary)' }}>{bus.gps_status}</p></div></div></Card></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><Card><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-amber-500" /><div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Odometer</p><p className="font-bold" style={{ color: 'var(--text-primary)' }}>{bus.odometer_km.toLocaleString('en-IN')} km</p></div></div></Card></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><Card><div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-crimson-500" /><div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Engine Hours</p><p className="font-bold" style={{ color: 'var(--text-primary)' }}>{bus.engine_hours}h</p></div></div></Card></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Crew Assignment</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span style={{ color: 'var(--text-muted)' }}>Driver</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{driver?.name ?? 'Unassigned'}</span></div>
            <div className="flex items-center justify-between"><span style={{ color: 'var(--text-muted)' }}>Cleaner</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{cleaner?.name ?? 'Unassigned'}</span></div>
            <div className="flex items-center justify-between"><span style={{ color: 'var(--text-muted)' }}>Permit Expiry</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{bus.permit_expiry ?? '—'}</span></div>
            <div className="flex items-center justify-between"><span style={{ color: 'var(--text-muted)' }}>Insurance Expiry</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{bus.insurance_expiry ?? '—'}</span></div>
            <div className="flex items-center justify-between"><span style={{ color: 'var(--text-muted)' }}>Next Maintenance</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{bus.next_maintenance ?? '—'}</span></div>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Recent Health</h3>
          {health.length ? <div className="space-y-2">{health.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>{new Date(h.recorded_at).toLocaleDateString()}</span>
              <span style={{ color: 'var(--text-secondary)' }}>Engine {h.engine_temp_c ?? '—'}°C · Battery {h.battery_volt ?? '—'}V</span>
            </div>
          ))}</div> : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No diagnostics.</p>}
        </Card>
      </div>
      <Card>
        <h3 className="mb-3 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Recent Maintenance & Expenses</h3>
        <div className="space-y-2">
          {maint.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
              <Wrench className="h-4 w-4 text-amber-500" />
              <div className="flex-1"><p className="text-sm" style={{ color: 'var(--text-primary)' }}>{m.service_type}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.service_date}</p></div>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(m.cost)}</span>
            </div>
          ))}
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
              <FileText className="h-4 w-4 text-blue-500" />
              <div className="flex-1"><p className="text-sm" style={{ color: 'var(--text-primary)' }}>{e.category}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.date}</p></div>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(e.amount)}</span>
            </div>
          ))}
          {!maint.length && !expenses.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No records.</p>}
        </div>
      </Card>
    </div>
  );
}

function BusForm({ bus, crew, onClose, onSave }: { bus: ErpBus | null; crew: any[]; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({
    name: bus?.name ?? '', registration_number: bus?.registration_number ?? '', layout: bus?.layout ?? 'Sleeper 2x1',
    total_seats: bus?.total_seats ?? 36, amenities: (bus?.amenities as string[]) ?? ['AC'], permit_expiry: bus?.permit_expiry ?? '',
    insurance_expiry: bus?.insurance_expiry ?? '', next_maintenance: bus?.next_maintenance ?? '', status: bus?.status ?? 'active',
    fuel_pct: bus?.fuel_pct ?? 100, gps_status: bus?.gps_status ?? 'online', driver_id: bus?.driver_id ?? '', cleaner_id: bus?.cleaner_id ?? '',
    engine_hours: bus?.engine_hours ?? 0, odometer_km: bus?.odometer_km ?? 0,
    photo_url: bus?.photo_url ?? '',
  });
  return (
    <Modal open onClose={onClose} title={bus ? 'Edit Bus' : 'Register Bus'} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bus Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Registration Number"><input className={inputCls} value={f.registration_number} onChange={(e) => setF({ ...f, registration_number: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Layout"><select className={inputCls} value={f.layout} onChange={(e) => setF({ ...f, layout: e.target.value })}><option>Sleeper 2x1</option><option>Seater 2x2</option><option>Semi-Sleeper 2x2</option></select></Field>
          <Field label="Total Seats"><input type="number" className={inputCls} value={f.total_seats} onChange={(e) => setF({ ...f, total_seats: +e.target.value })} /></Field>
        </div>
        <Field label="Amenities (comma-separated)"><input className={inputCls} value={f.amenities.join(', ')} onChange={(e) => setF({ ...f, amenities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Permit Expiry"><input type="date" className={inputCls} value={f.permit_expiry} onChange={(e) => setF({ ...f, permit_expiry: e.target.value })} /></Field>
          <Field label="Insurance Expiry"><input type="date" className={inputCls} value={f.insurance_expiry} onChange={(e) => setF({ ...f, insurance_expiry: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Next Maintenance"><input type="date" className={inputCls} value={f.next_maintenance} onChange={(e) => setF({ ...f, next_maintenance: e.target.value })} /></Field>
          <Field label="Fuel %"><input type="number" className={inputCls} value={f.fuel_pct} onChange={(e) => setF({ ...f, fuel_pct: +e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Driver"><select className={inputCls} value={f.driver_id} onChange={(e) => setF({ ...f, driver_id: e.target.value })}><option value="">Unassigned</option>{crew.filter((c) => c.role === 'driver').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Cleaner"><select className={inputCls} value={f.cleaner_id} onChange={(e) => setF({ ...f, cleaner_id: e.target.value })}><option value="">Unassigned</option>{crew.filter((c) => c.role === 'cleaner' || c.role === 'helper').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="idle">Idle</option></select></Field>
          <Field label="Odometer (km)"><input type="number" className={inputCls} value={f.odometer_km} onChange={(e) => setF({ ...f, odometer_km: +e.target.value })} /></Field>
          <Field label="Engine Hours"><input type="number" className={inputCls} value={f.engine_hours} onChange={(e) => setF({ ...f, engine_hours: +e.target.value })} /></Field>
        </div>
        <PhotoField label="Bus photo" url={f.photo_url || ''} onChange={(photo_url) => setF({ ...f, photo_url })} />
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave(f)}>Save</RippleButton>
        </div>
      </div>
    </Modal>
  );
}

function ExpenseModal({ busId, buses, onClose, onSave }: { busId: string; buses: ErpBus[]; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ bus_id: busId, date: today, category: 'Fuel', amount: 0, description: '' });
  return (
    <Modal open onClose={onClose} title="Add Bus Expense">
      <div className="space-y-3">
        <Field label="Bus"><select className={inputCls} value={f.bus_id} onChange={(e) => setF({ ...f, bus_id: e.target.value })}><option value="">Select bus</option>{buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Category"><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option>Fuel</option><option>Toll</option><option>Maintenance</option><option>Parking</option><option>Misc</option></select></Field>
        </div>
        <Field label="Amount (₹)"><input type="number" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></Field>
        <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave(f)}>Save</RippleButton>
        </div>
      </div>
    </Modal>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' | 'gray' }) {
  const tones = { green: 'text-emerald-600', red: 'text-red-500', gray: 'text-[var(--text-muted)]' };
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-raised)] px-2 py-1.5">
      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <span className={`font-medium ${tones[tone]}`} style={tone === 'gray' ? { color: 'var(--text-primary)' } : undefined}>{value}</span>
    </div>
  );
}
