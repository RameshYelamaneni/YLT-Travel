import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Settings2 } from 'lucide-react';
import type { HotelAsset, HotelBookingRecord, HotelRoom } from '../../store/partnerHotelStore';
import { addDaysIso, dateRange, monthLabel, stayCoversNight, todayIso } from '../../lib/pmsMetrics';

const CFG_KEY = 'ylt_pms_tape';
const DAYS = 14;
const COL = 76;
const LABEL = 168;

const inputCls = 'rounded-lg border bg-[var(--bg-raised)] px-2.5 py-1.5 text-sm outline-none focus:border-crimson-500';

type TapeCfg = { weekStart: 0 | 1; hotelId: string; roomType: string };

function readCfg(): TapeCfg {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return { weekStart: 1, hotelId: 'all', roomType: 'all' };
    const p = JSON.parse(raw) as Partial<TapeCfg>;
    return {
      weekStart: p.weekStart === 0 ? 0 : 1,
      hotelId: p.hotelId || 'all',
      roomType: p.roomType || 'all',
    };
  } catch {
    return { weekStart: 1, hotelId: 'all', roomType: 'all' };
  }
}

function alignToWeek(iso: string, weekStart: 0 | 1): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDay();
  const delta = (day - weekStart + 7) % 7;
  return addDaysIso(iso, -delta);
}

export type WalkInSeed = {
  hotelId?: string;
  roomId?: string;
  roomNumber?: string;
  roomType?: string;
  checkIn?: string;
};

