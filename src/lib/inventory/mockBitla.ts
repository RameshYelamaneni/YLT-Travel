/**
 * Bitla / TicketSimply-style CRS contract.
 * YLT never owns seat inventory. This mock implements the same operations
 * redBus uses against Bitla: search → layout → lock → book → cancel.
 * Production swaps MockBitlaCrs for a real HTTP Bitla client.
 */

export type CrsSeatStatus = 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'FEMALE_RESERVED' | 'BLOCKED';

export interface CrsSeat {
  seatId: string;
  seatNumber: string;
  deck: 'LOWER' | 'UPPER';
  fare: number;
  status: CrsSeatStatus;
  genderRule: 'NONE' | 'FEMALE_ONLY';
}

export interface CrsTrip {
  tripId: string;
  operator: string;
  serviceNumber: string;
  busType: string;
  from: string;
  to: string;
  date: string;
  departure: string;
  arrival: string;
  availableSeats: number;
  fareFrom: number;
}

export interface CrsLock {
  holdToken: string;
  tripId: string;
  seatIds: string[];
  expiresAt: string;
  channel: string;
}

export interface CrsBooking {
  pnr: string;
  tripId: string;
  seatIds: string[];
  channel: string;
  status: 'CONFIRMED' | 'CANCELLED';
  amount: number;
  createdAt: string;
}

type TripState = CrsTrip & { seats: CrsSeat[] };

const CHANNELS = ['YLT', 'REDBUS', 'ABHIBUS'] as const;

function seedTrip(from: string, to: string, date: string, i: number): TripState {
  const operators = ['YLT Express', 'KSRTC (Karnataka)', 'VRL Travels', 'Orange Tours', 'APSRTC'];
  const depH = 18 + (i % 6);
  const tripId = `BITLA-${date.replace(/-/g, '')}-${from.slice(0, 3).toUpperCase()}${to.slice(0, 3).toUpperCase()}-${i}`;
  const seats: CrsSeat[] = [];
  for (let n = 1; n <= 20; n++) {
    const booked = n % 7 === 0;
    seats.push({
      seatId: `${tripId}-L${n}`,
      seatNumber: `L${n}`,
      deck: 'LOWER',
      fare: 850 + (n <= 6 ? 80 : 0),
      status: booked ? 'BOOKED' : n <= 4 ? 'FEMALE_RESERVED' : 'AVAILABLE',
      genderRule: n <= 4 ? 'FEMALE_ONLY' : 'NONE',
    });
  }
  for (let n = 1; n <= 16; n++) {
    const booked = n % 5 === 0;
    seats.push({
      seatId: `${tripId}-U${n}`,
      seatNumber: `U${n}`,
      deck: 'UPPER',
      fare: 820,
      status: booked ? 'BOOKED' : 'AVAILABLE',
      genderRule: 'NONE',
    });
  }
  const availableSeats = seats.filter((s) => s.status === 'AVAILABLE' || s.status === 'FEMALE_RESERVED').length;
  return {
    tripId,
    operator: operators[i % operators.length],
    serviceNumber: `${2010 + i}${from.slice(0, 3).toUpperCase()}`,
    busType: i % 2 ? 'Volvo A/C Sleeper (2+1)' : 'Bharat Benz A/C Sleeper',
    from,
    to,
    date,
    departure: `${String(depH).padStart(2, '0')}:30`,
    arrival: `${String((depH + 8) % 24).padStart(2, '0')}:15`,
    availableSeats,
    fareFrom: 820,
    seats,
  };
}

class MockBitlaCrs {
  private trips = new Map<string, TripState>();
  private locks = new Map<string, CrsLock>();
  private bookings: CrsBooking[] = [];
  readonly provider = 'mock';
  readonly vendor = 'Bitla / TicketSimply (simulator)';

  search(from: string, to: string, date: string): CrsTrip[] {
    const key = `${from}|${to}|${date}`;
    let list = [...this.trips.values()].filter((t) => t.from === from && t.to === to && t.date === date);
    if (!list.length) {
      list = Array.from({ length: 5 }, (_, i) => seedTrip(from, to, date, i));
      list.forEach((t) => this.trips.set(t.tripId, t));
    }
    this.reapLocks();
    return list.map((t) => this.publicTrip(t));
  }

  layout(tripId: string) {
    this.reapLocks();
    const t = this.trips.get(tripId);
    if (!t) return null;
    return { trip: this.publicTrip(t), seats: t.seats };
  }

