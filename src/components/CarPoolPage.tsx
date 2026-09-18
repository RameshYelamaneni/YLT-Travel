import { useMemo, useState, useEffect } from 'react';
import { Users, Star, Clock, BadgeCheck, Check, MapPin, Filter, CheckCircle2 } from 'lucide-react';
import { mockCarPoolListings, MOCK_CITIES, type CarPoolListing, type CarRentalType } from '../data/mockCars';
import { formatINR, formatTime12 } from '../lib/format';
import { usePoolStore } from '../store/poolStore';
import { useCheckoutStore } from '../store/checkoutStore';
import { TAX_RATE, surgeMultiplier, currentPricingContext } from '../lib/business';
import { buildTicket, type TicketData } from '../lib/ticket';
import { recordBooking } from './MyBookingsPage';
import TicketActions from './TicketActions';
import type { View } from '../store/nav';

export default function CarPoolPage({ go, onRequireAuth }: { go: (v: View) => void; onRequireAuth?: (action: string, proceed?: () => void) => void }) {
  const store = usePoolStore();
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = mockCarPoolListings.filter((p) => {
      if (store.fromCity !== 'all' && p.from_city !== store.fromCity) return false;
      if (store.toCity !== 'all' && p.to_city !== store.toCity) return false;
      if (store.carType !== 'all' && p.car_type !== store.carType) return false;
      if (store.verifiedOnly && !p.sla_verified) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (store.sort) {
        case 'price-high': return b.price_per_seat - a.price_per_seat;
        case 'rating': return b.driver_rating - a.driver_rating;
        case 'duration': return a.duration_mins - b.duration_mins;
        case 'departure': return a.departure_time.localeCompare(b.departure_time);
        default: return a.price_per_seat - b.price_per_seat;
      }
    });
    return list;
  }, [store.fromCity, store.toCity, store.carType, store.verifiedOnly, store.sort]);

  return (
    <div>
      <div className="border-b bg-[var(--bg-raised)] backdrop-blur-xl" style={{ borderColor: 'var(--border)' }}>
        <div className="container-fluid py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Car Pool</h1>
              <span className="ml-2 chip bg-emerald-500/15 text-emerald-600 text-[10px]">Share rides · Save more</span>
            </div>
            <button onClick={() => setShowFilters((s) => !s)} className="btn-ghost text-xs lg:hidden"><Filter className="h-4 w-4" /> Filters</button>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Book a seat in a verified driver's car on popular intercity routes.</p>
        </div>
      </div>

      <div className="container-fluid mt-6 grid gap-4 lg:grid-cols-[240px_1fr_340px] xl:grid-cols-[260px_1fr_380px]">
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="surface p-5 lg:sticky lg:top-20">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}><Filter className="h-4 w-4 text-emerald-600" /> Filters</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label-text flex items-center gap-1"><MapPin className="h-3 w-3" /> From City</label>
                <select value={store.fromCity} onChange={(e) => store.set('fromCity', e.target.value)} className="input-field mt-1.5 text-sm">
                  <option value="all">All cities</option>
                  {MOCK_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text flex items-center gap-1"><MapPin className="h-3 w-3" /> To City</label>
                <select value={store.toCity} onChange={(e) => store.set('toCity', e.target.value)} className="input-field mt-1.5 text-sm">
                  <option value="all">All cities</option>
                  {MOCK_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Car Type</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(['all', 'Hatchback', 'Sedan', 'SUV'] as const).map((t) => (
                    <button key={t} onClick={() => store.set('carType', t)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${store.carType === t ? 'bg-emerald-600 text-white' : 'bg-[var(--bg-raised)] hover:bg-[var(--bg-surface)]'}`} style={store.carType === t ? undefined : { color: 'var(--text-secondary)' }}>{t === 'all' ? 'All' : t}</button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={store.verifiedOnly} onChange={(e) => store.set('verifiedOnly', e.target.checked)} className="h-4 w-4 accent-emerald-500" />
                <BadgeCheck className="h-4 w-4 text-emerald-600" /> SLA Verified only
              </label>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{filtered.length} pool rides found</p>
            <select value={store.sort} onChange={(e) => store.set('sort', e.target.value as any)} className="input-field appearance-none rounded-lg py-1.5 pl-3 pr-8 text-xs">
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top rated</option>
              <option value="duration">Shortest duration</option>
              <option value="departure">Departure time</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <div className="surface p-10 text-center"><Users className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} /><p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>No car pool rides match your filters.</p></div>
          ) : filtered.map((pool) => {
            const active = store.selectedPool?.id === pool.id;
            return (
              <button key={pool.id} onClick={() => store.set('selectedPool', pool)} className={`surface-raised flex w-full items-center gap-4 p-4 text-left transition-all ${active ? 'ring-2 ring-emerald-500' : 'hover:border-emerald-500/30'}`}>
                <img src={pool.image_url} alt={pool.car_model} className="h-20 w-28 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{pool.driver_name}</p>
                    {pool.sla_verified && <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600"><BadgeCheck className="h-3 w-3" /> Verified</span>}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{pool.car_model} · {pool.car_type}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> {pool.driver_rating}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {pool.from_city} → {pool.to_city}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime12(pool.departure_time)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-[var(--bg-raised)] px-2 py-0.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>{pool.available_seats} seats left</span>
                    {pool.features.map((f) => <span key={f} className="rounded-full bg-[var(--bg-raised)] px-2 py-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>{f}</span>)}
                  </div>
                </div>
                <div className="text-right"><p className="text-xs" style={{ color: 'var(--text-muted)' }}>per seat</p><p className="font-display text-lg font-bold text-emerald-600">{formatINR(pool.price_per_seat)}</p></div>
              </button>
            );
          })}
        </div>

        <aside>
          {store.selectedPool ? <PoolCheckout pool={store.selectedPool} go={go} onRequireAuth={onRequireAuth} /> : (
            <div className="surface p-8 text-center"><Users className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} /><p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Select a car pool listing to book a seat.</p></div>
          )}
        </aside>
      </div>
    </div>
  );
}

function PoolCheckout({ pool, go, onRequireAuth }: { pool: CarPoolListing; go: (v: View) => void; onRequireAuth?: (action: string, proceed?: () => void) => void }) {
  const store = usePoolStore();
  const checkout = useCheckoutStore();
  const [confirmed, setConfirmed] = useState(false);
  const [ticket, setTicket] = useState<TicketData | null>(null);

  const surge = useMemo(() => surgeMultiplier(currentPricingContext()), []);
  const baseTotal = pool.price_per_seat * store.seats;
  const surgedTotal = Math.round(baseTotal * surge);
  const taxes = Math.round(surgedTotal * TAX_RATE);
  const total = surgedTotal + taxes;

  useEffect(() => {
    checkout.setItems([{ type: 'carpool', label: `${store.seats} seat(s) · ${pool.driver_name}`, amount: surgedTotal }]);
  }, [surgedTotal, store.seats]);

  function book() {
    if (onRequireAuth) { onRequireAuth('book a car pool seat', () => doBook()); return; }
    doBook();
  }

  function doBook() {
    const t = buildTicket({
      type: 'carpool',
      operator: pool.driver_name,
      route: `${pool.from_city} → ${pool.to_city}`,
      date: new Date().toISOString().slice(0, 10),
      departure: formatTime12(pool.departure_time),
      seats: `${store.seats} seat(s)`,
      amount: surgedTotal,
      taxes,
      total,
      features: pool.features,
    });
    setTicket(t);
    checkout.setPnr(t.pnr);
    recordBooking({ pnr: t.pnr, type: 'carpool', operator: pool.driver_name, route: `${pool.from_city} → ${pool.to_city}`, date: new Date().toISOString().slice(0, 10), departure: formatTime12(pool.departure_time), seats: `${store.seats} seat(s)`, total, created_at: new Date().toISOString() });
    setConfirmed(true);
  }

  if (confirmed && ticket) {
    return (
      <div className="surface p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
        <h3 className="mt-2 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Seat Booked!</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>PNR: <strong style={{ color: 'var(--text-primary)' }}>{ticket.pnr}</strong></p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{pool.driver_name} · {pool.from_city} → {pool.to_city}</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Total: {formatINR(total)} {surge > 1 && `(surge ${surge.toFixed(1)}x)`}</p>
        <div className="mt-4 space-y-2">
          <TicketActions ticket={ticket} />
          <button onClick={() => { checkout.reset(); go({ name: 'home' }); }} className="btn-ghost w-full text-xs">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface p-5 lg:sticky lg:top-20">
      <h3 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Book Car Pool Seat</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{pool.driver_name} · {pool.from_city} → {pool.to_city}</p>
      <div className="divider my-3" />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Departure</span><span style={{ color: 'var(--text-primary)' }}>{formatTime12(pool.departure_time)}</span></div>
        <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Duration</span><span style={{ color: 'var(--text-primary)' }}>{Math.floor(pool.duration_mins / 60)}h {pool.duration_mins % 60}m</span></div>
        <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Available seats</span><span style={{ color: 'var(--text-primary)' }}>{pool.available_seats}</span></div>
      </div>
      <div className="mt-4">
        <label className="label-text">Number of seats</label>
        <div className="mt-1.5 flex items-center gap-2">
          <button onClick={() => store.set('seats', Math.max(1, store.seats - 1))} className="grid h-9 w-9 place-items-center rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>−</button>
          <span className="w-10 text-center font-semibold" style={{ color: 'var(--text-primary)' }}>{store.seats}</span>
          <button onClick={() => store.set('seats', Math.min(pool.available_seats, store.seats + 1))} className="grid h-9 w-9 place-items-center rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>+</button>
        </div>
      </div>
      {surge > 1 && <p className="mt-3 text-xs text-amber-600">Surge pricing active ({surge.toFixed(1)}x)</p>}
      <div className="divider my-3" />
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>{store.seats} × {formatINR(pool.price_per_seat)}</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(surgedTotal)}</span></div>
        <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Taxes (5%)</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(taxes)}</span></div>
        <div className="flex justify-between font-semibold"><span style={{ color: 'var(--text-primary)' }}>Total</span><span className="font-display text-lg text-gradient-crimson">{formatINR(total)}</span></div>
      </div>
      <button onClick={book} className="btn-primary mt-4 w-full text-xs"><Check className="h-4 w-4" /> Confirm {store.seats} Seat{store.seats > 1 ? 's' : ''}</button>
    </div>
  );
}
