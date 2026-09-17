import { useState } from 'react';
import { Search, ArrowRight, Calendar, MapPin, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { useNav } from '../store/nav';
import { MOCK_CITIES } from '../data/mockCars';
import { formatINR } from '../lib/format';

interface Props {
  compact?: boolean;
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
  initialReturnDate?: string;
}

export default function SearchWidget({ compact = false, initialFrom, initialTo, initialDate, initialReturnDate }: Props) {
  const { go } = useNav();
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(initialFrom ?? 'Hyderabad');
  const [to, setTo] = useState(initialTo ?? 'Bengaluru');
  const [date, setDate] = useState(initialDate ?? today);
  const [returnDate, setReturnDate] = useState(initialReturnDate ?? '');
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

  return (
    <div className={`${compact ? 'rounded-2xl border bg-[var(--bg-surface)] p-2 shadow-sm sm:p-3' : 'surface-raised p-4 sm:p-6'}`} style={compact ? { borderColor: 'var(--border)' } : undefined}>
      <div className={`grid grid-cols-1 items-end gap-2 ${compact ? 'lg:grid-cols-[1fr_auto_1fr_1fr_1fr_auto]' : 'lg:grid-cols-[1fr_auto_1fr_1fr_1fr_auto]'} lg:gap-3`}>
        <label className="block min-w-0">
          <span className="label-text flex items-center gap-1"><MapPin className="h-3 w-3" /> From</span>
          <select value={from} onChange={(e) => { setFrom(e.target.value); setError(null); }} className={`input-field mt-1.5 ${compact ? 'border-0 bg-transparent font-semibold' : ''}`}>
            <option value="">Select origin</option>
            {MOCK_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="button" onClick={swap} className="mx-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-[var(--bg-surface)] shadow-sm" style={{ borderColor: 'var(--border)' }} title="Swap cities" aria-label="Swap cities">
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <label className="block min-w-0">
          <span className="label-text flex items-center gap-1"><MapPin className="h-3 w-3" /> To</span>
          <select value={to} onChange={(e) => { setTo(e.target.value); setError(null); }} className={`input-field mt-1.5 ${compact ? 'border-0 bg-transparent font-semibold' : ''}`}>
            <option value="">Select destination</option>
            {MOCK_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="label-text flex items-center gap-1"><Calendar className="h-3 w-3" /> Onward date</span>
          <input type="date" min={today} value={date} onChange={(e) => { setDate(e.target.value); setError(null); }} className={`input-field mt-1.5 ${compact ? 'border-0 bg-transparent font-semibold' : ''}`} />
        </label>
        <label className="block min-w-0">
          <span className="label-text flex items-center gap-1"><Calendar className="h-3 w-3" /> Return date</span>
          <input type="date" min={date || today} value={returnDate} onChange={(e) => { setReturnDate(e.target.value); setError(null); }} className={`input-field mt-1.5 ${compact ? 'border-0 bg-transparent font-semibold' : ''}`} />
        </label>
        <button onClick={search} disabled={!from || !to || from === to || !date} className={`${compact ? 'grid h-12 w-12 place-items-center rounded-full bg-crimson-600 text-white shadow-md hover:bg-crimson-500 disabled:opacity-40' : 'btn-primary h-11 disabled:opacity-40'}`} aria-label="Search buses">
          <Search className="h-5 w-5" />
          {!compact && 'Search'}
        </button>
      </div>
      {error && <p className="mt-2 flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="h-3 w-3" /> {error}</p>}
      {!error && from === to && from && <p className="mt-2 text-xs text-amber-600">From and To cannot be the same city.</p>}
    </div>
  );
}

export function SearchHero() {
  const { go } = useNav();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-crimson-900/30 via-[var(--bg-page)] to-[var(--bg-page)]" />
      <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-crimson-600/20 blur-3xl" />
      <div className="container-fluid relative py-16 sm:py-24">
        <div className="max-w-2xl">
          <span className="chip chip-crimson">Automated Transit OS</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl" style={{ color: 'var(--text-primary)' }}>
            Book buses & cars across South India
          </h1>
          <p className="mt-4 text-lg" style={{ color: 'var(--text-secondary)' }}>
            YLT Transit connects intercity bus travel with last-mile car pickups, self-drive rentals,
            and hotel stays — all in one platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button onClick={() => go({ name: 'results', from: 'Hyderabad', to: 'Bengaluru', date: new Date().toISOString().slice(0, 10) })} className="btn-primary">
              Find Buses <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => go({ name: 'cars' })} className="btn-ghost">Car Bookings</button>
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
