import { useMemo, useState, useEffect } from 'react';
import {
  Star, Clock, BadgeCheck, Check, MapPin, Filter, Shield, ArrowRight, CheckCircle2, Zap, Car as CarIcon,
} from 'lucide-react';
import { mockCarRentals, MOCK_CITIES, calculateCarFare, type CarRentalOption, type CarRentalService } from '../data/mockCars';
import { formatINR, formatTime12 } from '../lib/format';
import { useCarStore } from '../store/carStore';
import { useCheckoutStore } from '../store/checkoutStore';
import { TAX_RATE, surgeMultiplier, currentPricingContext, airportFare } from '../lib/business';
import { buildTicket, type TicketData } from '../lib/ticket';
import { recordBooking } from './MyBookingsPage';
import TicketActions from './TicketActions';
import type { View } from '../store/nav';

const SERVICES: { id: CarRentalService; label: string }[] = [
  { id: 'chauffeured', label: 'Chauffeured' },
  { id: 'outstation', label: 'Outstation' },
  { id: 'airport', label: 'Airport' },
  { id: 'hourly', label: 'Hourly' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'self-drive', label: 'Self-Drive' },
];

export default function CarMarketplacePage({ go, onRequireAuth }: { go: (v: View) => void; onRequireAuth?: (action: string, proceed?: () => void) => void }) {
  const store = useCarStore();
  const [selected, setSelected] = useState<CarRentalOption | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const results = mockCarRentals.filter((c) => {
    if (store.service !== 'all' && c.service !== store.service) return false;
    if (store.carType !== 'all' && c.type !== store.carType) return false;
    if (store.service === 'all' && store.mode !== 'all' && c.mode !== store.mode) return false;
    if (store.pickupCity !== 'all' && c.city !== store.pickupCity) return false;
    return true;
  });

  return (
    <div>
      {/* Animated car hero background */}
      <div className="relative overflow-hidden border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="absolute inset-0">
          <img src="https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-page)]/85 via-[var(--bg-page)]/90 to-[var(--bg-page)]" />
        </div>
        {/* Driving car silhouette */}
        <div className="pointer-events-none absolute bottom-2 left-0 right-0 h-8 overflow-hidden opacity-40">
          <div className="animate-drive text-crimson-500">
            <CarIcon className="h-7 w-7" />
          </div>
        </div>
        <div className="container-fluid relative py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-crimson-500" />
              <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Car Bookings</h1>
              <span className="ml-2 chip chip-crimson text-[10px]">Marketplace</span>
            </div>
            <button onClick={() => setShowFilters((s) => !s)} className="btn-ghost text-xs lg:hidden"><Filter className="h-4 w-4" /> Filters</button>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Chauffeured, outstation, airport, hourly, subscription & self-drive rentals.</p>
        </div>
      </div>

      <div className="container-fluid mt-6 grid gap-4 lg:grid-cols-[240px_1fr_340px] xl:grid-cols-[260px_1fr_380px]">
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="surface p-5 lg:sticky lg:top-20">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}><Filter className="h-4 w-4 text-crimson-500" /> Filters</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label-text">Pickup City</label>
                <select value={store.pickupCity} onChange={(e) => store.set('pickupCity', e.target.value)} className="input-field mt-1.5 text-sm">
                  <option value="all">All cities</option>
                  {MOCK_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Service Type</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button onClick={() => store.set('service', 'all')} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${store.service === 'all' ? 'bg-crimson-600 text-white' : 'bg-[var(--bg-raised)] hover:bg-[var(--bg-surface)]'}`} style={store.service === 'all' ? undefined : { color: 'var(--text-secondary)' }}>All</button>
                  {SERVICES.map((s) => <button key={s.id} onClick={() => store.set('service', s.id)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${store.service === s.id ? 'bg-crimson-600 text-white' : 'bg-[var(--bg-raised)] hover:bg-[var(--bg-surface)]'}`} style={store.service === s.id ? undefined : { color: 'var(--text-secondary)' }}>{s.label}</button>)}
                </div>
              </div>
              <div>
                <label className="label-text">Car Type</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(['all', 'Sedan', 'SUV', 'Hatchback', 'Luxury'] as const).map((t) => <button key={t} onClick={() => store.set('carType', t)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${store.carType === t ? 'bg-crimson-600 text-white' : 'bg-[var(--bg-raised)] hover:bg-[var(--bg-surface)]'}`} style={store.carType === t ? undefined : { color: 'var(--text-secondary)' }}>{t === 'all' ? 'All' : t}</button>)}
                </div>
              </div>
              <div>
                <label className="label-text">Pickup Date & Time</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <input type="date" value={store.date} onChange={(e) => store.set('date', e.target.value)} className="input-field text-xs" />
                  <input type="time" value={store.time} onChange={(e) => store.set('time', e.target.value)} className="input-field text-xs" />
                </div>
              </div>
              <div>
                <label className="label-text">Pickup Address</label>
                <input value={store.pickupAddress} onChange={(e) => store.set('pickupAddress', e.target.value)} className="input-field mt-1.5 text-sm" placeholder="Enter pickup address" />
              </div>
              <div>
                <label className="label-text">Drop-off Address</label>
                <input value={store.dropoffAddress} onChange={(e) => store.set('dropoffAddress', e.target.value)} className="input-field mt-1.5 text-sm" placeholder="Enter drop-off address" />
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{results.length} cars available</p>
          {results.length === 0 ? (
            <div className="surface p-10 text-center"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No cars match your filters.</p></div>
          ) : results.map((car) => {
            const active = selected?.id === car.id;
            return (
              <button key={car.id} onClick={() => setSelected(car)} className={`surface-raised flex w-full items-center gap-4 p-4 text-left transition-all ${active ? 'ring-2 ring-crimson-500' : 'hover:border-crimson-500/30'}`}>
                <img src={car.image_url} alt={car.model} className="h-20 w-28 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{car.model}</p>
                    {car.sla_verified && <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600"><BadgeCheck className="h-3 w-3" /> SLA</span>}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{car.operator} · {car.type} · {car.mode}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> {car.rating}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {car.eta_mins} min ETA</span>
                    <span>{car.features.slice(0, 3).join(' · ')}</span>
                  </div>
                </div>
                <div className="text-right"><p className="text-xs" style={{ color: 'var(--text-muted)' }}>from</p><p className="font-display text-lg font-bold text-gradient-crimson">{formatINR(car.base_fare)}</p></div>
              </button>
            );
          })}
        </div>

        <aside>
          {selected ? <CarCheckout car={selected} go={go} onRequireAuth={onRequireAuth} /> : (
            <div className="surface p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select a car to book.</p></div>
          )}
        </aside>
      </div>
    </div>
  );
}

function CarCheckout({ car, go, onRequireAuth }: { car: CarRentalOption; go: (v: View) => void; onRequireAuth?: (action: string, proceed?: () => void) => void }) {
  const store = useCarStore();
  const checkout = useCheckoutStore();
  const [confirmed, setConfirmed] = useState(false);
  const [ticket, setTicket] = useState<TicketData | null>(null);

  const distanceKm = useMemo(() => {
    if (store.pickupAddress && store.dropoffAddress) {
      const hash = (store.pickupAddress + store.dropoffAddress).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      return Math.max(8, (hash % 60) + 10);
    }
    return 25;
  }, [store.pickupAddress, store.dropoffAddress]);

  const baseFare = useMemo(() => {
    if (car.service === 'airport') return airportFare(car.city, car.sla_verified);
    return calculateCarFare(car, distanceKm, car.service);
  }, [car, distanceKm]);

  const surge = useMemo(() => {
    if (car.service === 'subscription') return 1;
    return surgeMultiplier(currentPricingContext());
  }, [car.service]);

  const surgedFare = Math.round(baseFare * surge);
  const insuranceAmount = store.insurance ? Math.round(surgedFare * 0.03) : 0;
  const subtotal = surgedFare + insuranceAmount;
  const taxes = Math.round(subtotal * TAX_RATE);
  const total = subtotal + taxes;

  useEffect(() => {
    checkout.setItems([
      { type: 'car', label: `${car.model} (${car.service})`, amount: surgedFare },
      ...(insuranceAmount > 0 ? [{ type: 'car' as const, label: 'Insurance add-on', amount: insuranceAmount }] : []),
    ]);
    checkout.setInsurance(store.insurance);
  }, [surgedFare, insuranceAmount, store.insurance]);

  function book() {
    if (!store.pickupAddress || !store.dropoffAddress) return;
    if (onRequireAuth) { onRequireAuth('book a car', () => doBook()); return; }
    doBook();
  }

  function doBook() {
    const t = buildTicket({
      type: 'car',
      operator: car.operator,
      route: `${store.pickupCity} · ${store.pickupAddress} → ${store.dropoffAddress}`,
      date: store.date,
      departure: formatTime12(store.time),
      seats: `${car.seats} seats`,
      amount: surgedFare,
      taxes,
      total,
      features: car.features,
    });
    setTicket(t);
    checkout.setPnr(t.pnr);
    recordBooking({ pnr: t.pnr, type: 'car', operator: car.operator, route: `${store.pickupCity} · ${store.pickupAddress} → ${store.dropoffAddress}`, date: store.date, departure: formatTime12(store.time), seats: `${car.seats} seats`, total, created_at: new Date().toISOString() });
    setConfirmed(true);
  }

  if (confirmed && ticket) {
    return (
      <div className="surface p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
        <h3 className="mt-2 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Car Booked!</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>PNR: <strong style={{ color: 'var(--text-primary)' }}>{ticket.pnr}</strong></p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{car.model} · {store.pickupAddress} → {store.dropoffAddress}</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Total: {formatINR(total)} (incl. surge {surge.toFixed(1)}x)</p>
        <div className="mt-4 space-y-2">
          <TicketActions ticket={ticket} />
          <button onClick={() => { checkout.reset(); go({ name: 'home' }); }} className="btn-ghost w-full text-xs">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface p-5 lg:sticky lg:top-20">
      <h3 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Book {car.model}</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{car.operator} · {car.service} · {car.type}</p>
      <div className="divider my-3" />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Pickup</span><span style={{ color: 'var(--text-primary)' }}>{store.pickupCity}</span></div>
        <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Date & Time</span><span style={{ color: 'var(--text-primary)' }}>{store.date} {formatTime12(store.time)}</span></div>
        <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Distance (est.)</span><span style={{ color: 'var(--text-primary)' }}>{distanceKm} km</span></div>
        {surge > 1 && <div className="flex justify-between text-amber-600"><span>Surge ({surge.toFixed(1)}x)</span><span>+{formatINR(surgedFare - baseFare)}</span></div>}
      </div>
      <div className="divider my-3" />
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Base fare</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(surgedFare)}</span></div>
        <label className="flex cursor-pointer items-center justify-between py-1">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><Shield className="h-3.5 w-3.5 text-emerald-600" /> Insurance add-on (3%)</span>
          <input type="checkbox" checked={store.insurance} onChange={(e) => store.set('insurance', e.target.checked)} className="h-4 w-4 accent-crimson-500" />
        </label>
        {insuranceAmount > 0 && <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Insurance</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(insuranceAmount)}</span></div>}
        <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Taxes (5%)</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(taxes)}</span></div>
        <div className="divider my-1.5" />
        <div className="flex justify-between font-semibold"><span style={{ color: 'var(--text-primary)' }}>Total</span><span className="font-display text-lg text-gradient-crimson">{formatINR(total)}</span></div>
      </div>

      {(!store.pickupAddress || !store.dropoffAddress) && <p className="mt-3 text-xs text-amber-600"><MapPin className="inline h-3 w-3" /> Enter pickup & drop-off addresses to continue</p>}
      <button onClick={book} disabled={!store.pickupAddress || !store.dropoffAddress} className="btn-primary mt-4 w-full text-xs disabled:opacity-40">
        <Check className="h-4 w-4" /> Confirm Booking <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
