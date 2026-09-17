import { Car, Clock, Check, Navigation, Zap, MapPin } from 'lucide-react';
import { mockLastMileCars, type LastMileCar } from '../data/mockCars';
import { useCarStore } from '../store/carStore';
import { formatINR } from '../lib/format';

interface Props {
  selectedCar: LastMileCar | null;
  onSelect: (car: LastMileCar | null) => void;
  onRequireAddress: (car: LastMileCar) => void;
}

export default function LastMileUpsell({ selectedCar, onSelect, onRequireAddress }: Props) {
  const { address } = useCarStore();

  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600"><Navigation className="h-4 w-4" /></div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Last-Mile Ride</h4>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Add a pickup or drop-off car to your booking</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {mockLastMileCars.map((car) => {
          const active = selectedCar?.id === car.id;
          return (
            <button key={car.id} onClick={() => onSelect(active ? null : car)} className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${active ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--bg-raised)] hover:border-emerald-500/30'}`}>
              <img src={car.image_url} alt={car.model} className="h-12 w-16 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{car.model}</p>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  <span className="flex items-center gap-0.5"><Car className="h-3 w-3" /> {car.type}</span>
                  <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {car.eta_mins} min</span>
                  <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${car.mode === 'self-drive' ? 'bg-blue-500/15 text-blue-500' : 'bg-crimson-500/15 text-crimson-600'}`}>
                    {car.mode === 'self-drive' ? <Zap className="inline h-2.5 w-2.5" /> : <Check className="inline h-2.5 w-2.5" />} {car.mode}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>from</p>
                <p className="text-sm font-bold text-emerald-600">{formatINR(car.base_fare)}</p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>+{formatINR(car.rate_per_km)}/km</p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedCar && !address && (
        <button onClick={() => onRequireAddress(selectedCar)} className="btn-primary mt-3 w-full text-xs"><MapPin className="h-4 w-4" /> Enter Pickup & Drop-off Address</button>
      )}

      {selectedCar && address && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-600"><Check className="h-3 w-3" /> Address confirmed</div>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Pickup: {address.pickup_address}</p>
          <p style={{ color: 'var(--text-secondary)' }}>Drop: {address.dropoff_address} · {address.distance_km} km</p>
          <button onClick={() => onRequireAddress(selectedCar)} className="mt-1 text-crimson-600 hover:underline">Edit address</button>
        </div>
      )}
    </div>
  );
}
