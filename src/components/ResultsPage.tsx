import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Star, ArrowRight, MapPin,
  ArrowLeft, SlidersHorizontal, Users, GitCompare,
  Clock, X, Sparkles, ChevronDown, UserRound, Navigation, Package, TimerReset, Hotel, Timer,
} from 'lucide-react';
import type { Bus, Seat } from '../types';
import type { View } from '../store/nav';
import { generateSeats, generateBuses, inSlot, TIME_SLOTS, catalogCrewFor, restStopsFor, seededRand } from '../data/buses';
import { formatINR, formatDateLong, formatTime12, formatDuration } from '../lib/format';
import { type LastMileCar } from '../data/mockCars';
import SearchWidget from './SearchWidget';
import LastMileUpsell from './LastMileUpsell';
import AddressInputModal from './AddressInputModal';
import { SeatDeckPanel, BusRouteSidebar } from './BusSeatStudio';
import { useCheckoutStore } from '../store/checkoutStore';
import { useLastMileStore } from '../store/lastMileStore';
import { TAX_RATE } from '../lib/business';
import { recordBooking } from './MyBookingsPage';
import { useAuth } from '../lib/auth';
import { qrSvgDataUrl, type TicketData } from '../lib/ticket';
import { payWithRazorpay } from '../lib/razorpay';
import TicketActions, { emailTicket } from './TicketActions';
import { apiFetch } from '../lib/api';
import { busCatalogIdentity, mergeLiveWithCatalog } from '../lib/publicCatalog';
import { useAccountPrefs } from '../store/accountPrefs';
import BusResultChips from './BusResultChips';
import BusDetailsSheet, { type BusDetailsTab } from './BusDetailsSheet';
import { YLT_TRUST_CHIPS } from '../lib/busInsights';
import { tripBundlesFor, type TripBundle } from '../data/tripBundles';
import { clearFareHold, formatHoldClock, getFareHold, remainingHoldMs, setFareHoldAmount, startFareHold } from '../lib/fareLock';
import { quoteSaver, quoteSeats, useSaverSettings } from '../lib/yltSaver';
import { resolveCheckoutCode } from '../lib/attraction';
import PricePromiseForm from './PricePromiseForm';

interface Props {
  from: string;
  to: string;
  date: string;
  returnDate?: string;
  go: (v: View) => void;
  onRequireAuth?: (action: string, proceed?: () => void) => void;
}

type SortKey = 'departure' | 'price' | 'rating' | 'duration' | 'smart';
type QuickFilter = 'high-rated' | 'live' | 'volvo' | 'ac' | 'sleeper' | 'women' | 'refund' | 'under-1k' | 'on-time' | 'meals' | 'accessible' | 'guarantee' | 'night' | 'prime';

function shiftDate(date: string, days: number) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toggleSet(set: Set<string>, value: string) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

