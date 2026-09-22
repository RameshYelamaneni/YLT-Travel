import { useEffect, useState } from 'react';
import { apiFetch } from './api';
import { formatINR } from './format';

/** Admin default. Real rupees off our listed seat fare, not a competitor price. */
export const DEFAULT_SAVER_RUPEES = 50;
export const DEFAULT_PROMISE_CAP = 150;
export const DEFAULT_REFERRAL_CREDIT = 50;

const PERCENT_CAP = 0.08;
const FLOOR = 0.8;

export interface SaverQuote {
  listed: number;
  discount: number;
  price: number;
  label: string;
}

export interface SeatSaverQuote extends SaverQuote {
  rows: SaverQuote[];
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Discount = min(configured ₹, 8% of fare, room above 80% of fare).
 * The label always states the rupees actually taken off.
 */
export function quoteSaver(listedFare: number, saverRupees = DEFAULT_SAVER_RUPEES): SaverQuote {
  const listed = Math.max(0, Math.round(Number(listedFare) || 0));
  const configured = clampInt(saverRupees, 0, 500, DEFAULT_SAVER_RUPEES);
  const byPercent = Math.floor(listed * PERCENT_CAP);
  const byFloor = listed - Math.ceil(listed * FLOOR);
  const discount = Math.max(0, Math.min(configured, byPercent, byFloor, listed));
  const price = listed - discount;
  const label = discount > 0 ? `YLT Saver — ${formatINR(discount)} off this coach` : '';
  return { listed, discount, price, label };
}

export function quoteSeats(prices: number[], saverRupees = DEFAULT_SAVER_RUPEES): SeatSaverQuote {
  const rows = prices.map((p) => quoteSaver(p, saverRupees));
  const listed = rows.reduce((s, r) => s + r.listed, 0);
  const price = rows.reduce((s, r) => s + r.price, 0);
  const discount = listed - price;
  const same = rows.length > 0 && rows.every((r) => r.discount === rows[0].discount);
  let label = '';
  if (discount > 0 && same && rows.length > 1 && rows[0].discount > 0) {
    label = `YLT Saver — ${formatINR(rows[0].discount)} off each seat on this coach`;
  } else if (discount > 0) {
    label = `YLT Saver — ${formatINR(discount)} off this coach`;
  }
  return { listed, price, discount, label, rows };
}

type SaverSettings = { rupees: number; promiseCap: number; referralCredit: number };

let settings: SaverSettings = {
  rupees: DEFAULT_SAVER_RUPEES,
  promiseCap: DEFAULT_PROMISE_CAP,
  referralCredit: DEFAULT_REFERRAL_CREDIT,
};
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function emit() {
  listeners.forEach((fn) => fn());
}

export function saverSettings(): SaverSettings {
  return settings;
}

export function applySaverSettings(data: {
  ylt_saver_rupees?: unknown;
  price_promise_cap?: unknown;
  referral_credit?: unknown;
}) {
  settings = {
    rupees: clampInt(data.ylt_saver_rupees, 0, 500, settings.rupees),
    promiseCap: clampInt(data.price_promise_cap, 0, 2000, settings.promiseCap),
    referralCredit: clampInt(data.referral_credit, 0, 500, settings.referralCredit),
  };
  emit();
}

export function loadSaverSettings(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await apiFetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();
      applySaverSettings(data);
    } catch {
      /* keep defaults */
    }
  })();
  return inflight;
}

export function useSaverSettings(): SaverSettings {
  const [, bump] = useState(0);
  useEffect(() => {
    void loadSaverSettings();
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return settings;
}
