import { useState, useMemo } from 'react';
import { Users, Car, Calendar, Check, X, AlertTriangle, Clock } from 'lucide-react';
import { useOperatorStore } from '../../store/operatorStore';
import type { FleetCar, Driver } from '../../types-operator';

interface Assignment { carId: string; driverId: string; shift: 'morning' | 'afternoon' | 'night'; date: string; }

export default function CarDriverRoster() {
  const { cars, drivers } = useOperatorStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [draft, setDraft] = useState<{ carId: string; driverId: string; shift: Assignment['shift'] } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const chauffeuredCars = cars.filter((c) => c.mode === 'chauffeured');
  const availableDrivers = drivers.filter((d) => d.status !== 'leave');

  function assign() {
    if (!draft || !draft.carId || !draft.driverId) return;
    // Overlap prevention: same driver can't be on two shifts same date
    const conflict = assignments.some((a) => a.driverId === draft.driverId && a.date === today && a.shift === draft.shift);
    if (conflict) { alert('Driver already assigned to this shift.'); return; }
    setAssignments([...assignments, { ...draft, date: today }]);
    setDraft(null);
  }

  function remove(idx: number) { setAssignments(assignments.filter((_, i) => i !== idx)); }

  const dutyStatus = useMemo(() => {
    const byDriver: Record<string, number> = {};
    assignments.forEach((a) => { byDriver[a.driverId] = (byDriver[a.driverId] ?? 0) + 1; });
    return byDriver;
  }, [assignments]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Car Driver Roster</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Assign drivers to chauffeured cars with shift scheduling and overlap prevention.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card icon={Car} label="Chauffeured cars" value={String(chauffeuredCars.length)} color="text-crimson-600" />
        <Card icon={Users} label="Available drivers" value={String(availableDrivers.length)} color="text-emerald-600" />
        <Card icon={Calendar} label="Today's assignments" value={String(assignments.length)} color="text-blue-500" />
        <Card icon={Clock} label="Unassigned cars" value={String(Math.max(0, chauffeuredCars.length - assignments.length))} color="text-amber-600" />
      </div>

      {/* New assignment */}
      <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>New Assignment</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="label-text">Car</span>
            <select value={draft?.carId ?? ''} onChange={(e) => setDraft({ carId: e.target.value, driverId: draft?.driverId ?? '', shift: draft?.shift ?? 'morning' })} className="input-field mt-1.5 text-sm">
              <option value="">Select car</option>
              {chauffeuredCars.map((c) => <option key={c.id} value={c.id}>{c.model} ({c.id})</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label-text">Driver</span>
            <select value={draft?.driverId ?? ''} onChange={(e) => setDraft({ carId: draft?.carId ?? '', driverId: e.target.value, shift: draft?.shift ?? 'morning' })} className="input-field mt-1.5 text-sm">
              <option value="">Select driver</option>
              {availableDrivers.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label-text">Shift</span>
            <select value={draft?.shift ?? 'morning'} onChange={(e) => setDraft({ carId: draft?.carId ?? '', driverId: draft?.driverId ?? '', shift: e.target.value as Assignment['shift'] })} className="input-field mt-1.5 text-sm">
              <option value="morning">Morning (6am-2pm)</option>
              <option value="afternoon">Afternoon (2pm-10pm)</option>
              <option value="night">Night (10pm-6am)</option>
            </select>
          </label>
          <button onClick={assign} disabled={!draft?.carId || !draft?.driverId} className="btn-primary mt-auto disabled:opacity-40 text-sm"><Check className="h-4 w-4" /> Assign</button>
        </div>
      </div>

      {/* Schedule grid */}
      <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Today's Schedule — {today}</h3>
        {assignments.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>No assignments yet. Create one above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="pb-3 pr-4 font-medium">Car</th>
                  <th className="pb-3 pr-4 font-medium">Driver</th>
                  <th className="pb-3 pr-4 font-medium">Shift</th>
                  <th className="pb-3 pr-4 font-medium">Duty count</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => {
                  const car = cars.find((c) => c.id === a.carId);
                  const driver = drivers.find((d) => d.id === a.driverId);
                  return (
                    <tr key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-3 pr-4"><div className="flex items-center gap-2"><Car className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /><span style={{ color: 'var(--text-primary)' }}>{car?.model ?? a.carId}</span></div></td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{driver?.name ?? a.driverId}</td>
                      <td className="py-3 pr-4"><span className="rounded-full bg-[var(--bg-raised)] px-2 py-0.5 text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{a.shift}</span></td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-muted)' }}>{dutyStatus[a.driverId] ?? 1}</td>
                      <td className="py-3"><button onClick={() => remove(i)} className="text-red-500 hover:text-red-400"><X className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Driver duty status */}
      <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Driver Duty Status</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {availableDrivers.map((d) => {
            const count = dutyStatus[d.id] ?? 0;
            return (
              <div key={d.id} className="flex items-center justify-between rounded-lg border bg-[var(--bg-raised)] px-3 py-2.5 text-sm" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2"><Users className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /><div><p style={{ color: 'var(--text-primary)' }}>{d.name}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.id} · {d.status}</p></div></div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${count === 0 ? 'bg-[var(--bg-surface)] text-[var(--text-muted)]' : count < 3 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>{count} shift{count !== 1 ? 's' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return <div className="rounded-2xl border bg-[var(--bg-surface)] p-4" style={{ borderColor: 'var(--border)' }}><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span></div><p className={`mt-2 text-lg font-bold ${color}`}>{value}</p></div>;
}
