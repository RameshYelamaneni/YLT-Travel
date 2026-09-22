import { apiFetch } from './api';

export interface PricePromiseInput {
  route: string;
  travelDate: string;
  theirPrice: number;
  ourFare: number;
  contactEmail?: string;
  screenshot: File;
}

export async function submitPricePromise(input: PricePromiseInput): Promise<{ ok: boolean; message: string }> {
  const screenshot_b64 = await fileToB64(input.screenshot);
  const res = await apiFetch('/api/price-promise', {
    method: 'POST',
    body: JSON.stringify({
      route: input.route,
      travel_date: input.travelDate,
      their_price: input.theirPrice,
      our_fare: input.ourFare,
      contact_email: input.contactEmail || '',
      screenshot_b64,
      screenshot_mime: input.screenshot.type || 'image/jpeg',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    return { ok: false, message: String(data.error || 'Could not send your proof.') };
  }
  return { ok: true, message: String(data.message || "We'll review your proof.") };
}

export interface PromiseRow {
  id: string;
  route: string;
  travel_date: string;
  their_price: number;
  our_fare: number;
  contact_email: string;
  status: string;
  coupon_code: string;
  coupon_value: number;
  approve_mode: string;
  reject_reason: string;
  created_at: string;
  has_file: boolean;
}

export async function fetchPricePromises(): Promise<PromiseRow[]> {
  const res = await apiFetch('/api/price-promise');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(data.error || 'Could not load the queue.'));
  const rows = Array.isArray(data.promises) ? data.promises : [];
  return rows.map((r: any) => ({
    id: String(r.id || ''),
    route: String(r.route || ''),
    travel_date: String(r.travel_date || ''),
    their_price: Number(r.their_price || 0),
    our_fare: Number(r.our_fare || 0),
    contact_email: String(r.contact_email || ''),
    status: String(r.status || 'pending'),
    coupon_code: String(r.coupon_code || ''),
    coupon_value: Number(r.coupon_value || 0),
    approve_mode: String(r.approve_mode || ''),
    reject_reason: String(r.reject_reason || ''),
    created_at: String(r.created_at || ''),
    has_file: Boolean(r.has_file),
  }));
}

export async function fetchPromiseScreenshot(id: string): Promise<string> {
  const res = await apiFetch(`/api/price-promise?id=${encodeURIComponent(id)}&file=1`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(String(data.error || 'Could not open the screenshot.'));
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function reviewPricePromise(input: {
  id: string;
  action: 'approve' | 'reject';
  mode?: 'difference' | 'under50';
  reason?: string;
}): Promise<{ ok: boolean; message: string; coupon_code?: string; coupon_value?: number }> {
  const res = await apiFetch('/api/price-promise', {
    method: 'POST',
    body: JSON.stringify({
      action: input.action,
      id: input.id,
      mode: input.mode || 'difference',
      reason: input.reason || '',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) return { ok: false, message: String(data.error || 'Review failed.') };
  return {
    ok: true,
    message: String(data.message || 'Saved.'),
    coupon_code: data.coupon_code ? String(data.coupon_code) : undefined,
    coupon_value: data.coupon_value != null ? Number(data.coupon_value) : undefined,
  };
}

export interface MyReferral {
  code: string;
  credit: number;
  coupons: { code: string; amount: number; uses_left: number; note: string }[];
}

export async function fetchMyReferral(): Promise<MyReferral> {
  const res = await apiFetch('/api/referral');
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(String(data.error || 'Sign in to get a refer code.'));
  const coupons = Array.isArray(data.coupons) ? data.coupons : [];
  return {
    code: String(data.code || ''),
    credit: Number(data.credit || 50),
    coupons: coupons.map((c: any) => ({
      code: String(c.code || ''),
      amount: Number(c.amount || 0),
      uses_left: Number(c.uses_left || 0),
      note: String(c.note || ''),
    })),
  };
}

export type AppliedCode =
  | { kind: 'coupon'; code: string; amount: number }
  | { kind: 'referral'; code: string; credit: number }
  | { kind: 'none'; error: string };

export async function resolveCheckoutCode(code: string, email: string, seatFare: number): Promise<AppliedCode> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { kind: 'none', error: 'Enter a code.' };
  const quote = await apiFetch('/api/coupons/quote', {
    method: 'POST',
    body: JSON.stringify({ code: trimmed, email, seat_fare: seatFare }),
  });
  const q = await quote.json().catch(() => ({}));
  if (quote.ok && q.ok && Number(q.amount) > 0) {
    return { kind: 'coupon', code: trimmed, amount: Number(q.amount) };
  }
  const ref = await apiFetch('/api/referral', {
    method: 'POST',
    body: JSON.stringify({ action: 'check', code: trimmed }),
  });
  const r = await ref.json().catch(() => ({}));
  if (ref.ok && r.valid) {
    return { kind: 'referral', code: trimmed, credit: Number(r.credit || 50) };
  }
  return { kind: 'none', error: String(q.error || r.error || 'That code is not active.') };
}

function fileToB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const i = raw.indexOf(',');
      resolve(i >= 0 ? raw.slice(i + 1) : raw);
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read the screenshot.'));
    reader.readAsDataURL(file);
  });
}
