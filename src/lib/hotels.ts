import { apiUrl } from './api';

export interface Hotel {
  id: string;
  name: string;
  city: string;
  area: string | null;
  address: string | null;
  star_rating: number;
  description: string | null;
  amenities: string[];
  image_url: string | null;
  gallery_urls: string[];
  price_per_night: number;
  rooms_available: number;
  rating: number;
  reviews: number;
  is_active: boolean;
}

export interface HotelBooking {
  id: string;
  pnr: string;
  hotel_id: string | null;
  hotel_name: string;
  city: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  rooms: number;
  guests: number;
  room_type: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export async function fetchHotels(city?: string): Promise<Hotel[]> {
  const url = city && city !== 'all' ? apiUrl(`/api/hotels?city=${encodeURIComponent(city)}`) : apiUrl('/api/hotels');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchHotels HTTP ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data)) return data as Hotel[];
  if (Array.isArray(data?.hotels)) return data.hotels as Hotel[];
  if (Array.isArray(data?.data)) return data.data as Hotel[];
  if (Array.isArray(data?.rows)) return data.rows as Hotel[];
  return [];
}

export async function fetchHotelById(id: string): Promise<Hotel | null> {
  try {
    const res = await fetch(apiUrl(`/api/hotels?id=${encodeURIComponent(id)}`));
    if (!res.ok) { console.warn('fetchHotelById HTTP', res.status); return null; }
    const data = await res.json();
    if (data && data.id) return data as Hotel;
    if (data?.hotel?.id) return data.hotel as Hotel;
    return null;
  } catch (e) {
    console.warn('fetchHotelById error:', e); return null;
  }
}

export async function createHotelBooking(b: Omit<HotelBooking, 'id' | 'created_at' | 'status'>): Promise<{ pnr: string | null; error: string | null }> {
  try {
    const res = await fetch(apiUrl('/api/bookings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { pnr: null, error: err.error ?? `Request failed (${res.status})` };
    }
    const data = await res.json();
    return { pnr: data?.pnr ?? null, error: null };
  } catch (e: any) {
    return { pnr: null, error: e?.message ?? 'Network error' };
  }
}

export async function subscribeNewsletter(email: string, name?: string, source = 'footer'): Promise<{ error: string | null }> {
  try {
    const res = await fetch(apiUrl('/api/newsletter/subscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: name ?? null, source }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: err.error ?? `Request failed (${res.status})` };
    }
    return { error: null };
  } catch (e: any) {
    return { error: e?.message ?? 'Network error' };
  }
}
