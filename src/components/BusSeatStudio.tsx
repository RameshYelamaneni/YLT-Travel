import { useState, type ReactNode } from 'react';
import type { Bus, Seat, RouteStop } from '../types';
import { formatINR } from '../lib/format';
import { quoteSaver, useSaverSettings } from '../lib/yltSaver';
import { Check } from 'lucide-react';

const DRIVER_FALLBACK = '/crew/driver-placeholder.svg';

export type SeatPointTab = 'boarding' | 'dropping' | 'lastmile';

export function SeatDeckPanel({
  seats,
  selected,
  onToggle,
  bus,
}: {
  seats: Seat[];
  selected: string[];
  onToggle: (seat: Seat) => void;
  bus?: Bus;
}) {
  const lower = seats.filter((s) => s.deck === 'lower');
  const upper = seats.filter((s) => s.deck === 'upper');
  const sleeper = bus?.is_sleeper ?? seats.some((s) => s.type.startsWith('sleeper'));

  return (
    <div className="rounded-2xl border bg-gradient-to-b from-slate-50 to-white p-4" style={{ borderColor: 'var(--border)' }}>
      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        {sleeper ? 'Sleeper coach · front is the driver cabin' : 'Seater coach · front is the driver cabin'}
      </p>
      <div className="flex flex-wrap justify-center gap-5">
        <Deck title="Lower" seats={lower} selected={selected} onToggle={onToggle} sleeper={sleeper} showDriver bus={bus} />
        {upper.length > 0 && <Deck title="Upper" seats={upper} selected={selected} onToggle={onToggle} sleeper={sleeper} />}
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
  const { rupees } = useSaverSettings();
  const saver = quoteSaver(bus.price, rupees);
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

      {saver.discount > 0 && (
        <div className="hidden shrink-0 rounded-2xl border border-navy-200 bg-gradient-to-br from-navy-50 to-gold-50 p-2.5 lg:block">
          <p className="text-[10px] font-bold uppercase tracking-wider text-navy-800">YLT Saver</p>
          <p className="mt-1 text-xs font-semibold text-navy-900">
            <span className="mr-1 line-through font-normal" style={{ color: 'var(--text-muted)' }}>{formatINR(saver.listed)}</span>
            {formatINR(saver.price)}
          </p>
          <p className="mt-0.5 text-[11px] text-navy-800">{saver.label}</p>
        </div>
      )}
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
      <SeatDeckPanel bus={bus} seats={seats} selected={selected} onToggle={onToggle} />
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

function Deck({
  title,
  seats,
  selected,
  onToggle,
  sleeper,
  showDriver,
  bus,
}: {
  title: string;
  seats: Seat[];
  selected: string[];
  onToggle: (s: Seat) => void;
  sleeper: boolean;
  showDriver?: boolean;
  bus?: Bus;
}) {
  const cols = sleeper ? 3 : 4;
  const rows: Seat[][] = [];
  for (let i = 0; i < seats.length; i += cols) rows.push(seats.slice(i, i + cols));
  const grid = sleeper ? '1fr 1fr 0.55rem 1fr' : '1fr 1fr 0.55rem 1fr 1fr';

  return (
    <div className="w-[min(100%,17.5rem)] overflow-hidden rounded-[2rem] border-2 border-slate-300 bg-slate-100 shadow-inner">
      <p className="bg-slate-800 py-1 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white">{title} deck</p>
      {showDriver && <DriverCabin bus={bus} />}
      <div className="space-y-1.5 px-3 py-3">
        {rows.map((row, ri) => (
          <div key={ri} className="grid items-center gap-1.5" style={{ gridTemplateColumns: grid }}>
            {row.map((seat, ci) => {
              const cells = [];
              cells.push(<SeatBtn key={seat.id} seat={seat} selected={selected} onToggle={onToggle} />);
              if (ci === 1) cells.push(<span key={`${seat.id}-aisle`} className="h-8 w-full rounded-full bg-slate-200/80" aria-hidden />);
              return cells;
            })}
          </div>
        ))}
      </div>
      <p className="bg-slate-200 py-1 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">Rear</p>
    </div>
  );
}

function DriverCabin({ bus }: { bus?: Bus }) {
  const name = bus?.driverName || 'Duty driver';
  const photo = bus?.driverPhoto || DRIVER_FALLBACK;
  const years = bus?.experienceYears;
  const conductor = bus?.conductorName;

  return (
    <div className="relative border-b border-slate-300 bg-gradient-to-b from-slate-700 to-slate-600 px-3 py-2.5 text-white">
      <p className="mb-1.5 text-center text-[9px] font-bold uppercase tracking-[0.22em] text-amber-300">Front of bus · driver cabin</p>
      <div className="flex items-center gap-2.5 rounded-xl bg-black/25 px-2 py-1.5">
        <div className="relative shrink-0">
          <img src={photo} alt="" className="h-12 w-12 rounded-full border-2 border-amber-300 bg-slate-500 object-cover" />
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[11px]" title="Steering">⎈</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{name}</p>
          <p className="text-[11px] text-white/80">
            {years ? `${years} yrs experience` : 'Assigned driver'}
            {bus?.listing_source === 'catalog' ? ' · Catalog' : ''}
          </p>
          {conductor && <p className="truncate text-[10px] text-white/70">Conductor {conductor}</p>}
        </div>
      </div>
    </div>
  );
}

function SeatBtn({ seat, selected, onToggle }: { seat: Seat; selected: string[]; onToggle: (s: Seat) => void }) {
  const on = selected.includes(seat.id);
  const saver = quoteSaver(seat.price, useSaverSettings().rupees);
  return (
    <button
      type="button"
      onClick={() => onToggle(seat)}
      disabled={seat.is_booked}
      title={seat.is_ladies ? `${seat.label} · Ladies quota` : seat.label}
      className={`flex h-14 min-w-0 flex-col items-center justify-center rounded-lg border-2 text-[9px] font-semibold leading-tight transition ${
        seat.is_booked ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400' :
        on ? 'border-emerald-600 bg-emerald-200 text-emerald-950' :
        seat.is_ladies ? 'border-rose-400 bg-rose-50 text-rose-800' :
        'border-emerald-300 bg-white text-emerald-800 hover:border-emerald-500'
      }`}
    >
      <span>{seat.label}</span>
      {!seat.is_booked && saver.discount > 0 && (
        <span className="font-medium line-through opacity-60">{formatINR(saver.listed)}</span>
      )}
      {!seat.is_booked && <span className="font-medium opacity-80">{formatINR(saver.price)}</span>}
    </button>
  );
}
