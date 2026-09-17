import { useState } from 'react';
import { Bus, Plus, X, Fuel, Activity, Wrench } from 'lucide-react';
import { useOperatorStore } from '../../store/operatorStore';
import type { FleetBus } from '../../types-operator';

export default function BusFleetManager() {
  const { fleet, routes, addBus, updateBus, removeBus } = useOperatorStore();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Partial<FleetBus>>({ status: 'idle', fuel_pct: 100, engine_health: 'good', capacity: 44 });

  function save() {
    if (!draft.id || !draft.registration || !draft.model) return;
    addBus({ ...draft } as FleetBus);
    setDraft({ status: 'idle', fuel_pct: 100, engine_health: 'good', capacity: 44 });
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Bus Fleet Manager</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Track and manage your bus fleet.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Add Bus</button>
      </div>

      {showForm && (
        <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block"><span className="label-text">Bus ID</span><input value={draft.id ?? ''} onChange={(e) => setDraft({ ...draft, id: e.target.value })} className="input-field mt-1.5 text-sm" placeholder="FB-05" /></label>
            <label className="block"><span className="label-text">Registration</span><input value={draft.registration ?? ''} onChange={(e) => setDraft({ ...draft, registration: e.target.value })} className="input-field mt-1.5 text-sm" placeholder="AP 28 AB 1234" /></label>
            <label className="block"><span className="label-text">Model</span><input value={draft.model ?? ''} onChange={(e) => setDraft({ ...draft, model: e.target.value })} className="input-field mt-1.5 text-sm" placeholder="Volvo 9400XL" /></label>
            <label className="block"><span className="label-text">Capacity</span><input type="number" value={draft.capacity ?? 44} onChange={(e) => setDraft({ ...draft, capacity: +e.target.value })} className="input-field mt-1.5 text-sm" /></label>
            <label className="block"><span className="label-text">Fuel %</span><input type="number" value={draft.fuel_pct ?? 100} onChange={(e) => setDraft({ ...draft, fuel_pct: +e.target.value })} className="input-field mt-1.5 text-sm" /></label>
            <label className="block"><span className="label-text">Status</span>
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as FleetBus['status'] })} className="input-field mt-1.5 text-sm">
                <option value="idle">Idle</option><option value="running">Running</option><option value="maintenance">Maintenance</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="btn-primary text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fleet.map((b) => {
          const route = routes.find((r) => r.id === b.route_id);
          return (
            <div key={b.id} className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2"><Bus className="h-5 w-5 text-crimson-600" /><div><p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{b.model}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.id} · {b.registration}</p></div></div>
                <button onClick={() => removeBus(b.id)} className="text-red-500 hover:text-red-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${b.status === 'running' ? 'bg-emerald-500/15 text-emerald-600' : b.status === 'maintenance' ? 'bg-amber-500/15 text-amber-600' : ''}`} style={b.status === 'idle' ? { color: 'var(--text-muted)' } : undefined}>{b.status}</span>
                <span className="flex items-center gap-1 rounded-full bg-[var(--bg-raised)] px-2 py-0.5" style={{ color: 'var(--text-secondary)' }}><Fuel className="h-3 w-3" /> {b.fuel_pct}%</span>
                <span className="flex items-center gap-1 rounded-full bg-[var(--bg-raised)] px-2 py-0.5" style={{ color: 'var(--text-secondary)' }}><Activity className="h-3 w-3" /> {b.engine_health}</span>
              </div>
              <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{b.capacity} seats · {route ? `${route.from_city} → ${route.to_city}` : 'No route assigned'}</p>
              <div className="mt-3">
                <select value={b.status} onChange={(e) => updateBus(b.id, { status: e.target.value as FleetBus['status'] })} className="input-field text-xs">
                  <option value="idle">Idle</option><option value="running">Running</option><option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
