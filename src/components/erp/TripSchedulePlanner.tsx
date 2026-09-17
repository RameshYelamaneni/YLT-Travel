import { useState } from 'react';
import { Route, Plus, Calendar, Bus, Users, MapPin, Clock, Navigation, Activity, Trash2 } from 'lucide-react';
import { useErpStore, fmtINR, type ErpRoute, type ErpSchedule } from '../../store/erpStore';
import { Card, StatCard, Badge, Modal, Field, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';

const today = new Date().toISOString().slice(0, 10);

export default function TripSchedulePlanner() {
  const { routes, schedules, liveTrips, buses, crew, insert, update, remove, logAction, loading } = useErpStore();
  const [tab, setTab] = useState<'routes' | 'schedules' | 'live'>('routes');
  const [addingRoute, setAddingRoute] = useState(false);
  const [addingSchedule, setAddingSchedule] = useState(false);

  if (loading && !routes.length) return <ErpLoader label="Loading trip planner…" />;

  const activeTrips = liveTrips.filter((t) => t.status === 'in_progress');
  const scheduledToday = schedules.filter((s) => s.departure_date === today);

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={["Operations", "Trip & Schedule Planner"]}
        title="Trip & Schedule Planner"
        description="Manage routes, schedules, crew assignments, and live trip tracking."
        actions={
          <>
            <RippleButton className="text-sm" onClick={() => setAddingRoute(true)}><Plus className="h-4 w-4" /> Create Route</RippleButton>
            <RippleButton variant="ghost" className="text-sm" onClick={() => setAddingSchedule(true)}><Plus className="h-4 w-4" /> Create Trip</RippleButton>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Total Routes" value={String(routes.length)} icon={Route} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Schedules Today" value={String(scheduledToday.length)} icon={Calendar} tone="blue" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Live Trips" value={String(activeTrips.length)} icon={Activity} tone="green" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Total Schedules" value={String(schedules.length)} icon={Calendar} tone="amber" /></div>
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['routes', 'schedules', 'live'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-crimson-500 text-crimson-600' : ''}`}
            style={tab === t ? undefined : { color: 'var(--text-muted)' }}>{t === 'routes' ? 'Route Builder' : t === 'schedules' ? 'Daily/Weekly Schedules' : 'Live Trip Status'}</button>
        ))}
      </div>

      {tab === 'routes' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {routes.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{r.name}</h3>
                    <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><MapPin className="h-3 w-3" />{r.from_city} → {r.to_city}</p>
                  </div>
                  <Badge tone={r.status === 'active' ? 'green' : 'gray'}>{r.status}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-[var(--bg-raised)] px-2 py-1.5"><span style={{ color: 'var(--text-muted)' }}>Distance:</span> <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.distance_km}km</span></div>
                  <div className="rounded-lg bg-[var(--bg-raised)] px-2 py-1.5"><span style={{ color: 'var(--text-muted)' }}>Duration:</span> <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.duration_mins}m</span></div>
                  <div className="rounded-lg bg-[var(--bg-raised)] px-2 py-1.5"><span style={{ color: 'var(--text-muted)' }}>Fare:</span> <span className="font-medium text-crimson-600">₹{r.base_fare}</span></div>
                </div>
                {(r.stops as string[]).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(r.stops as string[]).map((s, i) => <span key={i} className="rounded-md bg-crimson-500/10 px-2 py-0.5 text-[11px] text-crimson-600">{s}</span>)}
                  </div>
                )}
                <div className="mt-3 flex justify-end border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={() => { remove('erp_routes', r.id); logAction('delete_route', 'erp_routes', r.id); }} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </Card>
            ))}
          </div>
          {!routes.length && <EmptyStateCard icon={Route} title="No routes built yet" description="Create your first route to start scheduling trips and assigning buses." ctaLabel="Create Route" onCta={() => setAddingRoute(true)} />}
          {addingRoute && <RouteModal onClose={() => setAddingRoute(false)} onSave={async (d) => { await insert('erp_routes', d); await logAction('add_route', 'erp_routes', '', d); setAddingRoute(false); }} />}
        </div>
      )}

      {tab === 'schedules' && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Daily & Weekly Schedules</h3>
            {schedules.length ? (
              <div className="space-y-2">
                {schedules.slice(0, 30).map((s) => {
                  const route = routes.find((r) => r.id === s.route_id);
                  const bus = buses.find((b) => b.id === s.bus_id);
                  const driver = crew.find((c) => c.id === s.driver_id);
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                      <Calendar className="h-4 w-4 text-crimson-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{route?.name ?? 'Unknown route'}</p>
                        <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Clock className="h-3 w-3" />{s.departure_date} at {s.departure_time}
                          {bus && <><Bus className="h-3 w-3" />{bus.name}</>}
                          {driver && <><Users className="h-3 w-3" />{driver.name}</>}
                        </p>
                      </div>
                      <Badge tone={s.status === 'scheduled' ? 'blue' : s.status === 'completed' ? 'green' : 'amber'}>{s.status}</Badge>
                      <button onClick={() => { remove('erp_schedules', s.id); logAction('delete_schedule', 'erp_schedules', s.id); }} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyStateCard icon={Calendar} title="No schedules yet" description="Create a trip schedule to assign buses and crew to routes." ctaLabel="Create Trip" onCta={() => setAddingSchedule(true)} />}
          </Card>
          {addingSchedule && <ScheduleModal routes={routes} buses={buses} crew={crew} onClose={() => setAddingSchedule(false)} onSave={async (d) => { await insert('erp_schedules', d); await logAction('add_schedule', 'erp_schedules', '', d); setAddingSchedule(false); }} />}
        </div>
      )}

      {tab === 'live' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Live Trip Status</h3>
          {liveTrips.length ? (
            <div className="space-y-2">
              {liveTrips.map((t) => {
                const bus = buses.find((b) => b.id === t.bus_id);
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                    <Navigation className={`h-4 w-4 ${t.status === 'in_progress' ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.route_name ?? 'Unknown'} — {bus?.name ?? 'Unknown bus'}</p>
                      <p className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t.current_location && <><MapPin className="h-3 w-3" />{t.current_location}</>}
                        {t.speed_kmph != null && <span>{t.speed_kmph} km/h</span>}
                        {t.eta_minutes != null && <span>ETA: {t.eta_minutes}m</span>}
                        {t.delay_minutes > 0 && <span className="text-amber-500">Delay: {t.delay_minutes}m</span>}
                      </p>
                    </div>
                    <Badge tone={t.status === 'in_progress' ? 'green' : t.status === 'completed' ? 'blue' : 'gray'}>{t.status}</Badge>
                  </div>
                );
              })}
            </div>
          ) : <EmptyStateCard icon={Navigation} title="No live trips" description="Active trips will appear here with real-time location and ETA tracking." />}
        </Card>
      )}
    </div>
  );
}

function RouteModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ name: '', from_city: '', to_city: '', stops: '', distance_km: 0, duration_mins: 0, base_fare: 0 });
  return (
    <Modal open onClose={onClose} title="Build Route">
      <div className="space-y-3">
        <Field label="Route Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From City"><input className={inputCls} value={f.from_city} onChange={(e) => setF({ ...f, from_city: e.target.value })} /></Field>
          <Field label="To City"><input className={inputCls} value={f.to_city} onChange={(e) => setF({ ...f, to_city: e.target.value })} /></Field>
        </div>
        <Field label="Stops (comma-separated)"><input className={inputCls} value={f.stops} onChange={(e) => setF({ ...f, stops: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Distance (km)"><input type="number" className={inputCls} value={f.distance_km} onChange={(e) => setF({ ...f, distance_km: +e.target.value })} /></Field>
          <Field label="Duration (min)"><input type="number" className={inputCls} value={f.duration_mins} onChange={(e) => setF({ ...f, duration_mins: +e.target.value })} /></Field>
          <Field label="Base Fare (₹)"><input type="number" className={inputCls} value={f.base_fare} onChange={(e) => setF({ ...f, base_fare: +e.target.value })} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave({ ...f, stops: f.stops.split(',').map((s) => s.trim()).filter(Boolean), status: 'active' })}>Create</RippleButton>
        </div>
      </div>
    </Modal>
  );
}

function ScheduleModal({ routes, buses, crew, onClose, onSave }: { routes: ErpRoute[]; buses: any[]; crew: any[]; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ route_id: routes[0]?.id ?? '', bus_id: '', driver_id: '', cleaner_id: '', departure_date: today, departure_time: '08:00', arrival_time: '', recurrence: 'one_time' });
  return (
    <Modal open onClose={onClose} title="Add Schedule">
      <div className="space-y-3">
        <Field label="Route"><select className={inputCls} value={f.route_id} onChange={(e) => setF({ ...f, route_id: e.target.value })}>{routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bus"><select className={inputCls} value={f.bus_id} onChange={(e) => setF({ ...f, bus_id: e.target.value })}><option value="">Auto-assign</option>{buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Driver"><select className={inputCls} value={f.driver_id} onChange={(e) => setF({ ...f, driver_id: e.target.value })}><option value="">Auto-assign</option>{crew.filter((c) => c.role === 'driver').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Departure Date"><input type="date" className={inputCls} value={f.departure_date} onChange={(e) => setF({ ...f, departure_date: e.target.value })} /></Field>
          <Field label="Departure Time"><input type="time" className={inputCls} value={f.departure_time} onChange={(e) => setF({ ...f, departure_time: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Arrival Time"><input type="time" className={inputCls} value={f.arrival_time} onChange={(e) => setF({ ...f, arrival_time: e.target.value })} /></Field>
          <Field label="Recurrence"><select className={inputCls} value={f.recurrence} onChange={(e) => setF({ ...f, recurrence: e.target.value })}><option value="one_time">One Time</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave({ ...f, status: 'scheduled' })}>Create</RippleButton>
        </div>
      </div>
    </Modal>
  );
}
