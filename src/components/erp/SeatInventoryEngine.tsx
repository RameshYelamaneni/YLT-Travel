import { useMemo, useState } from 'react';
import { Ticket, Lock } from 'lucide-react';
import { useErpStore } from '../../store/erpStore';
import { Card, StatCard, Badge, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { ErpLoader } from '../operator/ErpLoader';

export default function SeatInventoryEngine() {
  const { buses, schedules, routes, seatInventory, seatLocks, loading } = useErpStore();
  const fleet = Array.isArray(buses) ? buses : [];
  const trips = Array.isArray(schedules) ? schedules : [];
  const routeRows = Array.isArray(routes) ? routes : [];
  const seats = Array.isArray(seatInventory) ? seatInventory : [];
  const locks = Array.isArray(seatLocks) ? seatLocks : [];
  const today = new Date().toISOString().slice(0, 10);
  const [busId, setBusId] = useState('');
  const [date, setDate] = useState(today);

  const filtered = useMemo(
    () => seats.filter((s) => (!busId || s.bus_id === busId) && (!date || s.travel_date === date)),
    [seats, busId, date],
  );
  const available = filtered.filter((s) => s.status === 'available' || s.status === 'open').length;
  const booked = filtered.filter((s) => s.status === 'booked' || s.status === 'sold').length;
  const locked = filtered.filter((s) => s.status === 'locked' || s.status === 'hold').length;

  if (loading && !seats.length && !trips.length) return <ErpLoader label="Loading seat inventory…" />;

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={['Bus', 'Seat inventory']}
        title="Seat inventory"
        description="Live seats from your published trips in MySQL (erp_seat_inventory). Occupancy updates when a ticket is booked."
      />

      <div className="flex flex-wrap gap-3">
        <select className={inputCls + ' max-w-[220px]'} value={busId} onChange={(e) => setBusId(e.target.value)}>
          <option value="">All coaches</option>
          {fleet.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="date" className={inputCls + ' max-w-[160px]'} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Trips today" value={String(trips.filter((t) => t.departure_date === date).length)} icon={Ticket} tone="blue" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Available" value={String(available)} icon={Ticket} tone="green" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Held" value={String(locked)} icon={Lock} tone="amber" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Booked" value={String(booked)} icon={Ticket} tone="crimson" /></div>
      </div>

      <Card>
        <h3 className="mb-3 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Published trips</h3>
        {trips.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="py-2">Date</th><th>Route</th><th>Coach</th><th>Time</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trips.slice(0, 40).map((t) => {
                  const route = routeRows.find((r) => r.id === t.route_id);
                  const bus = fleet.find((b) => b.id === t.bus_id);
                  const open = seats.filter((s) => s.bus_id === t.bus_id && s.travel_date === t.departure_date && (s.status === 'available' || s.status === 'open')).length;
                  return (
                    <tr key={t.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2">{t.departure_date}</td>
                      <td>{route ? `${route.from_city} → ${route.to_city}` : t.route_id}</td>
                      <td>{bus?.name ?? '—'}</td>
                      <td>{t.departure_time}{t.arrival_time ? ` → ${t.arrival_time}` : ''}</td>
                      <td><Badge tone={t.status === 'scheduled' ? 'green' : 'gray'}>{t.status} · {open} open</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyStateCard icon={Ticket} title="No published trips" description="Create a route and schedule under Bus → Trips / schedules. Seats seed when the trip is saved." />}
      </Card>

      <Card>
        <h3 className="mb-3 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Seat map</h3>
        {filtered.length ? (
          <div className="flex flex-wrap gap-2">
            {filtered.map((s) => (
              <span
                key={s.id}
                title={`${s.seat_number} · ${s.status}${s.passenger_name ? ` · ${s.passenger_name}` : ''}`}
                className={`grid h-9 min-w-10 place-items-center rounded-md px-2 text-[11px] font-medium ${
                  s.status === 'available' || s.status === 'open' ? 'bg-emerald-500/20 text-emerald-700' :
                  s.status === 'locked' || s.status === 'hold' ? 'bg-amber-500/25 text-amber-800' :
                  'bg-slate-200 text-slate-500'
                }`}
              >{s.seat_number}</span>
            ))}
          </div>
        ) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No seat rows for this coach and date yet.</p>}
      </Card>

      <Card>
        <h3 className="mb-3 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Active holds</h3>
        {locks.length ? locks.map((l) => (
          <div key={l.id} className="mb-2 flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
            <Lock className="h-4 w-4 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{(l.seat_numbers || []).join(', ') || l.id}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{l.travel_date} · expires {l.expires_at ? new Date(l.expires_at).toLocaleString() : '—'}</p>
            </div>
            <Badge tone="amber">{l.status}</Badge>
          </div>
        )) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No live holds.</p>}
      </Card>
    </div>
  );
}
