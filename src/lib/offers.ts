import { apiFetch } from './api';

export interface YltOffer {
  id: string;
  promo_code: string;
  title: string;
  description: string;
  discount_value: string;
  expiry_date: string;
  is_active: boolean;
  tag: string;
  tone: string;
}

function mapOffer(o: any): YltOffer {
  const active = o.is_active ?? o.isActive;
  return {
    id: String(o.id || ''),
    promo_code: String(o.promo_code || o.promoCode || ''),
    title: String(o.title || ''),
    description: String(o.description || ''),
    discount_value: String(o.discount_value ?? o.discountValue ?? ''),
    expiry_date: String(o.expiry_date || o.expiryDate || '2026-12-31').slice(0, 10),
    is_active: active === false || active === 0 || active === '0' ? false : true,
    tag: String(o.tag || 'Bus'),
    tone: String(o.tone || 'from-navy-800 to-navy-600'),
  };
}

function parseList(data: any): YltOffer[] {
  const rows = Array.isArray(data) ? data : (data?.offers || data?.data || []);
  return rows.map(mapOffer).filter((o: YltOffer) => o.promo_code && o.title);
}

export async function fetchOffers(all = false): Promise<YltOffer[]> {
  try {
    const res = await apiFetch(all ? '/api/offers?all=1' : '/api/offers');
    if (!res.ok) return [];
    return parseList(await res.json());
  } catch {
    return [];
  }
}

export async function saveOffer(o: Partial<YltOffer> & { promo_code: string; title: string }): Promise<{ error: string | null; id?: string; emails_sent?: number }> {
  try {
    const res = await apiFetch('/api/offers', {
      method: 'POST',
      body: JSON.stringify({
        id: o.id || undefined,
        promo_code: o.promo_code,
        title: o.title,
        description: o.description ?? '',
        discount_value: o.discount_value ?? '',
        expiry_date: o.expiry_date || '2026-12-31',
        is_active: o.is_active !== false,
        tag: o.tag || 'Bus',
        tone: o.tone || 'from-navy-800 to-navy-600',
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) return { error: data.error ?? 'Save failed.' };
    return { error: null, id: data.id, emails_sent: Number(data.emails_sent || 0) };
  } catch {
    return { error: 'Network error.' };
  }
}

export async function deleteOffer(id: string): Promise<{ error: string | null }> {
  try {
    const res = await apiFetch(`/api/offers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) return { error: data.error ?? 'Delete failed.' };
    return { error: null };
  } catch {
    return { error: 'Network error.' };
  }
}
