import { useMemo, useState, useEffect } from 'react';
import {
  Star, ArrowRight, MapPin, CheckCircle2, Download, Wallet,
  ArrowLeft, SlidersHorizontal, Radio, Users, Leaf, Hotel, GitCompare,
  Clock, X, Moon, Utensils, Accessibility, BadgeCheck, ShieldAlert, Sparkles,
} from 'lucide-react';
import type { Bus, Seat } from '../types';
import type { View } from '../store/nav';
import { generateBuses, generateSeats, inSlot, TIME_SLOTS } from '../data/buses';
import { formatINR, formatDateLong, formatTime12, formatDuration } from '../lib/format';
import { type LastMileCar } from '../data/mockCars';
import SearchWidget from './SearchWidget';
import LastMileUpsell from './LastMileUpsell';
import AddressInputModal from './AddressInputModal';
import { useCheckoutStore } from '../store/checkoutStore';
import { useLastMileStore } from '../store/lastMileStore';
import { TAX_RATE } from '../lib/business';
import { recordBooking } from './MyBookingsPage';
import { useAuth } from '../lib/auth';
import { printTicket, downloadPkpass, type TicketData } from '../lib/ticket';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

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

export default function ResultsPage({ from, to, date, returnDate, go, onRequireAuth }: Props) {
  const [leg, setLeg] = useState<'onward' | 'return'>('onward');
  const [sort, setSort] = useState<SortKey>('smart');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quick, setQuick] = useState<Set<QuickFilter>>(new Set());
  const [depSlots, setDepSlots] = useState<Set<string>>(new Set());
  const [arrSlots, setArrSlots] = useState<Set<string>>(new Set());
  const [boarding, setBoarding] = useState<Set<string>>(new Set());
  const [dropping, setDropping] = useState<Set<string>>(new Set());
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [ladyQuota, setLadyQuota] = useState(false);
  const [windowOnly, setWindowOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [alertOn, setAlertOn] = useState(false);

  const activeFrom = leg === 'return' && returnDate ? to : from;
  const activeTo = leg === 'return' && returnDate ? from : to;
  const activeDate = leg === 'return' && returnDate ? returnDate : date;

  const buses = useMemo(() => generateBuses(activeFrom, activeTo, activeDate), [activeFrom, activeTo, activeDate]);

  const boardingOptions = useMemo(() => [...new Set(buses.flatMap((b) => b.boarding_points.map((p) => p.name)))].sort(), [buses]);
  const droppingOptions = useMemo(() => [...new Set(buses.flatMap((b) => b.dropping_points.map((p) => p.name)))].sort(), [buses]);

  const filtered = useMemo(() => {
    let list = buses.filter((b) => {
      if (quick.has('high-rated') && b.rating < 4.5) return false;
      if (quick.has('live') && !b.live_tracking) return false;
      if (quick.has('volvo') && !b.is_volvo) return false;
      if (quick.has('ac') && !b.is_ac) return false;
      if (quick.has('sleeper') && !b.is_sleeper) return false;
      if (quick.has('women') && !b.women_safety) return false;
      if (quick.has('refund') && b.cancellation !== 'free-until-6h') return false;
      if (quick.has('under-1k') && b.price > 1000) return false;
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
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'price') return a.price - b.price;
      if (sort === 'duration') return a.duration_mins - b.duration_mins;
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'smart') return b.smart_score - a.smart_score;
      return a.departure_time.localeCompare(b.departure_time);
    });
    return list;
  }, [buses, quick, depSlots, arrSlots, boarding, dropping, features, ladyQuota, windowOnly, sort]);

  const cheapest = useMemo(() => buses.reduce((a, b) => (a.price < b.price ? a : b)), [buses]);
  const fastest = useMemo(() => buses.reduce((a, b) => (a.duration_mins < b.duration_mins ? a : b)), [buses]);
  const topRated = useMemo(() => buses.reduce((a, b) => (a.rating > b.rating ? a : b)), [buses]);
  const bestValue = useMemo(() => buses.reduce((a, b) => ((a.rating / a.price) > (b.rating / b.price) ? a : b)), [buses]);

  const calendar = useMemo(() => {
    return [-1, 0, 1, 2, 3].map((offset) => {
      const d = shiftDate(date, offset);
      if (d < new Date().toISOString().slice(0, 10)) return null;
      const list = generateBuses(from, to, d);
      return { date: d, count: list.length, min: Math.min(...list.map((b) => b.price)) };
    }).filter(Boolean) as { date: string; count: number; min: number }[];
  }, [from, to, date]);

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
  const activeFilters = quick.size + depSlots.size + arrSlots.size + boarding.size + dropping.size + features.size + (ladyQuota ? 1 : 0) + (windowOnly ? 1 : 0);

  function clearFilters() {
    setQuick(new Set());
    setDepSlots(new Set());
    setArrSlots(new Set());
    setBoarding(new Set());
    setDropping(new Set());
    setFeatures(new Set());
    setLadyQuota(false);
    setWindowOnly(false);
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
    <div className={compareBuses.length ? 'pb-28' : ''}>
      <div className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="container-fluid py-4">
          <button onClick={() => go({ name: 'home' })} className="mb-3 flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft className="h-4 w-4" /> {activeFrom} → {activeTo}
          </button>
          <SearchWidget key={`${from}-${to}-${date}-${returnDate ?? ''}`} compact initialFrom={from} initialTo={to} initialDate={date} initialReturnDate={returnDate} />
        </div>
      </div>

      <div className="container-fluid mt-6">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {calendar.map((c) => (
            <button
              key={c.date}
              onClick={() => go({ name: 'results', from, to, date: c.date, returnDate })}
              className={`min-w-[108px] rounded-xl border px-3 py-2 text-left ${c.date === date ? 'border-crimson-500 bg-crimson-600/10' : ''}`}
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

        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          <div className="mb-4 lg:mb-0">
            <button onClick={() => setFiltersOpen((v) => !v)} className="btn-ghost mb-3 w-full lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filters {activeFilters > 0 ? `(${activeFilters})` : ''}
            </button>
            <div className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>{filters}</div>
          </div>

          <div>
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

            <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{activeFrom} → {activeTo}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} buses · {formatDateLong(activeDate)}</p>
                </div>
                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-700">Onward journey</span>
              </div>

            <div className="flex gap-3 overflow-x-auto px-4 py-3">
              <OfferChip title="10% off roundtrip" sub={returnDate ? 'Applied on return leg' : 'Add a return date to unlock'} />
              <OfferChip title="25% senior concession" sub="For senior citizens at boarding" />
              <OfferChip title="5% group booking" sub="4+ seats on one PNR" />
              <OfferChip title="Delay guarantee" sub="10% back if late by 30+ min" />
              <OfferChip title="Hotel + last-mile" sub="Bundle at checkout — unique to YLT" />
            </div>

            <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-raised)' }}>
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

            <div className="grid gap-3 px-4 sm:grid-cols-4">
              <SmartPick label="Cheapest" bus={cheapest} onOpen={() => setExpandedId(cheapest.id)} />
              <SmartPick label="Fastest" bus={fastest} onOpen={() => setExpandedId(fastest.id)} />
              <SmartPick label="Top rated" bus={topRated} onOpen={() => setExpandedId(topRated.id)} />
              <SmartPick label="Best value" bus={bestValue} onOpen={() => setExpandedId(bestValue.id)} />
            </div>

            <div className="space-y-3 p-4">
              {filtered.length === 0 && (
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

function OfferChip({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="min-w-[200px] rounded-2xl border px-3 py-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

function SmartPick({ label, bus, onOpen }: { label: string; bus: Bus; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="surface-raised p-3 text-left">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-crimson-600">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{bus.operator}</p>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatTime12(bus.departure_time)} · {formatINR(bus.price)}</p>
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
  const via = bus.via.length ? `Via ${bus.via.join(' ').toUpperCase()}` : 'Direct';
  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-500">{via} ({bus.bus_type})</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{bus.operator} - {bus.service_number}</p>
            {bus.prime && <span className="chip chip-crimson"><Sparkles className="h-3 w-3" /> Prime</span>}
            {bus.delay_guarantee && <span className="chip chip-crimson"><BadgeCheck className="h-3 w-3" /> Delay cover</span>}
            {bus.live_tracking && <span className="chip chip-crimson"><Radio className="h-3 w-3" /> Live</span>}
            {bus.women_safety && <span className="chip chip-crimson"><ShieldAlert className="h-3 w-3" /> Women-safe</span>}
            {bus.delay_mins > 0 && <span className="text-xs text-amber-600"><Clock className="inline h-3 w-3" /> +{bus.delay_mins}m delay</span>}
          </div>
          <p className="mt-0.5 text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{bus.bus_type}</p>
          <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-4">
            <div>
              <p className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{bus.departure_time}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{bus.from}</p>
            </div>
            <div>
              <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDuration(bus.duration_mins)}</p>
              <div className="mt-1 h-px bg-gradient-to-r from-crimson-500/40 via-[var(--border)] to-crimson-500/40" />
              <p className="mt-1 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>{bus.punctuality}% on-time · Smart {bus.smart_score}</p>
            </div>
            <div>
              <p className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{bus.arrival_time}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{bus.to}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {bus.amenities.slice(0, 3).map((a) => <span key={a} className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}>{a}</span>)}
            {bus.meals && <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}><Utensils className="inline h-3 w-3" /> Meals</span>}
            {bus.accessible && <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}><Accessibility className="inline h-3 w-3" /> Accessible</span>}
            {bus.night_crew && <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}><Moon className="inline h-3 w-3" /> Night crew</span>}
            <span><Leaf className="inline h-3 w-3" /> {bus.co2_kg} kg CO₂</span>
            {bus.hotel_bundle_saving > 0 && <span className="text-crimson-600"><Hotel className="inline h-3 w-3" /> Save {formatINR(bus.hotel_bundle_saving)} on hotel</span>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-6 lg:min-w-[200px] lg:flex-col lg:items-end">
          <div className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 text-amber-500" /> {bus.rating.toFixed(1)} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({bus.reviews})</span></div>
          <div className="text-right">
            {bus.original_price > bus.price && <p className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{formatINR(bus.original_price)}</p>}
            <p className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatINR(bus.price)}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Onwards</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{bus.seats_available} Seats ({bus.single_seats} Single)</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={onToggle} className="rounded-full bg-crimson-600 px-5 py-2 text-sm font-semibold text-white hover:bg-crimson-500">{expanded ? 'Hide seats' : 'View seats'}</button>
            <button onClick={onCompare} className={`text-xs ${compared ? 'text-crimson-600' : ''}`} style={!compared ? { color: 'var(--text-muted)' } : undefined}>
              {compared ? 'Added to compare' : 'Compare'}
            </button>
          </div>
        </div>
      </div>
      {expanded && <SeatMap bus={bus} go={go} onRequireAuth={onRequireAuth} />}
    </div>
  );
}

function SeatMap({ bus, go, onRequireAuth }: { bus: Bus; go: (v: View) => void; onRequireAuth?: (action: string, proceed?: () => void) => void }) {
  const seats = useMemo(() => generateSeats(bus), [bus]);
  const checkout = useCheckoutStore();
  const lastMile = useLastMileStore();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [addressOpen, setAddressOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [booking, setBooking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const MAX = 4;
  const selectedSeats = selected.map((id) => seats.find((s) => s.id === id)!).filter(Boolean);
  const seatTotal = selectedSeats.reduce((s, x) => s + x.price, 0);

  const carFare = lastMile.fare;
  const subtotal = seatTotal + carFare;
  const taxes = Math.round(subtotal * TAX_RATE);
  const grand = subtotal + taxes;
  const needsAddress = !!lastMile.selectedCar && !lastMile.address;

  useEffect(() => {
    const items: { type: 'bus' | 'lastmile'; label: string; amount: number }[] = [];
    if (seatTotal > 0) items.push({ type: 'bus', label: `${selectedSeats.length} seat(s) on ${bus.operator}`, amount: seatTotal });
    if (carFare > 0 && lastMile.selectedCar) items.push({ type: 'lastmile', label: `Last-mile (${lastMile.selectedCar.model})`, amount: carFare });
    checkout.setItems(items as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatTotal, carFare, lastMile.selectedCar]);

  function toggle(seat: Seat) {
    if (seat.is_booked) return;
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

  function book() {
    if (needsAddress) { setAddressOpen(true); return; }
    if (onRequireAuth) { onRequireAuth('book bus seats', () => doBook()); return; }
    doBook();
  }

  async function doBook() {
    const seatLabels = selectedSeats.map((s) => s.label);
    const contactEmail = user?.email ?? '';
    if (!contactEmail) {
      setAuthError('Sign in to complete your booking.');
      return;
    }
    setBooking(true);
    setAuthError(null);

    let pnr = '';
    try {
      const res = await fetch(`${API}/bookings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bus_id: bus.id,
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
          user_identifier: user?.email ?? null,
          user_type: 'customer',
          boarding_point: lastMile.address?.pickup_address ?? null,
          dropping_point: null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setBooking(false);
        setAuthError(data.error ?? 'Booking failed. Please try again.');
        return;
      }
      pnr = data.pnr ?? '';
    } catch {
      setBooking(false);
      setAuthError('Network error. Please try again.');
      return;
    }

    checkout.setPnr(pnr);
    recordBooking({ pnr, type: 'bus', operator: bus.operator, route: `${bus.from} → ${bus.to}`, date: bus.date, departure: bus.departure_time, seats: `${selectedSeats.length} seat(s)`, total: grand, created_at: new Date().toISOString() });

    setBooking(false);
    setConfirmed(true);
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
      seats: `${selectedSeats.length} seat(s)`,
      amount: seatTotal,
      taxes,
      total: grand,
      contactEmail: user?.email,
      boardingPoint: lastMile.address?.pickup_address,
      qrData: JSON.stringify({ pnr, type: 'bus', operator: bus.operator, route: `${bus.from} → ${bus.to}`, date: bus.date, total: grand }),
    };
    return (
      <div className="border-t p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
          <h3 className="mt-2 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Booking Confirmed!</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>PNR: <strong style={{ color: 'var(--text-primary)' }}>{pnr}</strong></p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedSeats.length} seat(s) on {bus.operator} · {bus.from} → {bus.to}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Total paid: {formatINR(grand)}</p>
          {lastMile.selectedCar && lastMile.address && <p className="mt-1 text-xs text-emerald-600">Last-mile: {lastMile.selectedCar.model} from {lastMile.address.pickup_address}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => printTicket(ticket)} className="btn-ghost text-xs"><Download className="inline h-3.5 w-3.5" /> Download PDF</button>
            <button onClick={() => downloadPkpass(ticket)} className="btn-ghost text-xs"><Wallet className="inline h-3.5 w-3.5" /> Add to Wallet</button>
          </div>
          <button onClick={() => { checkout.reset(); lastMile.reset(); go({ name: 'home' }); }} className="btn-ghost mt-4 text-xs">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 border-t p-6 lg:grid-cols-[1fr_320px]" style={{ borderColor: 'var(--border)' }}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Select your seats</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {bus.ladies_seats} ladies quota · {bus.window_seats} window · rest stops {bus.rest_stop_rating.toFixed(1)}★
          {bus.delay_guarantee ? ' · 10% back if 30+ min late' : ''}
        </p>
        <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2" style={{ color: 'var(--text-secondary)' }}>
          <p><MapPin className="inline h-3 w-3" /> Board: {bus.boarding_points.map((p) => `${p.name} ${p.time}`).join(' · ')}</p>
          <p><MapPin className="inline h-3 w-3" /> Drop: {bus.dropping_points.map((p) => `${p.name} ${p.time}`).join(' · ')}</p>
        </div>
        <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8">
          {seats.filter((s) => s.deck === 'lower').map((seat) => (
            <button key={seat.id} onClick={() => toggle(seat)} disabled={seat.is_booked}
              title={seat.is_ladies ? 'Ladies quota' : seat.is_window ? 'Window' : seat.is_single ? 'Single' : 'Seat'}
              className={`aspect-square rounded-lg border text-xs font-medium transition ${
                seat.is_booked ? 'cursor-not-allowed border-[var(--border)] bg-[var(--bg-raised)] opacity-50' :
                selected.includes(seat.id) ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600' :
                seat.is_ladies ? 'border-pink-400 bg-pink-500/15 text-pink-700' :
                'border-[var(--border)] bg-[var(--bg-raised)] hover:border-emerald-500/50'
              }`} style={seat.is_booked ? { color: 'var(--text-muted)' } : selected.includes(seat.id) || seat.is_ladies ? undefined : { color: 'var(--text-secondary)' }}>
              {seat.is_booked ? 'X' : seat.label}
            </button>
          ))}
        </div>
        {seats.some((s) => s.deck === 'upper') && (
          <>
            <h4 className="mt-4 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Upper deck</h4>
            <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8">
              {seats.filter((s) => s.deck === 'upper').map((seat) => (
                <button key={seat.id} onClick={() => toggle(seat)} disabled={seat.is_booked}
                  className={`aspect-square rounded-lg border text-xs font-medium transition ${
                    seat.is_booked ? 'cursor-not-allowed border-[var(--border)] bg-[var(--bg-raised)] opacity-50' :
                    selected.includes(seat.id) ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600' :
                    'border-[var(--border)] bg-[var(--bg-raised)] hover:border-emerald-500/50'
                  }`} style={seat.is_booked ? { color: 'var(--text-muted)' } : selected.includes(seat.id) ? undefined : { color: 'var(--text-secondary)' }}>
                  {seat.is_booked ? 'X' : seat.label}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-[var(--border)] bg-[var(--bg-raised)]" /> Available</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-emerald-500 bg-emerald-500/20" /> Selected</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-pink-400 bg-pink-500/15" /> Ladies quota</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-[var(--border)] bg-[var(--bg-raised)] opacity-50" /> Booked</span>
        </div>
      </div>

      <div>
        {selectedSeats.length === 0 ? (
          <div className="surface p-5 text-center">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select seats to see fare and checkout</p>
            {bus.hotel_bundle_saving > 0 && <p className="mt-2 text-xs text-crimson-600">Hotel bundle saves {formatINR(bus.hotel_bundle_saving)} after you book.</p>}
          </div>
        ) : (
          <div className="surface p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Fare Summary</h4>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>{selectedSeats.length} seat(s)</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(seatTotal)}</span></div>
              {selectedSeats.length >= 4 && <div className="flex justify-between text-crimson-600"><span>Group 5% off</span><span>-{formatINR(Math.round(seatTotal * 0.05))}</span></div>}
              {bus.insurance_available && <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Trip protect (optional)</span><span style={{ color: 'var(--text-muted)' }}>₹29</span></div>}
              {lastMile.selectedCar && lastMile.address && <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Last-mile ({lastMile.selectedCar.model})</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(carFare)}</span></div>}
              <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Taxes (5%)</span><span style={{ color: 'var(--text-primary)' }}>{formatINR(taxes)}</span></div>
              <div className="divider my-1.5" />
              <div className="flex justify-between font-semibold"><span style={{ color: 'var(--text-primary)' }}>Total</span><span className="font-display text-lg text-gradient-crimson">{formatINR(grand)}</span></div>
            </div>

            <div className="mt-4">
              <LastMileUpsell selectedCar={lastMile.selectedCar} onSelect={selectLastMile} onRequireAddress={(car) => { lastMile.setCar(car); setAddressOpen(true); }} />
            </div>

            {needsAddress && <p className="mt-3 text-xs text-amber-600"><MapPin className="inline h-3 w-3" /> Enter address to continue</p>}
            {authError && <p className="mt-3 text-xs text-red-500">{authError}</p>}
            <button onClick={book} disabled={needsAddress || booking} className="btn-primary mt-3 w-full text-xs disabled:opacity-40">
              {booking ? <>Confirming…</> : needsAddress ? <><MapPin className="h-4 w-4" /> Enter address to continue</> : <>Proceed to Checkout <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        )}
      </div>

      {addressOpen && <AddressInputModal open={addressOpen} onClose={() => setAddressOpen(false)} car={lastMile.selectedCar} onConfirm={confirmAddress} />}
    </div>
  );
}
