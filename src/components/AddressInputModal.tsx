import { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Calculator, Check, Loader2 } from 'lucide-react';
import { useCarStore } from '../store/carStore';
import { MOCK_PLACES, mockDistanceForAddresses, type LastMileCar } from '../data/mockCars';
import { formatINR } from '../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  car: LastMileCar | null;
  onConfirm: (pickup: string, dropoff: string, distanceKm: number, fare: number) => void;
}

export default function AddressInputModal({ open, onClose, car, onConfirm }: Props) {
  const { address, setAddress } = useCarStore();
  const [pickup, setPickup] = useState(address?.pickup_address ?? '');
  const [dropoff, setDropoff] = useState(address?.dropoff_address ?? '');
  const [pickupSugg, setPickupSugg] = useState<string[]>([]);
  const [dropoffSugg, setDropoffSugg] = useState<string[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [distance, setDistance] = useState({ km: 0, mins: 0 });

  useEffect(() => {
    if (open) {
      setPickup(address?.pickup_address ?? '');
      setDropoff(address?.dropoff_address ?? '');
      setDistance({ km: 0, mins: 0 });
    }
  }, [open, address]);

  useEffect(() => {
    if (pickup.length > 1) {
      const all = Object.values(MOCK_PLACES).flat();
      setPickupSugg(all.filter((p) => p.toLowerCase().includes(pickup.toLowerCase())).slice(0, 5));
    } else setPickupSugg([]);
  }, [pickup]);

  useEffect(() => {
    if (dropoff.length > 1) {
      const all = Object.values(MOCK_PLACES).flat();
      setDropoffSugg(all.filter((p) => p.toLowerCase().includes(dropoff.toLowerCase())).slice(0, 5));
    } else setDropoffSugg([]);
  }, [dropoff]);

  useEffect(() => {
    if (pickup && dropoff) {
      setCalculating(true);
      const t = setTimeout(() => {
        setDistance(mockDistanceForAddresses(pickup, dropoff));
        setCalculating(false);
      }, 500);
      return () => clearTimeout(t);
    } else setDistance({ km: 0, mins: 0 });
  }, [pickup, dropoff]);

  if (!open) return null;

  const fare = car ? car.base_fare + car.rate_per_km * Math.max(1, Math.round(distance.km)) : 0;
  const valid = pickup.trim().length > 3 && dropoff.trim().length > 3;

  function confirm() {
    if (!valid) return;
    setAddress({ pickup_address: pickup, dropoff_address: dropoff, distance_km: distance.km, estimated_mins: distance.mins });
    onConfirm(pickup, dropoff, distance.km, fare);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-[var(--bg-surface)] shadow-card animate-scale-in" style={{ borderColor: 'var(--border)' }}>
        <div className="bg-gradient-to-br from-crimson-800 to-crimson-950 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Last-Mile Ride Details</h2>
              <p className="text-xs text-crimson-100/80">{car ? `${car.model} · ${car.mode}` : 'Enter pickup & drop-off'}</p>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="label-text flex items-center gap-1.5"><MapPin className="h-3 w-3 text-emerald-400" /> Pickup Address</label>
            <div className="relative mt-1.5">
              <input className="input-field" placeholder="Enter pickup location or landmark" value={pickup} onChange={(e) => setPickup(e.target.value)} autoFocus />
              {pickupSugg.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-[var(--bg-surface)] shadow-card" style={{ borderColor: 'var(--border)' }}>
                  {pickupSugg.map((s) => (
                    <button key={s} onClick={() => { setPickup(s); setPickupSugg([]); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-secondary)' }}><MapPin className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} /> {s}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label-text flex items-center gap-1.5"><Navigation className="h-3 w-3 text-crimson-400" /> Drop-off Address</label>
            <div className="relative mt-1.5">
              <input className="input-field" placeholder="Enter drop-off destination" value={dropoff} onChange={(e) => setDropoff(e.target.value)} />
              {dropoffSugg.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-[var(--bg-surface)] shadow-card" style={{ borderColor: 'var(--border)' }}>
                  {dropoffSugg.map((s) => (
                    <button key={s} onClick={() => { setDropoff(s); setDropoffSugg([]); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-secondary)' }}><Navigation className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} /> {s}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {distance.km > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-accent-teal/30 bg-accent-teal/10 px-4 py-3 text-sm text-accent-teal">
              {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              <span>Distance: <strong>{distance.km} km</strong> · ETA <strong>{distance.mins} min</strong></span>
            </div>
          )}

          {car && distance.km > 0 && (
            <div className="rounded-xl border bg-[var(--bg-raised)] p-4" style={{ borderColor: 'var(--border)' }}>
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Fare Breakdown</h4>
              <div className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Base fare</span><span>{formatINR(car.base_fare)}</span></div>
                <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>{distance.km} km × {formatINR(car.rate_per_km)}/km</span><span>{formatINR(car.rate_per_km * distance.km)}</span></div>
                <div className="divider my-1.5" />
                <div className="flex justify-between font-semibold"><span style={{ color: 'var(--text-primary)' }}>Total</span><span className="font-display text-lg text-gradient-crimson">{formatINR(fare)}</span></div>
              </div>
            </div>
          )}

          {!valid && (pickup || dropoff) && <p className="text-xs text-amber-400">Both pickup and drop-off addresses are required to continue.</p>}

          <button onClick={confirm} disabled={!valid} className="btn-primary w-full disabled:opacity-40">
            <Check className="h-4 w-4" /> Confirm Address & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
