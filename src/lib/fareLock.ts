const KEY = 'ylt-fare-hold';
export const FARE_HOLD_MS = 10 * 60 * 1000;

export interface FareHold {
  busId: string;
  seats: string[];
  amount: number;
  expiresAt: number;
}

function read(): FareHold | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const hold = JSON.parse(raw) as FareHold;
    if (!hold?.expiresAt || hold.expiresAt <= Date.now()) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return hold;
  } catch {
    return null;
  }
}

export function getFareHold(): FareHold | null {
  return read();
}

export function startFareHold(busId: string, seats: string[], amount: number): FareHold {
  const hold: FareHold = { busId, seats, amount, expiresAt: Date.now() + FARE_HOLD_MS };
  sessionStorage.setItem(KEY, JSON.stringify(hold));
  return hold;
}

export function clearFareHold() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function remainingHoldMs(hold: FareHold | null): number {
  if (!hold) return 0;
  return Math.max(0, hold.expiresAt - Date.now());
}

export function formatHoldClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
