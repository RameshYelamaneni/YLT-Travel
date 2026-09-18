import { useEffect, useMemo, useState } from 'react';
import {
  Calendar, ConciergeBell, DollarSign, Globe2, LogIn, LogOut, Settings2, Users, X,
} from 'lucide-react';
import { Sparkline } from '../erp/ui';
import {
  fmtINR, type HotelAsset, type HotelBookingRecord, type HotelGuest, type HotelRoom,
} from '../../store/partnerHotelStore';
import {
  guestOrigins, todayIso, weekRollup, weekSeries,
} from '../../lib/pmsMetrics';

const QV_KEY = 'ylt_pms_quick_view';

type WidgetId = 'arrivals' | 'departures' | 'stayovers' | 'occupancy' | 'revenue' | 'week' | 'origins' | 'properties';

const WIDGETS: { id: WidgetId; label: string; hint: string }[] = [
  { id: 'arrivals', label: 'Arrivals today', hint: 'Due in' },
  { id: 'departures', label: 'Departures today', hint: 'Due out' },
  { id: 'stayovers', label: 'Stay overs', hint: 'In-house, not leaving' },
  { id: 'occupancy', label: 'Occupancy', hint: 'Rooms sold tonight' },
  { id: 'revenue', label: 'Stay revenue', hint: 'Tonight’s room charge' },
  { id: 'week', label: 'This week', hint: 'Seven-day occupancy' },
  { id: 'origins', label: 'Guest cities', hint: 'From CRM city' },
  { id: 'properties', label: 'Properties', hint: 'Assigned hotels' },
];

type Qv = Record<WidgetId, boolean>;

const QV_DEFAULT: Qv = {
  arrivals: true, departures: true, stayovers: true, occupancy: true,
  revenue: true, week: true, origins: true, properties: true,
};

