import { useState, type ReactNode } from 'react';
import type { Bus, Seat, RouteStop } from '../types';
import { formatINR } from '../lib/format';
import { Sparkles, TrendingDown, TrendingUp, Check } from 'lucide-react';

export type SeatPointTab = 'boarding' | 'dropping' | 'lastmile';

export function SeatDeckPanel({
  seats,
  selected,
  onToggle,
}: {
  seats: Seat[];
  selected: string[];
  onToggle: (seat: Seat) => void;
}) {
  const lower = seats.filter((s) => s.deck === 'lower');
  const upper = seats.filter((s) => s.deck === 'upper');

  return (
    <div className="rounded-2xl border bg-gradient-to-b from-slate-100 to-slate-50 p-4" style={{ borderColor: 'var(--border)' }}>
      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">3D sleeper layout · tap a berth</p>
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ perspective: '900px' }}>
        <Deck title="Lower" seats={lower} selected={selected} onToggle={onToggle} wheel />
        {upper.length > 0 && <Deck title="Upper" seats={upper} selected={selected} onToggle={onToggle} />}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-emerald-400 bg-white" /> Available</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-emerald-600 bg-emerald-100" /> Selected</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-rose-400 bg-rose-50" /> Ladies</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-300" /> Booked</span>
      </div>
    </div>
  );
}

