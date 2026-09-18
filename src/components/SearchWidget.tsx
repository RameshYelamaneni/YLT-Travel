import { useState } from 'react';
import { Search, ArrowRight, Calendar, MapPin, AlertCircle, ArrowLeftRight, Users } from 'lucide-react';
import { useNav } from '../store/nav';
import { MOCK_CITIES } from '../data/mockCars';
import { formatINR } from '../lib/format';
import { useAccountPrefs } from '../store/accountPrefs';

function shiftDate(date: string, days: number) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Props {
  compact?: boolean;
  hero?: boolean;
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
  initialReturnDate?: string;
}

export default function SearchWidget({ compact = false, hero = false, initialFrom, initialTo, initialDate, initialReturnDate }: Props) {
  const { go } = useNav();
  const bookingForWomen = useAccountPrefs((s) => s.bookingForWomen);
  const setBookingForWomen = useAccountPrefs((s) => s.setBookingForWomen);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(initialFrom ?? 'Hyderabad');
  const [to, setTo] = useState(initialTo ?? 'Bengaluru');
  const [date, setDate] = useState(initialDate ?? today);
  const [returnDate, setReturnDate] = useState(initialReturnDate ?? '');
  const [passengers, setPassengers] = useState(1);
  const [error, setError] = useState<string | null>(null);

  function swap() {
    setFrom(to);
    setTo(from);
    setError(null);
  }

  function search() {
    if (!from.trim() || !to.trim()) { setError('Please select both origin and destination.'); return; }
    if (from === to) { setError('From and To cannot be the same city.'); return; }
    if (!date) { setError('Please select an onward date.'); return; }
    if (returnDate && returnDate < date) { setError('Return date cannot be before onward date.'); return; }
    setError(null);
    go({ name: 'results', from, to, date, returnDate: returnDate || undefined });
  }

  const field = hero
    ? 'w-full border-0 bg-transparent py-1 text-sm font-semibold outline-none'
    : `input-field mt-1.5 ${compact ? 'border-0 bg-transparent font-semibold' : ''}`;
  const label = hero ? 'text-[11px] font-semibold uppercase tracking-wide text-slate-400' : 'label-text flex items-center gap-1';

  const grid = hero
    ? 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1.35fr_1fr_auto_auto] lg:items-end lg:gap-0'
    : `grid grid-cols-1 items-end gap-2 ${compact ? 'lg:grid-cols-[1fr_auto_1fr_1fr_1fr_auto]' : 'lg:grid-cols-[1fr_auto_1fr_1fr_1fr_auto]'} lg:gap-3`;

  const box = (extra = '') => hero ? `rounded-xl px-3 py-2 lg:rounded-none ${extra}` : '';

  return (
    <div className={hero ? '' : compact ? 'rounded-2xl border bg-[var(--bg-surface)] p-2 shadow-sm sm:p-3' : 'surface-raised p-4 sm:p-6'} style={!hero && compact ? { borderColor: 'var(--border)' } : undefined}>
      <div className={`${grid} ${hero ? 'lg:divide-x lg:divide-slate-200' : ''}`}>
        <label className={`block min-w-0 ${box()}`}>
          <span className={label}>{!hero && <MapPin className="h-3 w-3" />} From</span>
          <select value={from} onChange={(e) => { setFrom(e.target.value); setError(null); }} className={field}>
            <option value="">City, station</option>
            {MOCK_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="button" onClick={swap} className={`mx-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-white shadow-sm ${hero ? 'lg:mx-2 lg:self-center' : ''}`} style={{ borderColor: 'var(--border)' }} title="Swap cities" aria-label="Swap cities">
          <ArrowLeftRight className="h-4 w-4 text-navy-700" />
        </button>
        <label className={`block min-w-0 ${box()}`}>
          <span className={label}>{!hero && <MapPin className="h-3 w-3" />} To</span>
          <select value={to} onChange={(e) => { setTo(e.target.value); setError(null); }} className={field}>
            <option value="">City, station</option>
            {MOCK_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className={`block min-w-0 ${box()}`}>
          <span className={label}>{!hero && <Calendar className="h-3 w-3" />} Date of journey</span>
          <div className="mt-1 flex min-w-0 flex-nowrap items-center gap-1">
            <input type="date" min={today} value={date} onChange={(e) => { setDate(e.target.value); setError(null); }} className={`min-w-0 flex-1 ${field} ${hero ? 'mt-0' : ''}`} />
            <button type="button" onClick={() => setDate(today)} className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${date === today ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}>Today</button>
            <button type="button" onClick={() => setDate(shiftDate(today, 1))} className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${date === shiftDate(today, 1) ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}>Tomorrow</button>
          </div>
        </label>
        <label className={`block min-w-0 ${box()}`}>
          <span className={label}>{!hero && <Calendar className="h-3 w-3" />} Return</span>
          <input type="date" min={date || today} value={returnDate} onChange={(e) => { setReturnDate(e.target.value); setError(null); }} className={field} />
        </label>
        {hero && (
          <label className={`block min-w-[5.5rem] ${box()}`}>
            <span className={label}><Users className="mr-1 inline h-3 w-3" /> Passengers</span>
            <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className={field}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <button onClick={search} disabled={!from || !to || from === to || !date} className={`${hero ? 'btn-search h-12 lg:h-[4.25rem] lg:rounded-l-none lg:rounded-r-2xl' : compact ? 'grid h-12 w-12 place-items-center rounded-full bg-gold-500 text-navy-950 shadow-md hover:bg-gold-400 disabled:opacity-40' : 'btn-search h-11 min-w-[140px]'}`} aria-label="Search buses">
          <Search className="h-5 w-5" />
          {hero ? 'Search' : !compact && 'Search buses'}
        </button>
      </div>
      <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 ${hero ? 'px-1' : ''}`}>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          Booking for women
          <button
            type="button"
            role="switch"
            aria-checked={bookingForWomen}
            onClick={() => setBookingForWomen(!bookingForWomen)}
            className={`relative h-6 w-11 rounded-full transition ${bookingForWomen ? 'bg-navy-800' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${bookingForWomen ? 'left-5' : 'left-0.5'}`} />
          </button>
        </label>
        {error && <p className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="h-3 w-3" /> {error}</p>}
        {!error && from === to && from && <p className="text-xs text-amber-600">From and To cannot be the same city.</p>}
      </div>
    </div>
  );
}

export function SearchHero() {
  const { go } = useNav();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900/30 via-[var(--bg-page)] to-[var(--bg-page)]" />
      <div className="container-fluid relative py-16 sm:py-24">
        <div className="max-w-2xl">
          <span className="chip chip-crimson">Bus & hotel booking online</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl" style={{ color: 'var(--text-primary)' }}>
            Book buses & hotels across South India
          </h1>
          <div className="mt-8 flex flex-wrap gap-4">
            <button onClick={() => go({ name: 'results', from: 'Hyderabad', to: 'Bengaluru', date: new Date().toISOString().slice(0, 10) })} className="btn-primary">
              Find Buses <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-8 flex gap-8">
            <Stat label="Cities" value="10+" />
            <Stat label="Daily buses" value="500+" />
            <Stat label="From" value={formatINR(420)} />
          </div>
        </div>
      </div>
      <div className="container-fluid relative pb-8">
        <SearchWidget />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}
