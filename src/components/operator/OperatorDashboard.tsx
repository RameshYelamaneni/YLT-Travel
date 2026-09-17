import { Bus, Car, Users, TrendingUp, Fuel, AlertTriangle, Activity } from 'lucide-react';
import { useOperatorStore } from '../../store/operatorStore';
import { mockCarRentals } from '../../data/mockCars';
import { formatINR } from '../../lib/format';

export default function OperatorDashboard() {
  const { fleet, drivers, routes, expenses, cars } = useOperatorStore();
  const running = fleet.filter((b) => b.status === 'running').length;
  const availableCars = cars.filter((c) => c.status === 'available').length;
  const onDutyDrivers = drivers.filter((d) => d.status === 'on-duty').length;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const alerts = fleet.filter((b) => b.fuel_pct < 30 || b.engine_health === 'critical');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Operator Dashboard</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Live overview of buses, cars, drivers and revenue.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={Bus} label="Buses" value={String(fleet.length)} color="text-crimson-600" />
        <Stat icon={Bus} label="Running" value={String(running)} color="text-emerald-600" />
        <Stat icon={Car} label="Cars" value={String(cars.length)} color="text-blue-500" />
        <Stat icon={Car} label="Cars avail." value={String(availableCars)} color="text-emerald-600" />
        <Stat icon={Users} label="On-duty" value={String(onDutyDrivers)} color="text-amber-600" />
        <Stat icon={TrendingUp} label="Expenses" value={formatINR(totalExpenses)} color="text-crimson-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
          <h3 className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}><Activity className="h-4 w-4 text-crimson-600" /> Fleet Status</h3>
          <div className="mt-4 space-y-2">
            {fleet.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border bg-[var(--bg-raised)] px-3 py-2.5 text-sm" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2"><Bus className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /><div><p style={{ color: 'var(--text-primary)' }}>{b.model}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.id} · {b.registration}</p></div></div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 text-xs ${b.fuel_pct < 30 ? 'text-red-500' : ''}`} style={b.fuel_pct < 30 ? undefined : { color: 'var(--text-secondary)' }}><Fuel className="h-3 w-3" /> {b.fuel_pct}%</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${b.status === 'running' ? 'bg-emerald-500/15 text-emerald-600' : b.status === 'maintenance' ? 'bg-amber-500/15 text-amber-600' : ''}`} style={b.status !== 'running' && b.status !== 'maintenance' ? { color: 'var(--text-muted)' } : undefined}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
          <h3 className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}><AlertTriangle className="h-4 w-4 text-amber-600" /> Alerts</h3>
          <div className="mt-4 space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-emerald-600">No critical alerts.</p>
            ) : alerts.map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> {b.id}: {b.fuel_pct < 30 ? 'Low fuel' : 'Engine critical'}
              </div>
            ))}
            <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
              <span className="font-medium">{mockCarRentals.length} car rental options available</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Active Routes</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {routes.map((r) => (
            <div key={r.id} className="rounded-lg border bg-[var(--bg-raised)] p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.from_city} → {r.to_city}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.distance_km} km · {r.trips_per_day} trips/day</p>
              <p className="mt-1 text-sm font-semibold text-crimson-600">From {formatINR(r.base_fare)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return <div className="rounded-2xl border bg-[var(--bg-surface)] p-4" style={{ borderColor: 'var(--border)' }}><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span></div><p className={`mt-2 text-lg font-bold ${color}`}>{value}</p></div>;
}