export function BusRouteSidebar({
  bus,
  board,
  drop,
  onBoard,
  onDrop,
  lastMile,
  lastMileDone,
}: {
  bus: Bus;
  board: string;
  drop: string;
  onBoard: (name: string) => void;
  onDrop: (name: string) => void;
  lastMile?: ReactNode;
  lastMileDone?: boolean;
}) {
  const trend = aiTrend(bus);
  const [tab, setTab] = useState<SeatPointTab>('boarding');
  const boardingDone = !!board;
  const droppingDone = !!drop;

  function pickBoard(name: string) {
    onBoard(name);
    setTab('dropping');
  }

  const tabs: { id: SeatPointTab; label: string; done: boolean; hint: string }[] = [
    { id: 'boarding', label: 'Boarding', done: boardingDone, hint: board || 'Pick a point' },
    { id: 'dropping', label: 'Dropping', done: droppingDone, hint: drop || 'Pick a point' },
    { id: 'lastmile', label: 'Last-mile', done: !!lastMileDone, hint: lastMileDone ? 'Car added' : 'Optional' },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border)' }}>
        <div className="grid shrink-0 grid-cols-3 border-b" style={{ borderColor: 'var(--border)' }} role="tablist" aria-label="Boarding, dropping and last-mile">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex min-w-0 items-start gap-1.5 border-b-2 px-1.5 py-2 text-left transition ${
                  active ? 'border-crimson-600 bg-crimson-50' : 'border-transparent hover:bg-[var(--bg-raised)]'
                }`}
              >
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                    t.done ? 'bg-crimson-600 text-white' : 'border-2 border-slate-300 bg-white'
                  }`}
                  aria-hidden
                >
                  {t.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-[11px] font-bold leading-tight ${active ? 'text-crimson-700' : ''}`} style={active ? undefined : { color: 'var(--text-primary)' }}>
                    {t.label}
                  </span>
                  <span className="block truncate text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="tabpanel">
          {tab === 'boarding' && (
            <StopList
              items={bus.boarding_points}
              value={board}
              onChange={pickBoard}
              city={bus.from}
              kind="boarding"
              tripDate={bus.date}
              departureTime={bus.departure_time}
            />
          )}
          {tab === 'dropping' && (
            <StopList
              items={bus.dropping_points}
              value={drop}
              onChange={onDrop}
              city={bus.to}
              kind="dropping"
              tripDate={bus.date}
              departureTime={bus.departure_time}
            />
          )}
          {tab === 'lastmile' && (
            <div className="p-2.5">
              <p className="mb-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Optional add-on. You can pay without a last-mile car.
              </p>
              {lastMile ?? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last-mile cars appear here after you open seats from search.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="hidden shrink-0 rounded-2xl border border-navy-200 bg-gradient-to-br from-navy-50 to-gold-50 p-2.5 lg:block">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-navy-800"><Sparkles className="h-3.5 w-3.5 text-gold-600" /> AI fare insight</p>
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-navy-900">
          {trend.down ? <TrendingDown className="h-3.5 w-3.5 text-emerald-600" /> : <TrendingUp className="h-3.5 w-3.5 text-amber-600" />}
          {trend.line}
        </p>
      </div>
    </div>
  );
}

export default function BusSeatStudio({
  bus,
  seats,
  selected,
  onToggle,
  board,
  drop,
  onBoard,
  onDrop,
}: {
  bus: Bus;
  seats: Seat[];
  selected: string[];
  onToggle: (seat: Seat) => void;
  board: string;
  drop: string;
  onBoard: (name: string) => void;
  onDrop: (name: string) => void;
}) {
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(300px,1.15fr)_minmax(280px,0.95fr)]">
      <SeatDeckPanel seats={seats} selected={selected} onToggle={onToggle} />
      <BusRouteSidebar bus={bus} board={board} drop={drop} onBoard={onBoard} onDrop={onDrop} />
    </div>
  );
}

function StopList({
  items,
  value,
  onChange,
  city,
  kind,
  tripDate,
  departureTime,
}: {
  items: RouteStop[];
  value: string;
  onChange: (n: string) => void;
  city: string;
  kind: 'boarding' | 'dropping';
  tripDate: string;
  departureTime: string;
}) {
  if (items.length === 0) {
    return <p className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No {kind} points on this trip.</p>;
  }

  return (
    <div>
      {items.map((p) => {
        const on = value === p.name;
        return (
          <button
            key={p.name}
            type="button"
            onClick={() => onChange(p.name)}
            className={`flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left transition ${
              on ? 'bg-[color-mix(in_srgb,var(--crimson)_22%,transparent)]' : 'bg-transparent hover:bg-[var(--bg-raised)]'
            }`}
            style={{ borderColor: 'var(--border)' }}
          >
            <span
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
                on ? 'border-crimson-600' : 'border-slate-300'
              }`}
              aria-hidden
            >
              {on && <span className="h-2 w-2 rounded-full bg-crimson-600" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
              <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                {kind === 'boarding' ? `Pickup in ${city}` : `Drop in ${city}`}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{p.time}</span>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{pointDateLabel(tripDate, departureTime, p.time, kind)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function shiftIsoDate(date: string, days: number) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function pointDateLabel(tripDate: string, departureTime: string, stopTime: string, kind: 'boarding' | 'dropping') {
  let date = tripDate;
  if (kind === 'dropping' && toMins(stopTime) < toMins(departureTime)) {
    date = shiftIsoDate(tripDate, 1);
  }
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function Deck({ title, seats, selected, onToggle, wheel }: { title: string; seats: Seat[]; selected: string[]; onToggle: (s: Seat) => void; wheel?: boolean }) {
  return (
    <div
      className="min-w-[240px] rounded-3xl border border-slate-200 bg-white p-3 shadow-xl"
      style={{ transform: 'rotateX(14deg) rotateY(-6deg)', transformStyle: 'preserve-3d' }}
    >
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
        {title} deck
        {wheel && <span className="text-lg">🛞</span>}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {seats.map((seat) => {
          const on = selected.includes(seat.id);
          return (
            <button
              key={seat.id}
              onClick={() => onToggle(seat)}
              disabled={seat.is_booked}
              title={seat.is_ladies ? 'Ladies quota' : seat.label}
              className={`relative flex h-16 flex-col items-center justify-end rounded-xl border-2 pb-1 text-[9px] font-semibold shadow-md transition ${
                seat.is_booked ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400' :
                on ? 'border-emerald-600 bg-gradient-to-b from-emerald-200 to-emerald-400 text-emerald-950' :
                seat.is_ladies ? 'border-rose-400 bg-gradient-to-b from-white to-rose-100 text-rose-800' :
                'border-emerald-300 bg-gradient-to-b from-white to-emerald-50 text-emerald-800 hover:-translate-y-0.5'
              }`}
              style={{ boxShadow: '0 8px 0 rgba(15,23,42,0.08), 0 12px 18px rgba(15,23,42,0.12)' }}
            >
              <span className="absolute top-1 h-5 w-8 rounded-t-lg bg-white/70 shadow-inner" />
              {!seat.is_booked && <span>{formatINR(seat.price)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function aiTrend(bus: Bus) {
  const drop = Math.max(2, Math.round((bus.original_price - bus.price) / Math.max(bus.original_price, 1) * 100));
  const down = bus.price <= bus.original_price * 0.95 || bus.punctuality >= 90;
  return {
    down,
    line: down ? `Fares on ${bus.from} → ${bus.to} are ~${drop}% below the 14-day peak.` : `Demand is rising — tonight’s seats are pricing up vs last week.`,
    hint: down
      ? 'Book in this window. AI watch: similar nights fill 6–8 hours before departure.'
      : 'If you can wait, set a price alert. Women-safe and Prime buses hold value.',
  };
}
