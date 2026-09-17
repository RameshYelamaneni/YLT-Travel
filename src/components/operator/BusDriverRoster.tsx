import { useState } from 'react';
import { Users, Bus, Plus, X, Star, Phone, BadgeCheck } from 'lucide-react';
import { useOperatorStore } from '../../store/operatorStore';
import type { Driver } from '../../types-operator';

export default function BusDriverRoster() {
  const { drivers, fleet, addDriver, removeDriver, updateDriver } = useOperatorStore();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Partial<Driver>>({ status: 'off-duty', rating: 4.5, assigned_bus_id: null });

  function save() {
    if (!draft.id || !draft.name) return;
    addDriver({ ...draft } as Driver);
    setDraft({ status: 'off-duty', rating: 4.5, assigned_bus_id: null });
    setShowForm(false);
  }

  const onDuty = drivers.filter((d) => d.status === 'on-duty').length;
  const offDuty = drivers.filter((d) => d.status === 'off-duty').length;
  const onLeave = drivers.filter((d) => d.status === 'leave').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Bus Driver Roster</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Manage drivers, assignments, and duty status.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Add Driver</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card icon={Users} label="Total" value={String(drivers.length)} color="text-crimson-600" />
        <Card icon={BadgeCheck} label="On-duty" value={String(onDuty)} color="text-emerald-600" />
        <Card icon={Users} label="Off-duty" value={String(offDuty)} color="text-blue-500" />
        <Card icon={Users} label="On leave" value={String(onLeave)} color="text-amber-600" />
      </div>

      {showForm && (
        <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block"><span className="label-text">Driver ID</span><input value={draft.id ?? ''} onChange={(e) => setDraft({ ...draft, id: e.target.value })} className="input-field mt-1.5 text-sm" placeholder="DR-05" /></label>
            <label className="block"><span className="label-text">Name</span><input value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="input-field mt-1.5 text-sm" placeholder="Full name" /></label>
            <label className="block"><span className="label-text">Phone</span><input value={draft.phone ?? ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className="input-field mt-1.5 text-sm" placeholder="9876543210" /></label>
            <label className="block"><span className="label-text">License No.</span><input value={draft.license_no ?? ''} onChange={(e) => setDraft({ ...draft, license_no: e.target.value })} className="input-field mt-1.5 text-sm" /></label>
            <label className="block"><span className="label-text">Rating</span><input type="number" step="0.1" value={draft.rating ?? 4.5} onChange={(e) => setDraft({ ...draft, rating: +e.target.value })} className="input-field mt-1.5 text-sm" /></label>
            <label className="block"><span className="label-text">Status</span>
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Driver['status'] })} className="input-field mt-1.5 text-sm">
                <option value="off-duty">Off-duty</option><option value="on-duty">On-duty</option><option value="leave">Leave</option>
              </select>
            </label>
          </div>
          <button onClick={save} className="btn-primary mt-4 text-sm">Save Driver</button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {drivers.map((d) => {
          const bus = fleet.find((b) => b.id === d.assigned_bus_id);
          return (
            <div key={d.id} className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-crimson-600/15 text-crimson-600 font-bold">{d.name.charAt(0)}</div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.id} · {d.license_no}</p>
                  </div>
                </div>
                <button onClick={() => removeDriver(d.id)} className="text-red-500 hover:text-red-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1 rounded-full bg-[var(--bg-raised)] px-2 py-0.5" style={{ color: 'var(--text-secondary)' }}><Star className="h-3 w-3 text-amber-500" /> {d.rating}</span>
                <span className="flex items-center gap-1 rounded-full bg-[var(--bg-raised)] px-2 py-0.5" style={{ color: 'var(--text-secondary)' }}><Phone className="h-3 w-3" /> {d.phone}</span>
                <span className={`rounded-full px-2 py-0.5 ${d.status === 'on-duty' ? 'bg-emerald-500/15 text-emerald-600' : d.status === 'leave' ? 'bg-amber-500/15 text-amber-600' : ''}`} style={d.status === 'off-duty' ? { color: 'var(--text-muted)' } : undefined}>{d.status}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Bus className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <select value={d.assigned_bus_id ?? ''} onChange={(e) => updateDriver(d.id, { assigned_bus_id: e.target.value || null })} className="input-field flex-1 text-xs">
                  <option value="">Unassigned</option>
                  {fleet.map((b) => <option key={b.id} value={b.id}>{b.id} ({b.model})</option>)}
                </select>
                <select value={d.status} onChange={(e) => updateDriver(d.id, { status: e.target.value as Driver['status'] })} className="input-field text-xs">
                  <option value="off-duty">Off-duty</option><option value="on-duty">On-duty</option><option value="leave">Leave</option>
                </select>
              </div>
              {bus && <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Assigned to {bus.model} ({bus.id})</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return <div className="rounded-2xl border bg-[var(--bg-surface)] p-4" style={{ borderColor: 'var(--border)' }}><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span></div><p className={`mt-2 text-lg font-bold ${color}`}>{value}</p></div>;
}
