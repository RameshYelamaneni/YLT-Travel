import { useEffect, useState } from 'react';
import { Ticket, Calendar, MapPin, Clock, Download, Loader2, Bus, Car, Users, Wallet, Bed } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCheckoutStore } from '../store/checkoutStore';
import { useLastMileStore } from '../store/lastMileStore';
import { formatINR } from '../lib/format';
import { printTicket, downloadPkpass, type TicketData } from '../lib/ticket';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

interface BookingRecord {
  pnr: string;
  type: 'bus' | 'car' | 'carpool' | 'lastmile' | 'hotel';
  operator: string;
  route: string;
  date: string;
  departure: string;
  seats?: string;
  total: number;
  created_at: string;
}

const STORAGE_KEY = 'ylt-my-bookings';

function loadBookings(): BookingRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveBooking(b: BookingRecord) {
  const all = loadBookings();
  all.unshift(b);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50)));
}

export function recordBooking(b: BookingRecord) { saveBooking(b); }

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) { setBookings([]); setLoading(false); return; }
      try {
        const res = await fetch(`${API}/bookings.php?user=${encodeURIComponent(user.email)}`);
        const rows = await res.json();
        if (Array.isArray(rows)) {
          setBookings(rows.map((b: any) => ({
            pnr: b.pnr,
            type: 'bus' as const,
            operator: b.operator,
            route: `${b.from_city} → ${b.to_city}`,
            date: b.travel_date,
            departure: b.departure_time,
            seats: Array.isArray(b.seats) ? `${b.seats.length} seat(s)` : (b.seats ?? ''),
            total: Number(b.total_amount) ?? 0,
            created_at: b.created_at,
          })));
        }
      } catch { /* keep empty */ }
      setLoading(false);
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="container-fluid py-20 text-center">
        <Ticket className="mx-auto h-10 w-10" style={{ color: 'var(--text-muted)' }} />
        <h1 className="mt-4 font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Sign in to view your bookings</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Your booking history will appear here once you sign in.</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-10">
      <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Bookings</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''} for {user.email}</p>

      {loading ? (
        <div className="mt-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
      ) : bookings.length === 0 ? (
        <div className="mt-10 surface p-10 text-center">
          <Ticket className="mx-auto h-10 w-10" style={{ color: 'var(--text-muted)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>No bookings yet. Book a bus, car, or car pool to see it here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bookings.map((b) => {
            const Icon = b.type === 'bus' ? Bus : b.type === 'car' ? Car : b.type === 'carpool' ? Users : b.type === 'hotel' ? Bed : Car;
            return (
              <div key={b.pnr} className="surface-raised flex items-center gap-4 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-crimson-600/15 text-crimson-600"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{b.operator}</p>
                    <span className="rounded-full bg-[var(--bg-raised)] px-2 py-0.5 text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{b.type}</span>
                  </div>
                  <p className="mt-0.5 text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}><MapPin className="h-3 w-3" /> {b.route}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.departure}</span>
                    {b.seats && <span>{b.seats}</span>}
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>PNR: {b.pnr}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-gradient-crimson">{formatINR(b.total)}</p>
                  <button onClick={() => printTicket(buildTicketFromRecord(b))} className="mt-1 text-xs text-crimson-600 hover:text-crimson-500"><Download className="inline h-3.5 w-3.5" /> PDF</button>
                  <button onClick={() => downloadPkpass(buildTicketFromRecord(b))} className="mt-1 text-xs text-crimson-600 hover:text-crimson-500"><Wallet className="inline h-3.5 w-3.5" /> Wallet</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function buildTicketFromRecord(b: BookingRecord): TicketData {
  return {
    pnr: b.pnr,
    type: b.type,
    operator: b.operator,
    route: b.route,
    date: b.date,
    departure: b.departure,
    seats: b.seats,
    amount: b.total,
    taxes: 0,
    total: b.total,
    qrData: b.pnr,
  };
}