function mapPublicBus(row: any): Bus {
  const seats: Seat[] | undefined = Array.isArray(row?.seats) ? row.seats.map((s: any) => ({
    id: String(s.id || s.seatId || s.seat_number || s.label || ''),
    label: String(s.label || s.seat_number || s.seatNumber || ''),
    type: (s.type || (String(s.deck || '').includes('upper') ? 'sleeper-upper' : 'seater')) as Seat['type'],
    price: Number(s.price ?? s.fare ?? row.price ?? 0),
    is_booked: Boolean(s.is_booked || s.status === 'booked' || s.status === 'sold'),
    deck: s.deck === 'upper' ? 'upper' : 'lower',
    is_ladies: Boolean(s.is_ladies),
    is_window: Boolean(s.is_window),
    is_single: Boolean(s.is_single),
  })).filter((s: Seat) => s.id) : undefined;
  const boarding = Array.isArray(row?.boarding_points) ? row.boarding_points.map((p: any) => ({ name: String(p.name || p), time: String(p.time || '') })) : [];
  const dropping = Array.isArray(row?.dropping_points) ? row.dropping_points.map((p: any) => ({ name: String(p.name || p), time: String(p.time || '') })) : [];
  const restStops = Array.isArray(row?.rest_stops) ? row.rest_stops.map((p: any) => ({
    name: String(p.name || p),
    time: String(p.time || ''),
    halt_mins: p.halt_mins != null ? Number(p.halt_mins) : undefined,
    note: p.note ? String(p.note) : undefined,
  })) : undefined;
  const mapped: Bus = {
    id: String(row?.id || row?.schedule_id || ''),
    fleet_bus_id: String(row?.fleet_bus_id || row?.bus_id || ''),
    schedule_id: String(row?.schedule_id || row?.id || ''),
    operator: String(row?.operator || 'YLT Travels'),
    bus_type: String(row?.bus_type || row?.layout || 'YLT Coach'),
    service_number: String(row?.service_number || ''),
    departure_time: String(row?.departure_time || ''),
    arrival_time: String(row?.arrival_time || ''),
    duration_mins: Number(row?.duration_mins || 0),
    price: Number(row?.price || 0),
    original_price: Number(row?.original_price || row?.price || 0),
    rating: Number(row?.rating || 0),
    reviews: Number(row?.reviews || 0),
    is_ac: Boolean(row?.is_ac),
    is_sleeper: Boolean(row?.is_sleeper),
    is_volvo: Boolean(row?.is_volvo),
    live_tracking: Boolean(row?.live_tracking),
    sla_verified: Boolean(row?.sla_verified),
    women_safety: Boolean(row?.women_safety),
    amenities: Array.isArray(row?.amenities) ? row.amenities.map(String) : [],
    from: String(row?.from || row?.from_city || ''),
    to: String(row?.to || row?.to_city || ''),
    date: String(row?.date || row?.departure_date || ''),
    via: Array.isArray(row?.via) ? row.via.map(String) : [],
    seats_total: Number(row?.seats_total || 0),
    seats_available: Number(row?.seats_available || 0),
    single_seats: Number(row?.single_seats || 0),
    ladies_seats: Number(row?.ladies_seats || 0),
    window_seats: Number(row?.window_seats || 0),
    boarding_points: boarding,
    dropping_points: dropping,
    rest_stops: restStops && restStops.length ? restStops : undefined,
    cancellation: (row?.cancellation === 'free-until-6h' || row?.cancellation === 'non-refundable' ? row.cancellation : 'partial') as Bus['cancellation'],
    rest_stop_rating: Number(row?.rest_stop_rating || 0),
    delay_mins: Number(row?.delay_mins || 0),
    co2_kg: Number(row?.co2_kg || 0),
    hotel_bundle_saving: Number(row?.hotel_bundle_saving || 0),
    punctuality: Number(row?.punctuality || 0),
    meals: Boolean(row?.meals),
    accessible: Boolean(row?.accessible),
    night_crew: Boolean(row?.night_crew),
    delay_guarantee: Boolean(row?.delay_guarantee),
    prime: Boolean(row?.prime),
    insurance_available: Boolean(row?.insurance_available),
    smart_score: Number(row?.smart_score || 0),
    seats,
    photo_url: String(row?.photo_url || ''),
    listing_source: row?.listing_source === 'catalog' ? 'catalog' : (row?.listing_source === 'partner' ? 'partner' : (String(row?.operator || '').startsWith('YLT') ? 'catalog' : 'partner')),
    driverName: String(row?.driverName || row?.driver_name || '') || undefined,
    driverPhoto: String(row?.driverPhoto || row?.driver_photo || '') || undefined,
    experienceYears: Number(row?.experienceYears || row?.experience_years || 0) || undefined,
    conductorName: String(row?.conductorName || row?.conductor_name || '') || undefined,
  };
  const crew = catalogCrewFor(mapped.operator);
  if (!mapped.driverName && (mapped.listing_source === 'catalog' || mapped.operator.startsWith('YLT'))) {
    mapped.driverName = crew.driverName;
    mapped.driverPhoto = crew.driverPhoto;
    mapped.experienceYears = crew.experienceYears;
    mapped.conductorName = crew.conductorName;
  }
  if (!mapped.rest_stops?.length && mapped.from && mapped.to && mapped.departure_time) {
    const rand = seededRand(mapped.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    mapped.rest_stops = restStopsFor(mapped.from, mapped.to, mapped.departure_time, mapped.duration_mins || 360, mapped.via, rand);
  }
  return mapped;
}

export default function ResultsPage({ from, to, date, returnDate, go, onRequireAuth }: Props) {
  const [leg, setLeg] = useState<'onward' | 'return'>('onward');
  const [sort, setSort] = useState<SortKey>('smart');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [alertOn, setAlertOn] = useState(false);
  const bookingForWomen = useAccountPrefs((s) => s.bookingForWomen);

  const [quick, setQuick] = useState<Set<QuickFilter>>(() => bookingForWomen ? new Set(['women']) : new Set());
  const [depSlots, setDepSlots] = useState<Set<string>>(new Set());
  const [arrSlots, setArrSlots] = useState<Set<string>>(new Set());
  const [boarding, setBoarding] = useState<Set<string>>(new Set());
  const [dropping, setDropping] = useState<Set<string>>(new Set());
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [ladyQuota, setLadyQuota] = useState(bookingForWomen);
  const [windowOnly, setWindowOnly] = useState(false);
  const [priceCap, setPriceCap] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const saverRupees = useSaverSettings().rupees;
  const shownFare = (price: number) => quoteSaver(price, saverRupees).price;

  useEffect(() => {
    setQuick((prev) => {
      const next = new Set(prev);
      if (bookingForWomen) next.add('women');
      else next.delete('women');
      return next;
    });
    setLadyQuota(bookingForWomen);
  }, [bookingForWomen]);

  const activeFrom = leg === 'return' && returnDate ? to : from;
  const activeTo = leg === 'return' && returnDate ? from : to;
  const activeDate = leg === 'return' && returnDate ? returnDate : date;

  const [buses, setBuses] = useState<Bus[]>([]);
  const [loadingBuses, setLoadingBuses] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoadingBuses(true);
    apiFetch(`/api/buses?from=${encodeURIComponent(activeFrom)}&to=${encodeURIComponent(activeTo)}&date=${encodeURIComponent(activeDate)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const rows = Array.isArray(data) ? data : (Array.isArray(data?.buses) ? data.buses : []);
        const live = rows.map(mapPublicBus).filter((b: Bus) => b.id);
        const catalog = generateBuses(activeFrom, activeTo, activeDate);
        setBuses(mergeLiveWithCatalog(live, catalog, busCatalogIdentity));
      })
      .catch(() => {
        if (!alive) return;
        setBuses(mergeLiveWithCatalog([], generateBuses(activeFrom, activeTo, activeDate), busCatalogIdentity));
      })
      .finally(() => { if (alive) setLoadingBuses(false); });
    return () => { alive = false; };
  }, [activeFrom, activeTo, activeDate]);

  const boardingOptions = useMemo(() => [...new Set(buses.flatMap((b) => b.boarding_points.map((p) => p.name)))].sort(), [buses]);
  const droppingOptions = useMemo(() => [...new Set(buses.flatMap((b) => b.dropping_points.map((p) => p.name)))].sort(), [buses]);
  const priceBounds = useMemo(() => {
    const ps = buses.map((b) => shownFare(b.price)).filter((n) => Number.isFinite(n));
    if (!ps.length) return { min: 0, max: 0 };
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }, [buses, saverRupees]);
  const activePriceCap = priceCap ?? priceBounds.max;

  const filtered = useMemo(() => {
    let list = buses.filter((b) => {
      if (quick.has('high-rated') && b.rating < 4.5) return false;
      if (quick.has('live') && !b.live_tracking) return false;
      if (quick.has('volvo') && !b.is_volvo) return false;
      if (quick.has('ac') && !b.is_ac) return false;
      if (quick.has('sleeper') && !b.is_sleeper) return false;
      if (quick.has('women') && !b.women_safety) return false;
      if (quick.has('refund') && b.cancellation !== 'free-until-6h') return false;
      if (quick.has('under-1k') && shownFare(b.price) > 1000) return false;
      if (quick.has('on-time') && b.delay_mins > 0) return false;
      if (quick.has('meals') && !b.meals) return false;
      if (quick.has('accessible') && !b.accessible) return false;
      if (quick.has('guarantee') && !b.delay_guarantee) return false;
      if (quick.has('night') && !b.night_crew) return false;
      if (quick.has('prime') && !b.prime) return false;
      if (depSlots.size && ![...depSlots].some((id) => {
        const slot = TIME_SLOTS.find((s) => s.id === id)!;
        return inSlot(b.departure_time, slot.start, slot.end);
      })) return false;
      if (arrSlots.size && ![...arrSlots].some((id) => {
        const slot = TIME_SLOTS.find((s) => s.id === id)!;
        return inSlot(b.arrival_time, slot.start, slot.end);
      })) return false;
      if (boarding.size && !b.boarding_points.some((p) => boarding.has(p.name))) return false;
      if (dropping.size && !b.dropping_points.some((p) => dropping.has(p.name))) return false;
      if (features.has('wifi') && !b.amenities.includes('WiFi')) return false;
      if (features.has('toilet') && !b.amenities.includes('Toilet')) return false;
      if (features.has('sla') && !b.sla_verified) return false;
      if (ladyQuota && b.ladies_seats < 1) return false;
      if (windowOnly && b.window_seats < 1) return false;
      if (shownFare(b.price) > activePriceCap) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'price') return shownFare(a.price) - shownFare(b.price);
      if (sort === 'duration') return a.duration_mins - b.duration_mins;
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'smart') return b.smart_score - a.smart_score;
      return a.departure_time.localeCompare(b.departure_time);
    });
    return list;
  }, [buses, quick, depSlots, arrSlots, boarding, dropping, features, ladyQuota, windowOnly, sort, activePriceCap, saverRupees]);

  const cheapest = useMemo(() => buses.reduce<Bus | null>((a, b) => (!a || a.price < b.price ? a || b : b), null), [buses]);
  const fastest = useMemo(() => buses.reduce<Bus | null>((a, b) => (!a || a.duration_mins < b.duration_mins ? a || b : b), null), [buses]);
  const topRated = useMemo(() => buses.reduce<Bus | null>((a, b) => (!a || a.rating > b.rating ? a || b : b), null), [buses]);
  const bestValue = useMemo(() => buses.reduce<Bus | null>((a, b) => (!a || (a.rating / Math.max(1, a.price)) > (b.rating / Math.max(1, b.price)) ? a || b : b), null), [buses]);

  const calendar = useMemo(() => {
    return [-1, 0, 1, 2, 3].map((offset) => {
      const d = shiftDate(date, offset);
      if (d < new Date().toISOString().slice(0, 10)) return null;
      const isActive = d === activeDate;
      return { date: d, count: isActive ? buses.length : 0, min: isActive && buses.length ? Math.min(...buses.map((b) => shownFare(b.price))) : 0 };
    }).filter(Boolean) as { date: string; count: number; min: number }[];
  }, [from, to, date, activeDate, buses, saverRupees]);

  const slotCounts = (which: 'dep' | 'arr') => TIME_SLOTS.map((slot) => ({
    ...slot,
    count: buses.filter((b) => inSlot(which === 'dep' ? b.departure_time : b.arrival_time, slot.start, slot.end)).length,
  }));

  function toggleQuick(id: QuickFilter) {
    setQuick((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const compareBuses = compareIds.map((id) => buses.find((b) => b.id === id)).filter(Boolean) as Bus[];
  const activeFilters = quick.size + depSlots.size + arrSlots.size + boarding.size + dropping.size + features.size + (ladyQuota ? 1 : 0) + (windowOnly ? 1 : 0) + (priceCap !== null ? 1 : 0);

  function clearFilters() {
    setQuick(new Set());
    setDepSlots(new Set());
    setArrSlots(new Set());
    setBoarding(new Set());
    setDropping(new Set());
    setFeatures(new Set());
    setLadyQuota(false);
    setWindowOnly(false);
    setPriceCap(null);
  }

  const filters = (
    <aside className="rounded-2xl border bg-[var(--bg-surface)] p-4" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Filters</p>
        {activeFilters > 0 && (
          <button onClick={clearFilters} className="text-xs text-crimson-600">Clear all</button>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {TIME_SLOTS.map((slot) => {
          const count = buses.filter((b) => inSlot(b.departure_time, slot.start, slot.end)).length;
          const on = depSlots.has(slot.id);
          return (
            <button key={slot.id} onClick={() => setDepSlots((s) => toggleSet(s, slot.id))} className={`rounded-full border px-3 py-2 text-left text-xs font-medium ${on ? 'border-crimson-500 bg-crimson-600/10 text-crimson-600' : ''}`} style={!on ? { borderColor: 'var(--border)', color: 'var(--text-secondary)' } : undefined}>
              {slot.label} ({count})
            </button>
          );
        })}
        {([
          ['high-rated', `High rated (${buses.filter((b) => b.rating >= 4.5).length})`],
          ['live', `Live tracking (${buses.filter((b) => b.live_tracking).length})`],
          ['volvo', `Volvo (${buses.filter((b) => b.is_volvo).length})`],
          ['women', `Women-safe (${buses.filter((b) => b.women_safety).length})`],
          ['guarantee', `Delay guarantee (${buses.filter((b) => b.delay_guarantee).length})`],
          ['meals', `Meals included (${buses.filter((b) => b.meals).length})`],
          ['accessible', `Wheelchair access (${buses.filter((b) => b.accessible).length})`],
          ['prime', `YLT Prime boarding (${buses.filter((b) => b.prime).length})`],
        ] as [QuickFilter, string][]).map(([id, label]) => (
          <button key={id} onClick={() => toggleQuick(id)} className={`rounded-full border px-3 py-2 text-left text-xs font-medium ${quick.has(id) ? 'border-crimson-500 bg-crimson-600/10 text-crimson-600' : ''}`} style={!quick.has(id) ? { borderColor: 'var(--border)', color: 'var(--text-secondary)' } : undefined}>
            {label}
          </button>
        ))}
      </div>

      <FilterGroup title="Price range">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Up to {formatINR(activePriceCap)}</p>
        <input
          type="range"
          min={priceBounds.min}
          max={priceBounds.max}
          value={activePriceCap}
          onChange={(e) => setPriceCap(Number(e.target.value))}
          className="mt-1 w-full accent-crimson-600"
        />
        <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span>{formatINR(priceBounds.min)}</span>
          <span>{formatINR(priceBounds.max)}</span>
        </div>
      </FilterGroup>
      <FilterGroup title="Departure time from source">
        {slotCounts('dep').map((slot) => (
          <label key={slot.id} className="flex items-center justify-between gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-2">
              <input type="checkbox" checked={depSlots.has(slot.id)} onChange={() => setDepSlots((s) => toggleSet(s, slot.id))} />
              {slot.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{slot.count}</span>
          </label>
        ))}
      </FilterGroup>
      <FilterGroup title="Arrival time at destination">
        {slotCounts('arr').map((slot) => (
          <label key={slot.id} className="flex items-center justify-between gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-2">
              <input type="checkbox" checked={arrSlots.has(slot.id)} onChange={() => setArrSlots((s) => toggleSet(s, slot.id))} />
              {slot.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{slot.count}</span>
          </label>
        ))}
      </FilterGroup>
      <FilterGroup title="Bus type">
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={quick.has('ac')} onChange={() => toggleQuick('ac')} /> AC
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={quick.has('sleeper')} onChange={() => toggleQuick('sleeper')} /> Sleeper
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={quick.has('volvo')} onChange={() => toggleQuick('volvo')} /> Volvo / multi-axle
        </label>
      </FilterGroup>
      <FilterGroup title="Single window seater / sleeper">
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={windowOnly} onChange={() => setWindowOnly((v) => !v)} /> Window / single berth only
        </label>
      </FilterGroup>
      <FilterGroup title="Bus features">
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={features.has('sla')} onChange={() => setFeatures((s) => toggleSet(s, 'sla'))} /> SLA verified
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={features.has('wifi')} onChange={() => setFeatures((s) => toggleSet(s, 'wifi'))} /> WiFi
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={features.has('toilet')} onChange={() => setFeatures((s) => toggleSet(s, 'toilet'))} /> Toilet
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={quick.has('night')} onChange={() => toggleQuick('night')} /> Night crew verified
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={quick.has('refund')} onChange={() => toggleQuick('refund')} /> Free cancellation
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={quick.has('under-1k')} onChange={() => toggleQuick('under-1k')} /> Under ₹1,000
        </label>
      </FilterGroup>
      <FilterGroup title="Boarding points">
        {boardingOptions.map((name) => (
          <label key={name} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={boarding.has(name)} onChange={() => setBoarding((s) => toggleSet(s, name))} /> {name}
          </label>
        ))}
      </FilterGroup>
      <FilterGroup title="Dropping points">
        {droppingOptions.map((name) => (
          <label key={name} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={dropping.has(name)} onChange={() => setDropping((s) => toggleSet(s, name))} /> {name}
          </label>
        ))}
      </FilterGroup>
    </aside>
  );

  return (
    <div className={`max-w-full overflow-x-hidden ${compareBuses.length ? 'pb-28' : ''}`}>
      <div className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="container-fluid py-2.5">
          <button onClick={() => go({ name: 'home' })} className="mb-2 flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft className="h-4 w-4" /> {activeFrom} → {activeTo}
          </button>
          <SearchWidget key={`${from}-${to}-${date}-${returnDate ?? ''}`} compact initialFrom={from} initialTo={to} initialDate={date} initialReturnDate={returnDate} />
        </div>
      </div>

      <div className="container-fluid mt-3">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {calendar.map((c) => (
            <button
              key={c.date}
              onClick={() => go({ name: 'results', from, to, date: c.date, returnDate })}
              className={`min-w-[96px] shrink-0 rounded-xl border px-2.5 py-1.5 text-left ${c.date === date ? 'border-crimson-500 bg-crimson-600/10' : ''}`}
              style={c.date !== date ? { borderColor: 'var(--border)' } : undefined}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{formatDateLong(c.date)}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.count} buses · from {formatINR(c.min)}</p>
            </button>
          ))}
        </div>

        {returnDate && (
          <div className="mb-4 flex rounded-xl p-1" style={{ backgroundColor: 'var(--bg-raised)' }}>
            <button onClick={() => { setLeg('onward'); setExpandedId(null); }} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${leg === 'onward' ? 'bg-[var(--bg-surface)] text-crimson-600' : ''}`} style={leg !== 'onward' ? { color: 'var(--text-secondary)' } : undefined}>
              Onward · {formatDateLong(date)}
            </button>
            <button onClick={() => { setLeg('return'); setExpandedId(null); }} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${leg === 'return' ? 'bg-[var(--bg-surface)] text-crimson-600' : ''}`} style={leg !== 'return' ? { color: 'var(--text-secondary)' } : undefined}>
              Return · {formatDateLong(returnDate)}
            </button>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          <div className="mb-4 lg:mb-0">
            <button onClick={() => setFiltersOpen((v) => !v)} className="btn-ghost mb-3 w-full lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filters {activeFilters > 0 ? `(${activeFilters})` : ''}
            </button>
            <div className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>{filters}</div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <button onClick={() => go({ name: 'home' })} className="mb-1 flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <ArrowLeft className="h-4 w-4" /> {activeFrom} → {activeTo}
                </button>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} buses</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Sort by:</span>
                {([['smart', 'YLT Smart'], ['rating', 'Ratings'], ['departure', 'Departure time'], ['price', 'Price'], ['duration', 'Duration']] as [SortKey, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setSort(key)} className={`font-medium ${sort === key ? 'text-crimson-600 underline decoration-2 underline-offset-4' : ''}`} style={sort !== key ? { color: 'var(--text-secondary)' } : undefined}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" aria-label="Why book with YLT">
              {YLT_TRUST_CHIPS.map((chip) => {
                const Icon = chip.id === 'driver' ? UserRound : chip.id === 'lastmile' ? Navigation : chip.id === 'packages' ? Package : TimerReset;
                return (
                  <span key={chip.id} title={chip.detail} className="ylt-result-chip ylt-result-chip--trust shrink-0">
                    <Icon className="h-3 w-3" /> {chip.label}
                  </span>
                );
              })}
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
            <div className="min-w-0 overflow-hidden px-3 py-2">
              <p className="mb-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Boarding points</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {boardingOptions.slice(0, 12).map((name) => {
                  const on = boarding.has(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setBoarding((s) => toggleSet(s, name))}
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${on ? 'border-crimson-500 bg-crimson-600/10 text-crimson-600' : ''}`}
                      style={!on ? { borderColor: 'var(--border)', color: 'var(--text-secondary)' } : undefined}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mx-3 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-raised)' }}>
              <label className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                <Users className="h-4 w-4 text-crimson-500" />
                I want Single lady quota seat
                <button
                  role="switch"
                  aria-checked={ladyQuota}
                  onClick={() => setLadyQuota((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition ${ladyQuota ? 'bg-crimson-600' : 'bg-[var(--bg-surface)]'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${ladyQuota ? 'left-5' : 'left-0.5'}`} />
                </button>
              </label>
              <button onClick={() => setAlertOn((v) => !v)} className="text-xs font-medium text-crimson-600">
                {alertOn ? 'Fare alert on — watching this route' : 'Set fare alert'}
              </button>
            </div>

            <div className="grid gap-2 px-3 sm:grid-cols-4">
              {cheapest && <SmartPick label="Cheapest" bus={cheapest} onOpen={() => setExpandedId(cheapest.id)} />}
              {fastest && <SmartPick label="Fastest" bus={fastest} onOpen={() => setExpandedId(fastest.id)} />}
              {topRated && <SmartPick label="Top rated" bus={topRated} onOpen={() => setExpandedId(topRated.id)} />}
              {bestValue && <SmartPick label="Best value" bus={bestValue} onOpen={() => setExpandedId(bestValue.id)} />}
            </div>

            <div className="space-y-2.5 p-3">
              {loadingBuses && (
                <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Loading trips…</p>
                </div>
              )}
              {!loadingBuses && buses.length === 0 && (
                <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No trips on this route</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Try another date or city pair.</p>
                </div>
              )}
              {!loadingBuses && buses.length > 0 && filtered.length === 0 && (
                <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No buses match these filters</p>
                  <button onClick={clearFilters} className="btn-ghost mt-3 text-sm">Reset filters</button>
                </div>
              )}
              {filtered.map((b) => (
                <BusCard
                  key={b.id}
                  bus={b}
                  expanded={expandedId === b.id}
                  compared={compareIds.includes(b.id)}
                  onToggle={() => setExpandedId((id) => (id === b.id ? null : b.id))}
                  onCompare={() => toggleCompare(b.id)}
                  go={go}
                  onRequireAuth={onRequireAuth}
                />
              ))}
            </div>
            </div>
          </div>
        </div>
      </div>

      {compareBuses.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="container-fluid flex flex-wrap items-center gap-4">
            <GitCompare className="h-4 w-4 text-crimson-500" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Compare {compareBuses.length}/3</p>
            {compareBuses.map((b) => (
              <span key={b.id} className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {b.operator} · {formatINR(b.price)}
                <button onClick={() => toggleCompare(b.id)} aria-label="Remove from compare"><X className="h-3 w-3" /></button>
              </span>
            ))}
            <div className="ml-auto overflow-x-auto text-xs" style={{ color: 'var(--text-secondary)' }}>
              {compareBuses.length >= 2 && (
                <span>
                  {compareBuses.map((b) => `${b.operator}: ${formatDuration(b.duration_mins)} · ${b.rating.toFixed(1)}★ · ${b.seats_available} seats`).join('  |  ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
      <button onClick={() => setOpen((v) => !v)} className="mb-2 flex w-full items-center justify-between text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{open ? '–' : '+'}</span>
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

function SmartPick({ label, bus, onOpen }: { label: string; bus: Bus; onOpen: () => void }) {
  const saver = quoteSaver(bus.price, useSaverSettings().rupees);
  return (
    <button onClick={onOpen} className="surface-raised px-2.5 py-1.5 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-crimson-600">{label}</p>
      <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{bus.operator}</p>
      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{formatTime12(bus.departure_time)} · {formatINR(saver.price)}</p>
    </button>
  );
}

function BusCard({ bus, expanded, compared, onToggle, onCompare, go, onRequireAuth }: {
  bus: Bus;
  expanded: boolean;
  compared: boolean;
  onToggle: () => void;
  onCompare: () => void;
  go: (v: View) => void;
  onRequireAuth?: (action: string, proceed?: () => void) => void;
}) {
  const via = bus.via.length ? `Via ${bus.via.join(', ')}` : `Starts from ${bus.from}`;
  const save = bus.original_price > bus.price ? bus.original_price - bus.price : 0;
  const saver = quoteSaver(bus.price, useSaverSettings().rupees);
  const [detailsTab, setDetailsTab] = useState<BusDetailsTab | null>(null);
  const [promiseOpen, setPromiseOpen] = useState(false);
  return (
    <div className="max-w-full overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
      {save > 0 && (
        <div className="px-3 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(212, 160, 23, 0.14)', color: '#d4a017' }}>
          Save {formatINR(save)} on this fare
        </div>
      )}
      <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 sm:w-[30%] sm:max-w-[16rem]">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-[15px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{bus.operator}</p>
            {bus.listing_source === 'catalog' && (
              <span className="shrink-0 rounded-full bg-slate-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Catalog</span>
            )}
            {bus.prime && <span className="chip chip-crimson shrink-0"><Sparkles className="h-3 w-3" /> Prime</span>}
          </div>
          <p className="truncate text-[12px] leading-tight" style={{ color: 'var(--text-secondary)' }}>{bus.bus_type}</p>
          <p className="truncate text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>{via}</p>
          {bus.delay_mins > 0 && (
            <p className="text-[11px] text-amber-600"><Clock className="inline h-3 w-3" /> +{bus.delay_mins}m delay</p>
          )}
          <div className="mt-1 inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            <Star className="h-3 w-3 fill-current" /> {bus.rating.toFixed(1)}
            <span className="font-medium text-white/80">({bus.reviews})</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-3">
          <div>
            <p className="font-display text-lg font-bold tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{bus.departure_time}</p>
            <p className="mt-0.5 max-w-[7rem] truncate text-[11px]" style={{ color: 'var(--text-secondary)' }}>{bus.from}</p>
          </div>
          <div className="flex w-[5.75rem] shrink-0 flex-col items-center">
            <span className="rounded-lg border px-1.5 py-0.5 text-[10px] font-medium leading-none" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              {formatDuration(bus.duration_mins)}
            </span>
            <div className="mt-1 h-px w-full" style={{ backgroundColor: 'var(--border)' }} />
            <p className="mt-0.5 text-[9px] leading-none" style={{ color: 'var(--text-muted)' }}>{bus.punctuality}% on-time</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-bold tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{bus.arrival_time}</p>
            <p className="mt-0.5 max-w-[7rem] truncate text-[11px] sm:ml-auto" style={{ color: 'var(--text-secondary)' }}>{bus.to}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:w-[9.75rem] sm:flex-col sm:items-end sm:justify-center">
          <div className="text-right">
            {saver.discount > 0 && (
              <p className="text-[10px] leading-tight">
                <span className="font-semibold text-crimson-600">{saver.label}</span>
              </p>
            )}
            {saver.discount > 0 && (
              <p className="text-[10px] leading-none">
                <span className="line-through" style={{ color: 'var(--text-muted)' }}>{formatINR(saver.listed)}</span>
              </p>
            )}
            {save > 0 && saver.discount === 0 && (
              <p className="text-[10px] leading-none">
                <span className="text-emerald-600">Save {formatINR(save)}</span>{' '}
                <span className="line-through" style={{ color: 'var(--text-muted)' }}>{formatINR(bus.original_price)}</span>
              </p>
            )}
            <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
              From <span className="font-display text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatINR(saver.price)}</span>
            </p>
            <button type="button" onClick={() => setPromiseOpen(true)} className="mt-1 text-[10px] font-semibold text-crimson-600">Found a lower fare?</button>
          </div>
          <div className="flex flex-col items-end">
            <button onClick={onToggle} className="rounded-md bg-crimson-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-crimson-500">{expanded ? 'Hide seats' : 'View seats'}</button>
            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>{bus.seats_available} seats left</p>
            <button onClick={onCompare} className={`text-[11px] ${compared ? 'text-crimson-600' : ''}`} style={!compared ? { color: 'var(--text-muted)' } : undefined}>
              {compared ? 'Added to compare' : 'Compare'}
            </button>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 overflow-hidden border-t px-3 py-1.5" style={{ borderColor: 'var(--border)' }}>
        <div className="min-w-0 flex-1 overflow-hidden">
          <BusResultChips bus={bus} onOpen={(tab) => setDetailsTab(tab)} />
        </div>
        <button
          type="button"
          onClick={() => setDetailsTab((t) => (t ? null : 'insights'))}
          className="shrink-0 whitespace-nowrap text-xs font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          Bus details <ChevronDown className={`ml-0.5 inline h-3.5 w-3.5 transition ${detailsTab ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {detailsTab && (
        <BusDetailsSheet
          bus={bus}
          tab={detailsTab}
          onTab={setDetailsTab}
          onClose={() => setDetailsTab(null)}
        />
      )}
      {expanded && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 lg:p-6">
          <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" aria-hidden />
          <div className="relative flex h-[92dvh] max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-[var(--bg-page)] shadow-2xl animate-scale-in sm:h-[min(92dvh,56rem)] sm:rounded-3xl">
            <div className="flex shrink-0 items-center justify-between border-b bg-[var(--bg-surface)] px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-navy-700">Select seats</p>
                <p className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>{bus.operator} · {bus.from} → {bus.to}</p>
              </div>
              <button onClick={onToggle} className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--border)' }}>Close</button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <SeatMap bus={bus} go={go} onRequireAuth={onRequireAuth} />
            </div>
          </div>
        </div>,
        document.body,
      )}
      <PricePromiseForm
        open={promiseOpen}
        onClose={() => setPromiseOpen(false)}
        route={`${bus.from} → ${bus.to}`}
        date={bus.date}
        ourFare={saver.price}
      />
    </div>
  );
}

function SeatMap({ bus, go, onRequireAuth }: { bus: Bus; go: (v: View) => void; onRequireAuth?: (action: string, proceed?: () => void) => void }) {
  const seats = useMemo(() => (Array.isArray(bus.seats) && bus.seats.length ? bus.seats : generateSeats(bus)), [bus]);
  const checkout = useCheckoutStore();
  const lastMile = useLastMileStore();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [board, setBoard] = useState('');
  const [drop, setDrop] = useState('');
  const [addressOpen, setAddressOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [booking, setBooking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [holdMs, setHoldMs] = useState(0);
  const [bundle, setBundle] = useState<TripBundle | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponOff, setCouponOff] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [codeNote, setCodeNote] = useState<string | null>(null);
  const [promiseOpen, setPromiseOpen] = useState(false);
  const saverCfg = useSaverSettings();
  const stayOffers = useMemo(() => tripBundlesFor(bus), [bus]);

  const MAX = 4;
  const selectedSeats = selected.map((id) => seats.find((s) => s.id === id)!).filter(Boolean);
  const seatQuote = quoteSeats(selectedSeats.map((s) => s.price), saverCfg.rupees);
  const seatPayable = Math.max(0, seatQuote.price - couponOff);

  const carFare = lastMile.fare;
  const bundleFare = bundle ? bundle.price : 0;
  const subtotal = seatPayable + carFare + bundleFare;
  const taxes = Math.round(subtotal * TAX_RATE);
  const grand = subtotal + taxes;
  const needsAddress = !!lastMile.selectedCar && !lastMile.address;
  const pointsReady = !!board && !!drop;
  const canCheckout = selectedSeats.length > 0 && pointsReady;

  useEffect(() => {
    const items: { type: 'bus' | 'lastmile' | 'hotel' | 'package'; label: string; amount: number }[] = [];
    if (seatPayable > 0) items.push({ type: 'bus', label: `${selectedSeats.length} seat(s) on ${bus.operator}`, amount: seatPayable });
    if (carFare > 0 && lastMile.selectedCar) items.push({ type: 'lastmile', label: `Last-mile (${lastMile.selectedCar.model})`, amount: carFare });
    if (bundle) items.push({ type: bundle.kind, label: bundle.title, amount: bundle.price });
    checkout.setItems(items as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatPayable, carFare, lastMile.selectedCar, bundle]);

  useEffect(() => {
    if (selected.length === 0) {
      clearFareHold();
      setHoldMs(0);
      return;
    }
    const existing = getFareHold();
    const same = existing && existing.busId === bus.id && existing.seats.join() === selected.join();
    const hold = same ? (setFareHoldAmount(seatPayable) ?? existing) : startFareHold(bus.id, selected, seatPayable);
    setHoldMs(remainingHoldMs(hold));
    const t = window.setInterval(() => {
      const left = remainingHoldMs(getFareHold());
      setHoldMs(left);
      if (left <= 0) {
        clearFareHold();
        setSelected([]);
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [bus.id, selected, seatPayable]);

  function toggle(seat: Seat) {
    if (seat.is_booked) return;
    if (couponOff > 0) setCodeNote(null);
    setCouponCode('');
    setCouponOff(0);
    setSelected((prev) => prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : prev.length < MAX ? [...prev, seat.id] : prev);
  }

  function selectLastMile(car: LastMileCar | null) {
    lastMile.setCar(car);
    if (car) {
      setAddressOpen(true);
      lastMile.setAddress(null);
      lastMile.setFare(0);
    } else {
      lastMile.setAddress(null);
      lastMile.setFare(0);
    }
  }

  function confirmAddress(pickup: string, dropoff: string, km: number, _fare: number) {
    if (lastMile.selectedCar) {
      const fare = lastMile.selectedCar.base_fare + lastMile.selectedCar.rate_per_km * Math.max(1, Math.round(km));
      lastMile.setAddress({ pickup_address: pickup, dropoff_address: dropoff, distance_km: km, estimated_mins: Math.round(km * 2.2) });
      lastMile.setFare(fare);
    }
    setAddressOpen(false);
  }

  async function applyCode() {
    const res = await resolveCheckoutCode(codeInput, user?.email || '', seatQuote.price);
    if (res.kind === 'coupon') {
      setReferralCode('');
      setCouponCode(res.code);
      setCouponOff(res.amount);
      setCodeNote(`${res.code} takes ${formatINR(res.amount)} off before you pay.`);
      return;
    }
    if (res.kind === 'referral') {
      setCouponCode('');
      setCouponOff(0);
      setReferralCode(res.code);
      setCodeNote(`Code noted. Your friend receives ${formatINR(res.credit)} YLT Saver credit after this paid trip.`);
      return;
    }
    setCodeNote(res.error);
  }

  function book() {
    if (!pointsReady || selectedSeats.length === 0) return;
    if (needsAddress) { setAddressOpen(true); return; }
    if (onRequireAuth) { onRequireAuth('book bus seats', () => doBook()); return; }
    doBook();
  }

  async function doBook() {
    const seatLabels = selectedSeats.map((s) => s.label);
    const contactEmail = user?.email ?? '';
    setBooking(true);
    setAuthError(null);

    let receipt: { paymentId: string; orderId?: string; signature?: string } | null = null;
    try {
      const paid = await payWithRazorpay({
        amount: grand,
        name: user?.name ?? 'YLT Guest',
        description: `${bus.operator} ${bus.from} → ${bus.to}`,
        email: contactEmail || undefined,
      });
      if (!paid.ok) {
        setBooking(false);
        setAuthError(paid.message);
        return;
      }
      receipt = paid;
    } catch {
      setBooking(false);
      setAuthError('Payment could not start. Check Admin → Payments.');
      return;
    }

    let pnr = `YLT${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          bus_id: bus.fleet_bus_id || bus.id,
          fleet_bus_id: bus.fleet_bus_id || '',
          schedule_id: bus.schedule_id || bus.id,
          bus_name: bus.bus_type,
          operator: bus.operator,
          from_city: bus.from,
          to_city: bus.to,
          travel_date: bus.date,
          departure_time: bus.departure_time,
          seats: seatLabels,
          passengers: [],
          contact_email: contactEmail,
          contact_phone: '',
          total_amount: grand,
          coupon_code: couponCode,
          referral_code: referralCode,
          user_identifier: user?.email ?? null,
          user_type: 'customer',
          boarding_point: board || lastMile.address?.pickup_address || null,
          dropping_point: drop || null,
          razorpay_payment_id: receipt.paymentId,
          razorpay_order_id: receipt.orderId || '',
          razorpay_signature: receipt.signature || '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.pnr) pnr = data.pnr;
    } catch {
      /* local PNR after successful payment */
    }

    checkout.setPnr(pnr);
    recordBooking({
      pnr,
      type: 'bus',
      operator: bus.operator,
      route: `${bus.from} → ${bus.to}`,
      date: bus.date,
      departure: bus.departure_time,
      seats: `${selectedSeats.length} seat(s)`,
      total: grand,
      created_at: new Date().toISOString(),
      punctuality: bus.punctuality,
    });
    clearFareHold();

    setBooking(false);
    setConfirmed(true);
    void emailTicket({
      pnr,
      type: 'bus',
      operator: bus.operator,
      route: `${bus.from} → ${bus.to}`,
      date: bus.date,
      departure: bus.departure_time,
      seats: selectedSeats.map((s) => s.label).join(', '),
      passengers: user?.name,
      amount: seatPayable,
      taxes,
      total: grand,
      contactEmail: user?.email,
      boardingPoint: board || lastMile.address?.pickup_address,
      busType: bus.bus_type,
      duration: formatDuration(bus.duration_mins),
      qrData: `YLT:${pnr}`,
    }, contactEmail);
  }

  if (confirmed) {
    const pnr = checkout.pnr ?? 'YLT000000';
    const ticket: TicketData = {
      pnr,
      type: 'bus',
      operator: bus.operator,
      route: `${bus.from} → ${bus.to}`,
      date: bus.date,
      departure: bus.departure_time,
      seats: selectedSeats.map((s) => s.label).join(', ') || `${selectedSeats.length} seat(s)`,
      passengers: user?.name,
      amount: seatPayable,
      taxes,
      total: grand,
      contactEmail: user?.email,
      boardingPoint: board || lastMile.address?.pickup_address,
      busType: bus.bus_type,
      duration: formatDuration(bus.duration_mins),
      qrData: `YLT:${pnr}`,
    };
    const qr = qrSvgDataUrl(ticket.qrData, 180);
    return (
      <div className="h-full overflow-y-auto border-t p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-crimson-600 to-rose-800 px-5 py-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Confirmed e-ticket</p>
                <h3 className="mt-1 font-display text-lg font-bold">Booking Confirmed</h3>
              </div>
              <div className="rounded-xl border-2 border-dashed border-white/50 bg-white px-3 py-2 text-center text-crimson-700">
                <div className="text-[9px] font-bold tracking-widest">PNR</div>
                <div className="font-mono text-lg font-extrabold tracking-wider">{pnr}</div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-[1fr_120px]">
            <div className="text-left">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Boarding</p>
                  <p className="font-display text-2xl font-extrabold text-crimson-600">{bus.departure_time}</p>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{bus.from}</p>
                </div>
                <div className="text-xs font-bold text-crimson-500">BUS</div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Duration</p>
                  <p className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatDuration(bus.duration_mins)}</p>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{bus.to}</p>
                </div>
              </div>
              <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{bus.operator} · {bus.bus_type}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Seats {ticket.seats} · {bus.date} · Paid {formatINR(grand)}</p>
              {lastMile.selectedCar && lastMile.address && <p className="mt-1 text-xs text-emerald-600">Last-mile: {lastMile.selectedCar.model} from {lastMile.address.pickup_address}</p>}
              {bundle && <p className="mt-1 text-xs text-crimson-600">Added {bundle.title} · {formatINR(bundle.price)}</p>}
              <div className="mt-3 rounded-xl border px-3 py-2 text-left" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-crimson-600">Live trip status</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>GPS tracking starts after boarding</p>
                <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {bus.punctuality}% on-time on this service · last 7 days delayed about {Math.max(4, 100 - bus.punctuality)}% of trips (catalog sample).
                </p>
              </div>
            </div>
            <div className="mx-auto text-center">
              {qr && <img src={qr} alt="Boarding QR" className="mx-auto h-28 w-28 rounded-lg border bg-white p-1" />}
              <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Scan at boarding</p>
            </div>
          </div>
          <div className="border-t px-5 pb-5 pt-2" style={{ borderColor: 'var(--border)' }}>
            <TicketActions ticket={ticket} />
            <button onClick={() => { checkout.reset(); lastMile.reset(); go({ name: 'home' }); }} className="btn-ghost mt-3 w-full text-xs">Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  const fareDock = (
    <div className="shrink-0 border-t bg-[var(--bg-surface)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3" style={{ borderColor: 'var(--border)' }}>
      {selectedSeats.length === 0 ? (
        <div className="py-2 text-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select seats to see fare and checkout</p>
          {bus.hotel_bundle_saving > 0 && <p className="mt-1 text-xs text-crimson-600">Hotel bundle saves {formatINR(bus.hotel_bundle_saving)} after you book.</p>}
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2">
            <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
              Listed fare held on this device for 10 minutes. Inventory can still sell if someone else pays first.
            </p>
            <span className="flex shrink-0 items-center gap-1 font-mono text-sm font-bold tabular-nums text-amber-800">
              <Timer className="h-3.5 w-3.5" /> {formatHoldClock(holdMs)}
            </span>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Fare Summary</h4>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
              <span>{selectedSeats.length} seat(s) listed</span>
              <span className={seatQuote.discount > 0 ? 'line-through' : ''} style={{ color: seatQuote.discount > 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>{formatINR(seatQuote.listed)}</span>
            </div>
            {seatQuote.discount > 0 && (
              <div className="flex justify-between text-crimson-600">
                <span>{seatQuote.label}</span>
                <span>-{formatINR(seatQuote.discount)}</span>
              </div>
            )}
            {couponOff > 0 && (
              <div className="flex justify-between text-crimson-600">
                <span>Saver credit {couponCode}</span>
                <span>-{formatINR(couponOff)}</span>
              </div>
            )}
            {bus.insurance_available && <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Trip protect (optional)</span><span style={{ color: 'var(--text-muted)' }}>₹29</span></div>}
            {lastMile.selectedCar && lastMile.address && <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Last-mile ({lastMile.selectedCar.model})</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(carFare)}</span></div>}
            {bundle && (
              <div className="flex justify-between gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="min-w-0 truncate">{bundle.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span style={{ color: 'var(--text-primary)' }}>{formatINR(bundle.price)}</span>
                  <button type="button" className="text-[11px] text-crimson-600" onClick={() => setBundle(null)}>Remove</button>
                </span>
              </div>
            )}
            <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Taxes (5%)</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(taxes)}</span></div>
            <div className="divider my-1" />
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total</p>
                <p className="font-display text-lg font-bold tabular-nums text-gradient-crimson">{formatINR(grand)}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{selectedSeats.length} seat(s){!pointsReady ? ' · pick boarding & dropping' : ''}</p>
              </div>
              {canCheckout && (
                <button
                  onClick={book}
                  disabled={needsAddress || booking}
                  className="btn-primary min-h-11 min-w-[9.5rem] shrink-0 px-5 text-xs disabled:opacity-40"
                >
                  {booking ? <>Paying…</> : needsAddress ? <><MapPin className="h-4 w-4" /> Address</> : <>Pay <ArrowRight className="h-4 w-4" /></>}
                </button>
              )}
            </div>
          </div>
          {stayOffers.length > 0 && (
            <div className="mt-3 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-crimson-600"><Hotel className="h-3.5 w-3.5" /> Add stay or package</p>
              <div className="mt-1.5 space-y-1.5">
                {stayOffers.map((offer) => {
                  const on = bundle?.id === offer.id;
                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => setBundle(on ? null : offer)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] ${on ? 'bg-crimson-50' : 'hover:bg-[var(--bg-raised)]'}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold" style={{ color: 'var(--text-primary)' }}>{offer.title}</span>
                        <span className="block truncate" style={{ color: 'var(--text-muted)' }}>{offer.detail}</span>
                      </span>
                      <span className="shrink-0 font-bold text-crimson-600">{on ? 'Added' : formatINR(offer.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {!pointsReady && (
            <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>Pay appears after boarding and dropping points are selected. Last-mile is optional.</p>
          )}
          {needsAddress && pointsReady && <p className="mt-2 text-xs text-amber-600"><MapPin className="inline h-3 w-3" /> Enter last-mile address, or skip the car to pay</p>}
          {authError && <p className="mt-2 text-xs text-red-500">{authError}</p>}
          <div className="mt-3 flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Refer code or saver credit"
              className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs uppercase"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-input)' }}
            />
            <button type="button" onClick={() => { void applyCode(); }} className="shrink-0 rounded-lg border px-2 text-[11px] font-semibold" style={{ borderColor: 'var(--border)' }}>Apply</button>
          </div>
          {codeNote && <p className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>{codeNote}</p>}
          <button type="button" onClick={() => setPromiseOpen(true)} className="mt-2 text-[11px] font-semibold text-crimson-600">Found a lower fare?</button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ borderColor: 'var(--border)' }}>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,24rem)] lg:grid-rows-1">
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          <SeatDeckPanel bus={bus} seats={seats} selected={selected} onToggle={toggle} />
        </div>
        <div
          className="flex min-h-[13.5rem] max-h-[46vh] min-w-0 flex-col border-t lg:h-full lg:max-h-none lg:min-h-0 lg:border-l lg:border-t-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-h-0 flex-1 overflow-hidden px-3 pt-3">
            <BusRouteSidebar
              bus={bus}
              board={board}
              drop={drop}
              onBoard={setBoard}
              onDrop={setDrop}
              lastMileDone={!!lastMile.selectedCar}
              lastMile={(
                <LastMileUpsell
                  embedded
                  selectedCar={lastMile.selectedCar}
                  confirmedAddress={lastMile.address}
                  onSelect={selectLastMile}
                  onRequireAddress={(car) => { lastMile.setCar(car); setAddressOpen(true); }}
                />
              )}
            />
          </div>
          {fareDock}
        </div>
      </div>

      {addressOpen && <AddressInputModal open={addressOpen} onClose={() => setAddressOpen(false)} car={lastMile.selectedCar} onConfirm={confirmAddress} />}
      <PricePromiseForm
        open={promiseOpen}
        onClose={() => setPromiseOpen(false)}
        route={`${bus.from} → ${bus.to}`}
        date={bus.date}
        ourFare={seatQuote.price || quoteSaver(bus.price, saverCfg.rupees).price}
      />
    </div>
  );
}
