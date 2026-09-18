import { useEffect, useState } from 'react';
import { Ticket, Calendar, MapPin, Clock, Loader2, Bus, Car, Users, Bed, Star } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCheckoutStore } from '../store/checkoutStore';
import { useLastMileStore } from '../store/lastMileStore';
import { formatINR } from '../lib/format';
import { type TicketData } from '../lib/ticket';
import TicketActions from './TicketActions';
import { useNav } from '../store/nav';

import { apiFetch } from '../lib/api';

export type BookingRecord = {
  pnr: string;
  type: 'bus' | 'car' | 'carpool' | 'lastmile' | 'hotel';
  operator: string;
  route: string;
  date: string;
  departure: string;
  seats?: string;
  total: number;
  created_at: string;
  status?: 'confirmed' | 'cancelled' | 'rescheduled' | 'checked-out' | 'checked-in' | 'completed';
  feedback_token?: string | null;
  feedback_status?: string | null;
};

const STORAGE_KEY = 'ylt-my-bookings';

export function loadBookings(): BookingRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveBooking(b: BookingRecord) {
  const all = loadBookings();
  all.unshift(b);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50)));
}

export function recordBooking(b: BookingRecord) { saveBooking(b); }

function formatSeats(seats: unknown): string {
  if (Array.isArray(seats)) return `${seats.length} seat(s)`;
  if (typeof seats === 'string' && seats.startsWith('[')) {
    try {
      const arr = JSON.parse(seats);
      if (Array.isArray(arr)) return `${arr.length} seat(s)`;
    } catch { /* keep raw */ }
  }
  return String(seats ?? '');
}

export function findBookingByPnr(pnr: string): BookingRecord | null {
  const q = pnr.trim().toLowerCase();
  if (!q) return null;
  return loadBookings().find((b) => b.pnr.toLowerCase() === q) ?? null;
}

export function updateBookingStatus(pnr: string, status: NonNullable<BookingRecord['status']>) {
  const all = loadBookings().map((b) => (b.pnr.toLowerCase() === pnr.toLowerCase() ? { ...b, status } : b));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export default function MyBookingsPage() {
  const { user } = useAuth();
  const { go } = useNav();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratePrompt, setRatePrompt] = useState<BookingRecord | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) { setBookings([]); setLoading(false); return; }
      try {
        const res = await apiFetch(`/api/bookings?user=${encodeURIComponent(user.email)}`);
        const rows = await res.json();
        const pendingRes = await apiFetch(`/api/feedback.php?email=${encodeURIComponent(user.email)}`);
        const pendingData = await pendingRes.json().catch(() => ({ pending: [] }));
        const pending: any[] = pendingData.pending ?? [];
        const local = loadBookings();
        const mapped: BookingRecord[] = Array.isArray(rows) ? rows.map((b: any) => {
          const p = pending.find((x) => x.pnr === b.pnr);
          return {
            pnr: b.pnr,
            type: (b.type === 'hotel' ? 'hotel' : 'bus') as BookingRecord['type'],
            operator: b.operator,
            route: b.from_city && b.to_city ? `${b.from_city} → ${b.to_city}` : (b.route ?? ''),
            date: b.travel_date ?? b.date,
            departure: b.departure_time ?? b.departure ?? '',
            seats: formatSeats(b.seats),
            total: Number(b.total_amount ?? b.total) ?? 0,
            created_at: b.created_at,
            status: b.status,
            feedback_token: p?.token || b.feedback_token,
            feedback_status: b.feedback_status,
          };
        }) : [];
        const seen = new Set(mapped.map((b) => b.pnr));
        const all = [...mapped, ...local.filter((b) => !seen.has(b.pnr))];
        setBookings(all);
        const first = all.find((b) => b.feedback_token && b.feedback_status !== 'rated');
        const seenKey = 'ylt-rate-prompt';
        if (first && sessionStorage.getItem(seenKey) !== first.pnr) {
          sessionStorage.setItem(seenKey, first.pnr);
          setRatePrompt(first);
        }
      } catch {
        setBookings(loadBookings());
      }
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
              <div key={b.pnr} className="surface-raised flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
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
                <div className="flex flex-col items-end gap-2 text-right">
                  <p className="font-display text-lg font-bold text-gradient-crimson">{formatINR(b.total)}</p>
                  {b.feedback_token && b.feedback_status !== 'rated' && (
                    <button className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-3 py-1 text-[11px] font-bold text-gold-800" onClick={() => go({ name: 'feedback', token: b.feedback_token! })}>
                      <Star className="h-3 w-3" /> Rate this {b.type === 'hotel' ? 'stay' : 'trip'}
                    </button>
                  )}
                  <TicketActions ticket={{ ...buildTicketFromRecord(b), contactEmail: user.email }} compact />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {ratePrompt?.feedback_token && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <Star className="mx-auto h-8 w-8 text-gold-500" />
            <h2 className="mt-3 font-display text-lg font-bold">How was your {ratePrompt.type === 'hotel' ? 'stay' : 'trip'}?</h2>
            <p className="mt-1 text-sm text-slate-600">{ratePrompt.route || ratePrompt.operator} · {ratePrompt.pnr}</p>
            <button className="btn-primary mt-5 w-full" onClick={() => go({ name: 'feedback', token: ratePrompt.feedback_token! })}>Rate now</button>
            <button className="mt-2 text-sm text-slate-500" onClick={() => setRatePrompt(null)}>Later</button>
          </div>
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