  lock(tripId: string, seatIds: string[], channel = 'YLT'): { ok: true; lock: CrsLock } | { ok: false; code: string; message: string } {
    this.reapLocks();
    const t = this.trips.get(tripId);
    if (!t) return { ok: false, code: 'TRIP_NOT_FOUND', message: 'Trip not found in CRS.' };
    for (const id of seatIds) {
      const seat = t.seats.find((s) => s.seatId === id);
      if (!seat) return { ok: false, code: 'SEAT_NOT_FOUND', message: 'Seat not on this trip.' };
      if (seat.status === 'BOOKED' || seat.status === 'LOCKED' || seat.status === 'BLOCKED') {
        return { ok: false, code: 'SEAT_NO_LONGER_AVAILABLE', message: `Seat ${seat.seatNumber} is no longer available in Bitla.` };
      }
    }
    const holdToken = `HLD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const lock: CrsLock = {
      holdToken,
      tripId,
      seatIds,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      channel,
    };
    this.locks.set(holdToken, lock);
    seatIds.forEach((id) => {
      const seat = t.seats.find((s) => s.seatId === id)!;
      seat.status = 'LOCKED';
    });
    t.availableSeats = t.seats.filter((s) => s.status === 'AVAILABLE' || s.status === 'FEMALE_RESERVED').length;
    return { ok: true, lock };
  }

  release(holdToken: string) {
    const lock = this.locks.get(holdToken);
    if (!lock) return { ok: false, code: 'HOLD_NOT_FOUND', message: 'Hold token unknown or already released.' };
    this.unlock(lock);
    this.locks.delete(holdToken);
    return { ok: true };
  }

  book(holdToken: string, channel = 'YLT'): { ok: true; booking: CrsBooking } | { ok: false; code: string; message: string } {
    this.reapLocks();
    const lock = this.locks.get(holdToken);
    if (!lock) return { ok: false, code: 'HOLD_EXPIRED', message: 'Hold expired. Refresh Bitla inventory.' };
    const t = this.trips.get(lock.tripId);
    if (!t) return { ok: false, code: 'TRIP_NOT_FOUND', message: 'Trip missing in CRS.' };
    const amount = lock.seatIds.reduce((s, id) => s + (t.seats.find((x) => x.seatId === id)?.fare ?? 0), 0);
    const booking: CrsBooking = {
      pnr: `BTLA${Math.floor(100000 + Math.random() * 900000)}`,
      tripId: lock.tripId,
      seatIds: lock.seatIds,
      channel,
      status: 'CONFIRMED',
      amount,
      createdAt: new Date().toISOString(),
    };
    lock.seatIds.forEach((id) => {
      const seat = t.seats.find((s) => s.seatId === id);
      if (seat) seat.status = 'BOOKED';
    });
    this.locks.delete(holdToken);
    this.bookings.unshift(booking);
    t.availableSeats = t.seats.filter((s) => s.status === 'AVAILABLE' || s.status === 'FEMALE_RESERVED').length;
    return { ok: true, booking };
  }

  cancel(pnr: string) {
    const b = this.bookings.find((x) => x.pnr === pnr);
    if (!b || b.status === 'CANCELLED') return { ok: false, code: 'BOOKING_NOT_FOUND', message: 'PNR not found in CRS.' };
    const t = this.trips.get(b.tripId);
    b.status = 'CANCELLED';
    b.seatIds.forEach((id) => {
      const seat = t?.seats.find((s) => s.seatId === id);
      if (seat) seat.status = 'AVAILABLE';
    });
    if (t) t.availableSeats = t.seats.filter((s) => s.status === 'AVAILABLE' || s.status === 'FEMALE_RESERVED').length;
    return { ok: true, booking: b };
  }

  listBookings() {
    return this.bookings;
  }

  listLocks() {
    this.reapLocks();
    return [...this.locks.values()];
  }

  dashboard(from: string, to: string, date: string) {
    const trips = this.search(from, to, date);
    const locks = this.listLocks();
    const bookings = this.bookings.filter((b) => trips.some((t) => t.tripId === b.tripId));
    return {
      provider: this.provider,
      vendor: this.vendor,
      inventoryOwner: 'Bitla CRS (not YLT database)',
      channels: CHANNELS,
      trips,
      locks,
      bookings,
      stats: {
        trips: trips.length,
        available: trips.reduce((s, t) => s + t.availableSeats, 0),
        booked: bookings.filter((b) => b.status === 'CONFIRMED').reduce((s, b) => s + b.seatIds.length, 0),
        locked: locks.reduce((s, l) => s + l.seatIds.length, 0),
      },
    };
  }

  private publicTrip(t: TripState): CrsTrip {
    const { seats: _s, ...trip } = t;
    return trip;
  }

  private unlock(lock: CrsLock) {
    const t = this.trips.get(lock.tripId);
    if (!t) return;
    lock.seatIds.forEach((id) => {
      const seat = t.seats.find((s) => s.seatId === id);
      if (seat && seat.status === 'LOCKED') seat.status = seat.genderRule === 'FEMALE_ONLY' ? 'FEMALE_RESERVED' : 'AVAILABLE';
    });
    t.availableSeats = t.seats.filter((s) => s.status === 'AVAILABLE' || s.status === 'FEMALE_RESERVED').length;
  }

  private reapLocks() {
    const now = Date.now();
    for (const [token, lock] of this.locks) {
      if (new Date(lock.expiresAt).getTime() < now) {
        this.unlock(lock);
        this.locks.delete(token);
      }
    }
  }
}

export const bitlaCrs = new MockBitlaCrs();
export const CRS_CHANNELS = CHANNELS;
