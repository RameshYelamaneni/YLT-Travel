import { useState } from 'react';
import { Plus, Car, Fuel, Gauge, Trash2, X, BadgeCheck, ShieldCheck } from 'lucide-react';
import { useOperatorStore } from '../../store/operatorStore';
import type { FleetCar, CarType, CarMode, FuelType } from '../../types-operator';

const emptyCar: Omit<FleetCar, 'id'> = {
  registration: '', model: '', type: 'Sedan', mode: 'chauffeured', fuel: 'cng',
  status: 'available', location_city: 'Hyderabad', rate_per_km: 14, base_fare: 149, odometer_km: 0,
};

export default function CarFleetManager() {
  const { cars, addCar, updateCar, removeCar } = useOperatorStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newCar, setNewCar] = useState(emptyCar);
  const inputCls = 'w-full rounded-lg border bg-[var(--bg-input)] px-3 py-2 text-sm focus:border-crimson-500 focus:outline-none';

  function handleAdd() {
    if (!newCar.registration || !newCar.model) return;
    const id = `FC-${String(cars.length + 1).padStart(3, '0')}`;
    addCar({ ...newCar, id });
    setShowAdd(false);
    setNewCar(emptyCar);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Car Fleet Manager</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Last-mile cars, self-drive fleet, pricing & SLA rules.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Add Car</button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cars.map((c) => (
          <div key={c.id} className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600"><Car className="h-5 w-5" /></div>
                <div><p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.model}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.id} · {c.registration} · {c.type} · {c.mode}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${c.status === 'available' ? 'bg-emerald-500/15 text-emerald-600' : c.status === 'on-trip' ? 'bg-blue-500/15 text-blue-500' : 'bg-amber-500/15 text-amber-600'}`}>{c.status}</span>
                <button onClick={() => removeCar(c.id)} className="rounded-lg p-1.5 transition hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--text-muted)' }}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric icon={Fuel} label="Fuel" value={c.fuel} />
              <Metric icon={Gauge} label="Rate/km" value={`₹${c.rate_per_km}`} />
              <Metric icon={Car} label="Base Fare" value={`₹${c.base_fare}`} />
              <Metric icon={BadgeCheck} label="SLA" value={c.mode === 'chauffeured' ? 'Verified' : 'Standard'} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['available', 'on-trip', 'maintenance'] as const).map((st) => (
                <button key={st} onClick={() => updateCar(c.id, { status: st })} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${c.status === st ? 'bg-crimson-600/15 text-crimson-600' : 'hover:bg-[var(--bg-raised)]'}`} style={c.status === st ? undefined : { color: 'var(--text-secondary)' }}>Mark {st}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add Car</h3>
              <button onClick={() => setShowAdd(false)} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Registration"><input value={newCar.registration} onChange={(e) => setNewCar({ ...newCar, registration: e.target.value })} className={inputCls} placeholder="AP 28 AB 0001" /></Field>
              <Field label="Model"><input value={newCar.model} onChange={(e) => setNewCar({ ...newCar, model: e.target.value })} className={inputCls} placeholder="Maruti Dzire" /></Field>
              <Field label="Type"><select value={newCar.type} onChange={(e) => setNewCar({ ...newCar, type: e.target.value as CarType })} className={inputCls}>{['Sedan', 'SUV', 'Hatchback'].map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Mode"><select value={newCar.mode} onChange={(e) => setNewCar({ ...newCar, mode: e.target.value as CarMode })} className={inputCls}>{['self-drive', 'chauffeured'].map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
              <Field label="Fuel"><select value={newCar.fuel} onChange={(e) => setNewCar({ ...newCar, fuel: e.target.value as FuelType })} className={inputCls}>{['cng', 'diesel', 'petrol', 'electric'].map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
              <Field label="City"><input value={newCar.location_city} onChange={(e) => setNewCar({ ...newCar, location_city: e.target.value })} className={inputCls} /></Field>
              <Field label="Rate/km ₹"><input type="number" value={newCar.rate_per_km} onChange={(e) => setNewCar({ ...newCar, rate_per_km: +e.target.value })} className={inputCls} /></Field>
              <Field label="Base Fare ₹"><input type="number" value={newCar.base_fare} onChange={(e) => setNewCar({ ...newCar, base_fare: +e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="mt-4 rounded-lg border bg-[var(--bg-raised)] p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>SLA Rules & Documents (mock)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600"><ShieldCheck className="h-3 w-3" /> Insurance valid</span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600"><BadgeCheck className="h-3 w-3" /> PUC valid</span>
                <span className="flex items-center gap-1 rounded-full bg-[var(--bg-surface)] px-2.5 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>Upload RC (mock)</span>
              </div>
            </div>
            <button onClick={handleAdd} className="btn-primary mt-5 w-full">Add Car</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>{children}</label>; }
function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string }) { return <div className="flex items-center gap-2 rounded-lg border bg-[var(--bg-raised)] px-3 py-2" style={{ borderColor: 'var(--border)' }}><Icon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /><div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p></div></div>; }