export default function HotelTapeChart({
  rooms, hotels, bookings, onEmpty, onBooking,
}: {
  rooms: HotelRoom[];
  hotels: HotelAsset[];
  bookings: HotelBookingRecord[];
  onEmpty: (seed: WalkInSeed) => void;
  onBooking: (b: HotelBookingRecord) => void;
}) {
  const [cfg, setCfg] = useState<TapeCfg>(readCfg);
  const [configOpen, setConfigOpen] = useState(false);
  const [start, setStart] = useState(() => alignToWeek(todayIso(), readCfg().weekStart));
  const [q, setQ] = useState('');
  const today = todayIso();

  useEffect(() => {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  }, [cfg]);

  const days = useMemo(() => dateRange(start, DAYS), [start]);
  const year = Number(start.slice(0, 4));
  const month = Number(start.slice(5, 7));
  const types = useMemo(() => {
    const set = new Set(rooms.map((r) => r.room_type).filter(Boolean));
    return [...set].sort();
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (cfg.hotelId !== 'all' && r.hotel_id !== cfg.hotelId) return false;
      if (cfg.roomType !== 'all' && r.room_type !== cfg.roomType) return false;
      return true;
    });
  }, [rooms, cfg.hotelId, cfg.roomType]);

  const groups = useMemo(() => {
    const map = new Map<string, HotelRoom[]>();
    filteredRooms.forEach((r) => {
      const k = r.room_type || 'Room';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return [...map.entries()].map(([type, list]) => ({
      type,
      rooms: list.slice().sort((a, b) => String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true })),
    }));
  }, [filteredRooms]);

  const needle = q.trim().toLowerCase();
  const liveBookings = useMemo(
    () => bookings.filter((b) => b.status !== 'cancelled'),
    [bookings],
  );

  function bookingOnRoom(room: HotelRoom, d: string): HotelBookingRecord | undefined {
    return liveBookings.find((b) => {
      const sameRoom = b.room_id === room.id || (!!b.roomNumber && b.roomNumber === room.room_number && (!b.hotel_id || b.hotel_id === room.hotel_id));
      return sameRoom && stayCoversNight(b, d);
    });
  }

  function barsForRoom(room: HotelRoom) {
    const end = addDaysIso(start, DAYS);
    return liveBookings.filter((b) => {
      const sameRoom = b.room_id === room.id || (!!b.roomNumber && b.roomNumber === room.room_number && (!b.hotel_id || b.hotel_id === room.hotel_id));
      if (!sameRoom) return false;
      const out = b.checkOut || addDaysIso(b.checkIn, Math.max(1, b.nights || 1));
      return b.checkIn < end && out > start;
    });
  }

  function jumpMonth(y: number, m: number) {
    const iso = `${y}-${String(m).padStart(2, '0')}-01`;
    setStart(alignToWeek(iso, cfg.weekStart));
  }

  function setWeekStart(weekStart: 0 | 1) {
    setCfg((s) => ({ ...s, weekStart }));
    setStart((cur) => alignToWeek(cur, weekStart));
  }

  const unassigned = useMemo(() => {
    const assigned = new Set(rooms.map((r) => r.id));
    return liveBookings.filter((b) => {
      if (cfg.hotelId !== 'all' && b.hotel_id !== cfg.hotelId) return false;
      if (cfg.roomType !== 'all' && b.roomType !== cfg.roomType) return false;
      const out = b.checkOut || addDaysIso(b.checkIn, Math.max(1, b.nights || 1));
      const overlaps = b.checkIn < addDaysIso(start, DAYS) && out > start;
      if (!overlaps) return false;
      if (b.room_id && assigned.has(b.room_id)) return false;
      if (b.roomNumber && rooms.some((r) => r.room_number === b.roomNumber && (!b.hotel_id || r.hotel_id === b.hotel_id))) return false;
      return true;
    });
  }, [liveBookings, rooms, cfg.hotelId, cfg.roomType, start]);

  const width = LABEL + DAYS * COL;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className={inputCls} value={year} onChange={(e) => jumpMonth(Number(e.target.value), month)}>
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className={inputCls} value={month} onChange={(e) => jumpMonth(year, Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-IN', { month: 'long' })}</option>
          ))}
        </select>
        <button type="button" className="btn-ghost px-2 py-1.5" onClick={() => setStart(addDaysIso(start, -DAYS))} aria-label="Previous period">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" className="btn-ghost px-2 py-1.5 text-xs font-semibold" onClick={() => setStart(alignToWeek(today, cfg.weekStart))}>
          Today
        </button>
        <button type="button" className="btn-ghost px-2 py-1.5" onClick={() => setStart(addDaysIso(start, DAYS))} aria-label="Next period">
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{monthLabel(start)}</span>
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input className={inputCls + ' w-full pl-8'} placeholder="Search PNR or guest" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="button" className="btn-ghost text-sm" onClick={() => setConfigOpen((v) => !v)}>
          <Settings2 className="h-4 w-4" /> Front desk
        </button>
      </div>

      {configOpen && (
        <div className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Week starts</span>
            <select className={inputCls + ' w-full'} value={cfg.weekStart} onChange={(e) => setWeekStart(Number(e.target.value) as 0 | 1)}>
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Hotel</span>
            <select className={inputCls + ' w-full'} value={cfg.hotelId} onChange={(e) => setCfg((s) => ({ ...s, hotelId: e.target.value }))}>
              <option value="all">All properties</option>
              {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Room type</span>
            <select className={inputCls + ' w-full'} value={cfg.roomType} onChange={(e) => setCfg((s) => ({ ...s, roomType: e.target.value }))}>
              <option value="all">All types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-5 rounded bg-sky-500/80" /> Confirmed</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-5 rounded bg-emerald-500/85" /> Checked in</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-5 rounded bg-slate-300" /> Vacant — click to book</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div style={{ minWidth: width }}>
          <div className="sticky top-0 z-20 flex border-b bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border)' }}>
            <div className="sticky left-0 z-30 flex shrink-0 items-end bg-[var(--bg-surface)] px-3 py-2 text-xs font-semibold" style={{ width: LABEL }}>Room</div>
            {days.map((d) => {
              const isToday = d === today;
              const wd = new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });
              return (
                <div key={d} className={`shrink-0 border-l px-1 py-2 text-center ${isToday ? 'bg-crimson-600/8' : ''}`} style={{ width: COL, borderColor: 'var(--border)' }}>
                  <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{wd}</p>
                  <p className={`font-display text-sm font-bold ${isToday ? 'text-crimson-700' : ''}`}>{d.slice(8, 10)}</p>
                </div>
              );
            })}
          </div>

          {!filteredRooms.length && (
            <p className="px-4 py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
              No rooms on the rack yet. Add a property under Inventory to generate rooms.
            </p>
          )}

          {groups.map((g) => (
            <div key={g.type}>
              <div className="flex border-b bg-slate-50/80" style={{ borderColor: 'var(--border)' }}>
                <div className="sticky left-0 z-10 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500" style={{ width: LABEL }}>
                  {g.type}
                  <span className="ml-1 font-normal normal-case text-slate-400">{g.rooms.length}</span>
                </div>
                {days.map((d) => {
                  const occupied = g.rooms.filter((r) => bookingOnRoom(r, d) && r.status !== 'ooo').length;
                  const sellable = g.rooms.filter((r) => r.status !== 'ooo').length;
                  const vacant = Math.max(0, sellable - occupied);
                  const tone = vacant === 0 ? 'bg-red-100 text-red-800' : vacant <= 2 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
                  return (
                    <div key={d} className={`shrink-0 border-l py-1 text-center text-[11px] font-bold ${tone}`} style={{ width: COL, borderColor: 'var(--border)' }}>
                      {vacant}
                    </div>
                  );
                })}
              </div>
              {g.rooms.map((room) => {
                const bars = barsForRoom(room);
                const ooo = room.status === 'ooo';
                return (
                  <div key={room.id} className="relative flex border-b" style={{ borderColor: 'var(--border)', minHeight: 40 }}>
                    <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r bg-[var(--bg-surface)] px-3" style={{ width: LABEL, borderColor: 'var(--border)' }}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{room.room_number}</p>
                        <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {room.hk_status || 'clean'}{ooo ? ' · OOO' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="relative flex" style={{ width: DAYS * COL }}>
                      {days.map((d) => {
                        const hit = bookingOnRoom(room, d);
                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={ooo || Boolean(hit)}
                            title={hit ? `${hit.guestName} · ${hit.pnr}` : ooo ? 'Out of order' : `Book ${room.room_number} on ${d}`}
                            className={`h-10 shrink-0 border-l ${d === today ? 'bg-crimson-600/5' : 'hover:bg-sky-50'} disabled:hover:bg-transparent`}
                            style={{ width: COL, borderColor: 'var(--border)' }}
                            onClick={() => {
                              if (ooo || hit) return;
                              onEmpty({
                                hotelId: room.hotel_id,
                                roomId: room.id,
                                roomNumber: room.room_number,
                                roomType: room.room_type,
                                checkIn: d,
                              });
                            }}
                          />
                        );
                      })}
                      {bars.map((b) => {
                        const out = b.checkOut || addDaysIso(b.checkIn, Math.max(1, b.nights || 1));
                        const from = Math.max(0, Math.round((new Date(`${b.checkIn}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000));
                        const to = Math.min(DAYS, Math.round((new Date(`${out}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000));
                        const span = to - from;
                        if (span <= 0) return null;
                        const match = !needle || b.pnr.toLowerCase().includes(needle) || b.guestName.toLowerCase().includes(needle);
                        const tone = b.status === 'checked-in' ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white';
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => onBooking(b)}
                            className={`absolute top-1.5 z-10 overflow-hidden rounded-md px-1.5 text-left text-[11px] font-semibold shadow-sm ${tone} ${match ? 'opacity-100' : 'opacity-25'}`}
                            style={{ left: from * COL + 3, width: span * COL - 6, height: 28 }}
                            title={`${b.guestName} · ${b.pnr} · ${b.checkIn} → ${out}`}
                          >
                            <span className="block truncate">{b.guestName || b.pnr}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {unassigned.length > 0 && (
            <div>
              <div className="flex border-b bg-amber-50/80" style={{ borderColor: 'var(--border)' }}>
                <div className="sticky left-0 z-10 bg-amber-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800" style={{ width: LABEL }}>Unassigned</div>
                <div className="flex-1 py-1.5 text-[11px] text-amber-800">Stays without a room number — assign from Front desk</div>
              </div>
              {unassigned.map((b) => {
                const out = b.checkOut || addDaysIso(b.checkIn, Math.max(1, b.nights || 1));
                const from = Math.max(0, Math.round((new Date(`${b.checkIn}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000));
                const to = Math.min(DAYS, Math.round((new Date(`${out}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000));
                const span = Math.max(1, to - from);
                const match = !needle || b.pnr.toLowerCase().includes(needle) || b.guestName.toLowerCase().includes(needle);
                return (
                  <div key={b.id} className="relative flex border-b" style={{ borderColor: 'var(--border)', minHeight: 40 }}>
                    <div className="sticky left-0 z-10 bg-[var(--bg-surface)] px-3 py-2 text-xs" style={{ width: LABEL }}>
                      <p className="font-semibold">{b.roomType || 'Stay'}</p>
                      <p style={{ color: 'var(--text-muted)' }}>{b.pnr}</p>
                    </div>
                    <div className="relative" style={{ width: DAYS * COL, height: 40 }}>
                      <button
                        type="button"
                        onClick={() => onBooking(b)}
                        className={`absolute top-1.5 rounded-md bg-amber-500 px-1.5 text-left text-[11px] font-semibold text-white ${match ? '' : 'opacity-25'}`}
                        style={{ left: from * COL + 3, width: span * COL - 6, height: 28 }}
                      >
                        <span className="block truncate">{b.guestName}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