function readQv(): Qv {
  try {
    const raw = localStorage.getItem(QV_KEY);
    if (!raw) return { ...QV_DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Qv>;
    return { ...QV_DEFAULT, ...parsed };
  } catch {
    return { ...QV_DEFAULT };
  }
}

export default function HotelDashboard({
  hotels, rooms, bookings, arrivals, inhouse, departures, occupancyPct, guests, onWalkIn, onOpenStay,
}: {
  hotels: HotelAsset[];
  rooms: HotelRoom[];
  bookings: HotelBookingRecord[];
  arrivals: HotelBookingRecord[];
  inhouse: HotelBookingRecord[];
  departures: HotelBookingRecord[];
  occupancyPct: number;
  guests: HotelGuest[];
  onWalkIn: () => void;
  onOpenStay: (b: HotelBookingRecord) => void;
}) {
  const [qv, setQv] = useState<Qv>(readQv);
  const [gear, setGear] = useState(false);
  const today = todayIso();

  useEffect(() => {
    try { localStorage.setItem(QV_KEY, JSON.stringify(qv)); } catch { /* ignore */ }
  }, [qv]);

  const stayovers = useMemo(
    () => inhouse.filter((b) => b.checkIn < today && b.checkOut > today),
    [inhouse, today],
  );
  const series = useMemo(() => weekSeries(rooms, bookings, today), [rooms, bookings, today]);
  const week = useMemo(() => weekRollup(series, bookings, series[0]?.date || today, today), [series, bookings, today]);
  const todayOcc = series.find((d) => d.date === today) || { occupancy_pct: occupancyPct, occupied: 0, revenue: 0 };
  const occ = occupancyPct || todayOcc.occupancy_pct;
  const todayRev = todayOcc.revenue;
  const origins = useMemo(() => guestOrigins(guests), [guests]);
  const weekHasData = series.some((d) => d.occupied > 0 || d.revenue > 0);
  const spark = series.map((d) => d.occupancy_pct);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Live from your room rack and stays. Widgets you hide here stay off until you turn them back on.
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost text-sm" onClick={onWalkIn}>Walk-in</button>
          <button type="button" className="btn-ghost text-sm" onClick={() => setGear((v) => !v)} aria-expanded={gear}>
            <Settings2 className="h-4 w-4" /> Quick view
          </button>
        </div>
      </div>

      {gear && (
        <>
          <button type="button" className="erp-backdrop fixed inset-0 z-40" aria-label="Close quick view" onClick={() => setGear(false)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto border-l bg-[var(--bg-surface)] p-5 shadow-xl" style={{ borderColor: 'var(--border)' }}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-bold">Quick view settings</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Choose what this dashboard shows on this device.</p>
              </div>
              <button type="button" className="btn-ghost px-2" onClick={() => setGear(false)} aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Dashboard</p>
            <ul className="space-y-2">
              {WIDGETS.map((w) => (
                <li key={w.id}>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--border)' }}>
                    <span>
                      <span className="block font-semibold">{w.label}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{w.hint}</span>
                    </span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-crimson-600"
                      checked={qv[w.id]}
                      onChange={(e) => setQv((s) => ({ ...s, [w.id]: e.target.checked }))}
                    />
                  </label>
                </li>
              ))}
            </ul>
            <button type="button" className="mt-4 text-xs font-semibold text-crimson-700" onClick={() => setQv({ ...QV_DEFAULT })}>Reset widgets</button>
          </aside>
        </>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {qv.arrivals && (
          <TodayStat label="Arrivals" value={String(arrivals.length)} sub="Due in today" icon={LogIn} tone="blue" />
        )}
        {qv.departures && (
          <TodayStat label="Departures" value={String(departures.length)} sub="Due out today" icon={LogOut} tone="amber" />
        )}
        {qv.stayovers && (
          <TodayStat label="Stay overs" value={String(stayovers.length)} sub={`${inhouse.length} in-house`} icon={Users} tone="green" />
        )}
        {qv.occupancy && (
          <div className="rounded-2xl border bg-[var(--bg-surface)] p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Occupancy</p>
            <div className="mt-2 flex items-center gap-3">
              <OccRing pct={occ} />
              <div>
                <p className="font-display text-xl font-bold">{occ}%</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {todayOcc.occupied}/{rooms.length || 0} rooms tonight
                </p>
              </div>
            </div>
          </div>
        )}
        {qv.revenue && (
          <TodayStat label="Tonight’s revenue" value={`₹${fmtINR(todayRev)}`} sub="Room charge for tonight" icon={DollarSign} tone="crimson" />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        {qv.week && (
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display font-bold"><Calendar className="h-4 w-4 text-crimson-600" /> This week</h3>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{series[0]?.date} → {today}</span>
            </div>
            {weekHasData ? (
              <>
                <Sparkline data={spark} height={64} />
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Mini label="Occupancy" value={`${week.occupancy_pct}%`} />
                  <Mini label="Occupancy nights" value={String(week.occupancy_nights)} />
                  <Mini label="Booked" value={String(week.booked)} />
                  <Mini label="Cancelled" value={String(week.cancelled)} />
                  <Mini label="Average stay" value={week.avg_stay ? `${week.avg_stay} n` : '—'} />
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Week trend appears after stays are posted for these dates. Add a walk-in or wait for a confirmed booking.
              </p>
            )}
          </div>
        )}

        {qv.origins && (
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <h3 className="mb-3 flex items-center gap-2 font-display font-bold"><Globe2 className="h-4 w-4 text-crimson-600" /> Guest cities</h3>
            {origins.length ? (
              <ul className="space-y-2">
                {origins.map((o) => {
                  const max = origins[0].count || 1;
                  return (
                    <li key={o.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium">{o.label}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{o.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-crimson-600" style={{ width: `${(o.count / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Cities fill in from guest profiles (CRM city). Nothing is invented when the field is empty.
              </p>
            )}
          </div>
        )}
      </div>

      {qv.properties && hotels.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {hotels.map((h) => (
            <div key={h.id} className="w-44 shrink-0 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
              <div className="h-20 bg-[var(--bg-raised)]">
                {h.photo ? <img src={h.photo} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs" style={{ color: 'var(--text-muted)' }}>No photo</div>}
              </div>
              <div className="px-2 py-1.5">
                <p className="truncate text-xs font-semibold">{h.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{h.occupancyPct}% · ₹{fmtINR(h.monthlyRevenue)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <DeskList title="Arrivals" items={arrivals} empty="No arrivals in the database for today." onOpen={onOpenStay} />
        <DeskList title="In-house" items={inhouse} empty="No guests in-house." onOpen={onOpenStay} />
        <DeskList title="Departures" items={departures} empty="No departures due." onOpen={onOpenStay} />
      </div>
    </div>
  );
}

function TodayStat({ label, value, sub, icon: Icon, tone }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'crimson' | 'green' | 'blue' | 'amber';
}) {
  const tones: Record<string, string> = {
    crimson: 'text-crimson-600 bg-crimson-500/10',
    green: 'text-emerald-600 bg-emerald-500/10',
    blue: 'text-blue-600 bg-blue-500/10',
    amber: 'text-amber-600 bg-amber-500/10',
  };
  return (
    <div className="rounded-2xl border bg-[var(--bg-surface)] p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="mt-1 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {sub && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--bg-raised)] px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </div>
  );
}

function OccRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle
        cx="32" cy="32" r={r} fill="none" stroke="#cd2c40" strokeWidth="7"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)"
      />
      <text x="32" y="36" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">{pct}%</text>
    </svg>
  );
}

function DeskList({ title, items, empty, onOpen }: {
  title: string; items: HotelBookingRecord[]; empty: string; onOpen: (b: HotelBookingRecord) => void;
}) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
      <h3 className="mb-3 flex items-center gap-2 font-display font-bold">
        <ConciergeBell className="h-4 w-4 text-crimson-600" /> {title}
      </h3>
      {items.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{empty}</p> : (
        <ul className="space-y-2">
          {items.slice(0, 8).map((b) => (
            <li key={b.id}>
              <button type="button" className="w-full rounded-xl border p-3 text-left hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)' }} onClick={() => onOpen(b)}>
                <p className="text-sm font-semibold">{b.guestName}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{b.pnr} · {b.hotelName} · {b.roomNumber || b.roomType}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
