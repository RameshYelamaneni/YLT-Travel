import type { HotelBookingRecord, HotelGuest, HotelRoom } from '../store/partnerHotelStore';

export function todayIso(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dateRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDaysIso(start, i));
}

export function stayActive(b: HotelBookingRecord): boolean {
  return b.status !== 'cancelled';
}

/** Night of `d` is occupied when check-in <= d < check-out. */
export function stayCoversNight(b: HotelBookingRecord, d: string): boolean {
  if (!stayActive(b)) return false;
  const out = b.checkOut || addDaysIso(b.checkIn, Math.max(1, b.nights || 1));
  return Boolean(b.checkIn) && b.checkIn <= d && d < out;
}

export function nightlyRate(b: HotelBookingRecord): number {
  const n = Math.max(1, Number(b.nights || 1));
  return Number(b.amount || 0) / n;
}

export function stayKey(b: HotelBookingRecord): string {
  return b.room_id || `${b.hotel_id || b.hotelName}|${b.roomNumber || b.id}`;
}

export interface DayOcc {
  date: string;
  occupancy_pct: number;
  occupied: number;
  revenue: number;
}

export function occupancyForDate(rooms: HotelRoom[], bookings: HotelBookingRecord[], d: string, hotelId?: string): DayOcc {
  const rack = hotelId && hotelId !== 'all' ? rooms.filter((r) => r.hotel_id === hotelId) : rooms;
  const live = bookings.filter((b) => stayCoversNight(b, d) && (!hotelId || hotelId === 'all' || b.hotel_id === hotelId));
  const keys = new Set(live.map(stayKey));
  const occupied = rack.length ? Math.min(rack.length, keys.size || live.length) : live.length;
  const denom = rack.length || Math.max(1, occupied);
  const revenue = live.reduce((s, b) => s + nightlyRate(b), 0);
  return {
    date: d,
    occupancy_pct: Math.min(100, Math.round((100 * occupied) / denom)),
    occupied,
    revenue,
  };
}

export function weekSeries(rooms: HotelRoom[], bookings: HotelBookingRecord[], end = todayIso(), hotelId?: string): DayOcc[] {
  const start = addDaysIso(end, -6);
  return dateRange(start, 7).map((d) => occupancyForDate(rooms, bookings, d, hotelId));
}

export function weekRollup(series: DayOcc[], bookings: HotelBookingRecord[], start: string, end: string) {
  const inWeek = bookings.filter((b) => b.checkIn >= start && b.checkIn <= end);
  const cancelled = inWeek.filter((b) => b.status === 'cancelled').length;
  const booked = inWeek.filter((b) => b.status !== 'cancelled').length;
  const nights = series.reduce((s, d) => s + d.occupied, 0);
  const avgOcc = series.length ? Math.round(series.reduce((s, d) => s + d.occupancy_pct, 0) / series.length) : 0;
  const stayNights = inWeek.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + Math.max(1, Number(b.nights || 1)), 0);
  const avgStay = booked ? Math.round((stayNights / booked) * 10) / 10 : 0;
  const revenue = series.reduce((s, d) => s + d.revenue, 0);
  return { occupancy_pct: avgOcc, occupancy_nights: nights, booked, cancelled, avg_stay: avgStay, revenue };
}

export function guestOrigins(guests: HotelGuest[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  guests.forEach((g) => {
    const label = (g.city || '').trim();
    if (!label) return;
    map.set(label, (map.get(label) || 0) + 1);
  });
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
