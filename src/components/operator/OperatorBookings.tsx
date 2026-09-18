import { useEffect, useState, useMemo } from 'react';
import { Bus, Car, Users, Bed, Search, Loader2, Ticket, MapPin, Calendar, Clock } from 'lucide-react';
import { formatINR } from '../../lib/format';
import { apiFetch } from '../../lib/api';

type BookingType = 'bus' | 'car' | 'carpool' | 'hotel';

interface UnifiedBooking {
  pnr: string;
  type: BookingType;
  operator: string;
  route: string;
  date: string;
  departure: string;
  seats?: string;
  total: number;
  guest?: string;
  status?: string;
  created_at: string;
}

const TYPE_META: Record<BookingType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  bus:     { label: 'Bus',      icon: Bus,    color: 'text-crimson-600', bg: 'bg-crimson-600/15' },
  car:     { label: 'Car',      icon: Car,    color: 'text-blue-500',    bg: 'bg-blue-500/15' },
  carpool: { label: 'Car Pool', icon: Users,  color: 'text-emerald-600', bg: 'bg-emerald-500/15' },
  hotel:   { label: 'Hotel',    icon: Bed,    color: 'text-amber-600',   bg: 'bg-amber-500/15' },
};

export default function OperatorBookings() {
  const [busBookings, setBusBookings] = useState<UnifiedBooking[]>([]);
  const [hotelBookings, setHotelBookings] = useState<UnifiedBooking[]>([]);
  const [carBookings, setCarBookings] = useState<UnifiedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingType | 'all'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [busRes, hotelRes] = await Promise.all([
          apiFetch('/api/bookings?all=1&limit=200').then(r => r.ok ? r.json() : []).catch(() => []),
          apiFetch('/api/hotel-bookings?all=1&limit=200').then(r => r.ok ? r.json() : []).catch(() => []),
        ]);
        const bus: UnifiedBooking[] = (Array.isArray(busRes) ? busRes : []).map((b: any) => ({
          pnr: b.pnr,
          type: 'bus' as const,
          operator: b.operator ?? '—',
          route: `${b.from_city ?? ''} → ${b.to_city ?? ''}`,
          date: b.travel_date ?? '',
          departure: b.departure_time ?? '',
          seats: Array.isArray(b.seats) ? `${b.seats.length} seat(s)` : (b.seats ?? ''),
          total: Number(b.total_amount) ?? 0,
          guest: b.user_identifier ?? b.contact_email ?? '',
          status: b.status ?? 'confirmed',
          created_at: b.created_at ?? '',
        }));
        const hotel: UnifiedBooking[] = (Array.isArray(hotelRes) ? hotelRes : []).map((b: any) => ({
          pnr: b.pnr,
          type: 'hotel' as const,
          operator: b.hotel_name ?? '—',
          route: b.city ?? '',
          date: b.check_in ?? '',
          departure: b.check_out ?? '',
          seats: `${b.rooms ?? 1} room(s) · ${b.guests ?? 1} guest(s)`,
          total: Number(b.total_amount) ?? 0,
          guest: b.guest_email ?? '',
          status: b.status ?? 'confirmed',
          created_at: b.created_at ?? '',
        }));
        setBusBookings(bus);
        setHotelBookings(hotel);
      } catch { /* keep empty */ }
      // Car / carpool bookings are stored in localStorage (no backend table yet).
      try {
        const local: any[] = JSON.parse(localStorage.getItem('ylt-my-bookings') ?? '[]');
        setCarBookings(local.map((b) => ({
          pnr: b.pnr,
          type: b.type === 'carpool' ? 'carpool' : 'car',
          operator: b.operator ?? '—',
          route: b.route ?? '',
          date: b.date ?? '',
          departure: b.departure ?? '',
          seats: b.seats ?? '',
          total: b.total ?? 0,
          guest: '',
          status: 'confirmed',
          created_at: b.created_at ?? '',
        })));
      } catch { setCarBookings([]); }
      setLoading(false);
    })();
  }, []);

  const all = useMemo(() => {
    const merged = [...busBookings, ...hotelBookings, ...carBookings];
    merged.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return merged;
  }, [busBookings, hotelBookings, carBookings]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? all : all.filter(b => b.type === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(b =>
        b.pnr.toLowerCase().includes(q) ||
        b.operator.toLowerCase().includes(q) ||
        b.route.toLowerCase().includes(q) ||
        (b.guest ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [all, filter, query]);

  const counts = useMemo(() => ({
    all: all.length,
    bus: busBookings.length,
    car: carBookings.filter(b => b.type === 'car').length,
    carpool: carBookings.filter(b => b.type === 'carpool').length,
    hotel: hotelBookings.length,
  }), [all, busBookings, carBookings, hotelBookings]);

  const totalRevenue = filtered.reduce((s, b) => s + (b.total || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Bookings</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>All bus, car, and hotel bookings across the platform.</p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { id: 'all', label: 'All', icon: Ticket, count: counts.all },
          { id: 'bus', label: 'Bus', icon: Bus, count: counts.bus },
          { id: 'car', label: 'Car', icon: Car, count: counts.car },
          { id: 'hotel', label: 'Hotel', icon: Bed, count: counts.hotel },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${filter === t.id ? 'border-crimson-500 bg-crimson-600/10 text-crimson-600' : 'hover:bg-[var(--bg-raised)]'}`}
            style={filter === t.id ? undefined : { color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
            <span className="rounded-full bg-[var(--bg-raised)] px-1.5 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{t.count}</span>
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search PNR, operator, route…"
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition focus:border-crimson-500 sm:w-64"
            style={{ backgroundColor: 'var(--bg-raised)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between rounded-xl border bg-[var(--bg-surface)] px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Revenue: <span className="text-crimson-600">{formatINR(totalRevenue)}</span></p>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-[var(--bg-surface)] p-10 text-center" style={{ borderColor: 'var(--border)' }}>
          <Ticket className="mx-auto h-10 w-10" style={{ color: 'var(--text-muted)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>No bookings found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((b) => {
            const meta = TYPE_META[b.type];
            return (
              <div key={`${b.type}-${b.pnr}`} className="flex items-center gap-4 rounded-xl border bg-[var(--bg-surface)] p-4 transition hover:border-crimson-500/40" style={{ borderColor: 'var(--border)' }}>
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.bg} ${meta.color}`}><meta.icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{b.operator}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    {b.status && b.status !== 'confirmed' && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-600">{b.status}</span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><MapPin className="h-3 w-3" /> {b.route || '—'}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.date || '—'}</span>
                    {b.departure && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.departure}</span>}
                    {b.seats && <span>{b.seats}</span>}
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>PNR: {b.pnr}</span>
                    {b.guest && <span>· {b.guest}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-gradient-crimson">{formatINR(b.total)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
