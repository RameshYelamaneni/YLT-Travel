import { create } from 'zustand';
import type { Hotel, HotelSearchFilters, HotelBooking, BookingPricing, HotelRoom, HotelReview } from '../types-hotel';
import { fetchHotels, fetchHotelById } from '../lib/hotels';
import { catalogIdentity, mergeLiveWithCatalog } from '../lib/publicCatalog';

const HOTEL_PHOTOS = [
  'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2507010/pexels-photo-2507010.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const ROOM_PHOTOS = [
  'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg?auto=compress&cs=tinysrgb&w=600',
];

const ALL_AMENITIES = ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Parking', 'Gym', 'Bar', 'Room Service', 'Laundry', 'AC', 'Airport Shuttle', 'Business Center'];

const CITIES = ['Tirupati', 'Chennai', 'Hyderabad', 'Bangalore', 'Vijayawada', 'Visakhapatnam', 'Nellore', 'Guntur'];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pickSeeded<T>(arr: T[], n: number, seed: number): T[] {
  const copy = [...arr];
  let s = seed || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function genRooms(hotelId: string, basePrice = 0): HotelRoom[] {
  const seed = hashStr(hotelId);
  const types = [
    { room_type: 'Standard', bed_type: 'Double', max_guests: 2, base: 1800 },
    { room_type: 'Deluxe', bed_type: 'King', max_guests: 3, base: 3500 },
    { room_type: 'Suite', bed_type: 'King', max_guests: 4, base: 6800 },
    { room_type: 'Premium', bed_type: 'Twin', max_guests: 2, base: 4200 },
    { room_type: 'Family Room', bed_type: 'Double', max_guests: 5, base: 5500 },
  ];
  const count = 2 + (seed % 3);
  return types.slice(0, count).map((t, i) => ({
    id: `${hotelId}-r${i}`,
    room_type: t.room_type,
    bed_type: t.bed_type,
    max_guests: t.max_guests,
    price_per_night: (basePrice > 0 && i === 0) ? basePrice : t.base + (seed % 1200),
    amenities: pickSeeded(ALL_AMENITIES, 3 + (seed % 4), seed + i),
    photo: ROOM_PHOTOS[i % ROOM_PHOTOS.length],
    available: true,
  }));
}

function genReviews(hotelId = 'h'): HotelReview[] {
  const seed = hashStr(hotelId);
  const names = ['Ravi K.', 'Priya S.', 'Arjun M.', 'Divya R.', 'Kiran T.', 'Meera N.', 'Suresh L.', 'Anjali P.'];
  const comments = [
    'Excellent stay! Staff was very courteous and room was spotless.',
    'Good location, clean rooms. Would recommend for business trips.',
    'The breakfast buffet was amazing. Pool area needs maintenance though.',
    'Very comfortable beds, great AC. Bit noisy from the road side.',
    'Perfect for families. Kids loved the pool and play area.',
    'Value for money. Decent amenities for the price range.',
    'Beautiful property with well-maintained gardens. Highly recommended.',
    'Room service was prompt. The restaurant serves excellent local cuisine.',
  ];
  const n = 3 + (seed % 6);
  return Array.from({ length: n }, (_, i) => ({
    id: `rev-${hotelId}-${i}`,
    guest_name: names[(seed + i) % names.length],
    rating: 3 + ((seed + i) % 3),
    date: new Date(Date.now() - ((seed + i * 86400000) % (90 * 86400000))).toISOString().slice(0, 10),
    comment: comments[(seed + i) % comments.length],
  }));
}

function asCatalogHotel(h: Hotel): Hotel {
  return { ...h, listing_source: 'catalog' };
}

/** Previous public demo inventory (names/cities from generateHotels before mocks were stripped). */
function generateHotels(): Hotel[] {
  const templates = [
    { name: 'Grand Palace Hotel', desc: 'A luxurious property with panoramic city views, infinity pool, and world-class dining. Perfect for discerning travellers seeking premium comfort.' },
    { name: 'YLT Business Suites', desc: 'Modern business hotel with state-of-the-art conference facilities, high-speed WiFi, and 24-hour business center. Ideal for corporate travellers.' },
    { name: 'Heritage Inn', desc: 'Charming heritage property blending traditional architecture with modern amenities. Experience authentic South Indian hospitality.' },
    { name: 'City Comfort Hotel', desc: 'Budget-friendly hotel in the heart of the city. Clean rooms, reliable service, and excellent connectivity to major landmarks.' },
    { name: 'Lakeside Resort & Spa', desc: 'Serene lakeside retreat with full-service spa, organic restaurant, and nature trails. Unwind in the lap of luxury.' },
    { name: 'Temple View Residency', desc: 'Conveniently located near major temples with rooftop dining offering stunning views. Vegetarian restaurant on premises.' },
    { name: 'Royal Orchid Suites', desc: 'Premium boutique hotel featuring designer interiors, rooftop lounge, and personalized concierge service. An oasis of elegance.' },
    { name: 'Metro Park Hotel', desc: 'Contemporary hotel steps away from the metro station. Rooftop restaurant, fitness center, and complimentary airport shuttle.' },
    { name: 'Seaview Grand', desc: 'Beachfront property with stunning ocean views, private beach access, water sports, and seafood restaurant.' },
    { name: 'Highway Haven', desc: 'Convenient stopover hotel on the national highway with ample parking, 24-hour restaurant, and quick check-in/out.' },
    { name: 'Garden Court Hotel', desc: 'Eco-friendly hotel surrounded by lush gardens. Solar-powered, organic dining, and rainwater harvesting. A green stay experience.' },
    { name: 'Summit Executive Hotel', desc: 'Top-floor executive lounge, heated pool, and proximity to IT parks make this the corporate travellers first choice.' },
  ];
  const hotels: Hotel[] = [];
  let hid = 0;
  for (const city of CITIES) {
    const count = ['Tirupati', 'Chennai', 'Hyderabad', 'Bangalore'].includes(city) ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const t = templates[hid % templates.length];
      const id = `h${hid}`;
      const seed = hashStr(id);
      const stars = 2 + (seed % 4);
      const reviews = genReviews(id);
      const avg = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
      const rooms = genRooms(id);
      hotels.push(asCatalogHotel({
        id,
        name: t.name,
        city,
        address: `${100 + hid * 17} Main Road, ${city}`,
        stars,
        avg_rating: avg,
        review_count: reviews.length,
        description: t.desc,
        photos: pickSeeded(HOTEL_PHOTOS, 3 + (seed % 2), seed),
        amenities: pickSeeded(ALL_AMENITIES, 4 + (seed % 5), seed + 3),
        rooms,
        reviews,
        sla_verified: (seed % 10) > 2,
        cancellation_policy: stars >= 4 ? 'Free cancellation up to 48 hours before check-in.' : 'Free cancellation up to 24 hours before check-in. 50% charge for late cancellation.',
        contact_phone: `+91 ${8000000000 + (seed % 999999999)}`,
        contact_email: `reservations@${t.name.toLowerCase().replace(/\s+/g, '')}.com`,
        base_price: Math.min(...rooms.map((r) => r.price_per_night)),
      }));
      hid++;
    }
  }
  return hotels;
}

const SQL_CATALOG: Array<{
  id: string; name: string; city: string; address: string; stars: number;
  desc: string; amenities: string[]; photos: string[]; price: number; rating: number; reviews: number;
}> = [
  { id: 'b1111111-1111-4111-8111-111111111111', name: 'YLT Grand Palace Hotel', city: 'Tirupati', address: 'Alipiri Road, Tirupati', stars: 4, desc: 'SLA-checked stay next to the bus stand with rooftop dining.', amenities: ['WiFi', 'Restaurant', 'Parking', 'AC', 'Room Service'], photos: [HOTEL_PHOTOS[0], ROOM_PHOTOS[0]], price: 2800, rating: 4.5, reviews: 86 },
  { id: 'b2222222-2222-4222-8222-222222222222', name: 'YLT Business Suites', city: 'Hyderabad', address: 'Road No. 36, Jubilee Hills', stars: 4, desc: 'Modern business hotel with conference rooms and late checkout for night buses.', amenities: ['WiFi', 'Gym', 'Parking', 'AC', 'Business Center'], photos: [HOTEL_PHOTOS[1]], price: 3200, rating: 4.4, reviews: 64 },
  { id: 'b3333333-3333-4333-8333-333333333333', name: 'YLT City Comfort', city: 'Chennai', address: 'Near CMBT, Koyambedu', stars: 3, desc: 'Clean rooms 200m from the bus terminal. Instant PNR after Razorpay.', amenities: ['WiFi', 'AC', 'Parking', 'Restaurant'], photos: [HOTEL_PHOTOS[2]], price: 1900, rating: 4.2, reviews: 51 },
  { id: 'b4444444-4444-4444-8444-444444444444', name: 'YLT Heritage Inn', city: 'Bangalore', address: 'Near Kempegowda Bus Station', stars: 3, desc: 'Heritage property beside the stand. Women-safe front desk 24x7.', amenities: ['WiFi', 'Restaurant', 'AC', 'Laundry'], photos: [HOTEL_PHOTOS[3]], price: 2400, rating: 4.3, reviews: 44 },
  { id: 'b5555555-5555-4555-8555-555555555555', name: 'YLT Temple View Residency', city: 'Tirupati', address: 'Opposite RTC Complex', stars: 3, desc: 'Walk to the RTC stand. Vegetarian kitchen and early checkout for darshan.', amenities: ['WiFi', 'Restaurant', 'AC', 'Parking'], photos: [HOTEL_PHOTOS[4]], price: 2100, rating: 4.35, reviews: 72 },
  { id: 'b6666666-6666-4666-8666-666666666666', name: 'YLT Lakeside Court', city: 'Vijayawada', address: 'MG Road, Vijayawada', stars: 4, desc: 'Quiet rooms with pool access for overnight Hyderabad–Vijayawada trips.', amenities: ['WiFi', 'Pool', 'Restaurant', 'Parking', 'AC'], photos: [HOTEL_PHOTOS[2]], price: 2600, rating: 4.45, reviews: 38 },
  { id: 'catalog-temple-view-tirupati', name: 'Temple View Hotel', city: 'Tirupati', address: 'Tirumala Rd, Tirupati', stars: 3, desc: 'Comfortable pilgrim hotel near temple with pure-veg restaurant and pilgrimage assistance.', amenities: ['WiFi', 'Restaurant', 'AC', 'Parking'], photos: [HOTEL_PHOTOS[4]], price: 1500, rating: 4.2, reviews: 98 },
];

function sqlCatalogHotels(): Hotel[] {
  return SQL_CATALOG.map((row) => {
    const rooms = genRooms(row.id, row.price);
    return asCatalogHotel({
      id: row.id,
      name: row.name,
      city: row.city,
      address: row.address,
      stars: row.stars,
      avg_rating: row.rating,
      review_count: row.reviews,
      description: row.desc,
      photos: row.photos,
      amenities: row.amenities,
      rooms,
      reviews: genReviews(row.id),
      sla_verified: true,
      cancellation_policy: 'Free cancellation up to 24 hours before check-in.',
      contact_phone: '',
      contact_email: 'reservations@ylttravels.com',
      base_price: row.price,
    });
  });
}

export function catalogHotels(): Hotel[] {
  return mergeLiveWithCatalog(generateHotels(), sqlCatalogHotels(), (h) => catalogIdentity(h.name, h.city));
}

const CATALOG_HOTELS = catalogHotels();

function parseList(v: any): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === 'string' ? x : String(x?.url ?? x ?? ''))).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return [];
    try {
      const j = JSON.parse(t);
      if (Array.isArray(j)) return parseList(j);
    } catch { /* comma list */ }
    return t.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function publicMediaUrl(u: string): string {
  const s = String(u || '').trim();
  if (!s || s.startsWith('data:')) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  return s.startsWith('/') ? s : `/${s}`;
}

function mapDbRooms(row: any, photos: string[]): HotelRoom[] {
  const price = Number(row.price_per_night) || 0;
  const raw = Array.isArray(row.rooms) ? row.rooms : [];
  if (raw.length) {
    return raw.map((r: any, i: number) => ({
      id: String(r.id || `${row.id}-r${i}`),
      room_type: String(r.room_type || r.type || 'Standard'),
      bed_type: String(r.bed_type || 'Double'),
      max_guests: Number(r.max_guests || r.capacity || 2) || 2,
      price_per_night: Number(r.rate ?? r.price_per_night ?? price) || price,
      amenities: parseList(r.amenities),
      photo: publicMediaUrl(r.photo || r.photo_url || photos[0] || ''),
      available: !['ooo', 'occupied', 'blocked'].includes(String(r.status || 'vacant')),
    }));
  }
  return [];
}

function mapDbHotel(row: any): Hotel {
  const amenities = parseList(row.amenities);
  const gallery = parseList(row.gallery_urls).map(publicMediaUrl).filter(Boolean);
  const cover = publicMediaUrl(row.image_url || row.photo || '');
  const photos = [...(cover ? [cover] : []), ...gallery].filter((u, i, a) => u && a.indexOf(u) === i);
  const rooms = mapDbRooms(row, photos);
  const sla = row.sla_verified;
  return {
    id: String(row.id),
    name: String(row.name || 'Hotel'),
    city: String(row.city || '').trim(),
    address: String(row.address || row.area || row.city || ''),
    stars: Number(row.star_rating ?? row.stars ?? 3) || 3,
    avg_rating: Number(row.rating ?? row.avg_rating ?? 4) || 4,
    review_count: Number(row.reviews ?? row.review_count ?? 0) || 0,
    description: String(row.description || ''),
    photos,
    amenities,
    rooms,
    reviews: [],
    sla_verified: sla !== 0 && sla !== '0' && sla !== false,
    cancellation_policy: 'Free cancellation up to 24 hours before check-in.',
    contact_phone: String(row.contact_phone || ''),
    contact_email: String(row.contact_email || 'reservations@ylttravels.com'),
    base_price: Number(row.price_per_night) || rooms[0]?.price_per_night || 0,
    listing_source: String(row.partner_id || '').trim() ? 'partner' : 'catalog',
  };
}

function hotelMergeKey(h: Hotel): string {
  return catalogIdentity(h.name, h.city);
}

function mergeHotels(live: Hotel[]): Hotel[] {
  return mergeLiveWithCatalog(live, CATALOG_HOTELS, hotelMergeKey);
}

function isoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** Required stay dates: store values, else today → tomorrow. */
export function defaultStayDates(checkIn?: string, checkOut?: string) {
  const today = isoDate();
  const inn = (checkIn && checkIn >= today) ? checkIn : today;
  const out = (checkOut && checkOut > inn) ? checkOut : addDaysIso(inn, 1);
  return { checkIn: inn, checkOut: out };
}

const stay0 = defaultStayDates();
const defaultFilters: HotelSearchFilters = {
  city: '', checkIn: stay0.checkIn, checkOut: stay0.checkOut, guests: 2,
  priceMin: 0, priceMax: 50000, starRatings: [], amenities: [],
  slaOnly: false, sortBy: 'price-low',
};

export const HOTEL_CITIES = CITIES;

export function calcBookingPricing(ratePerNight: number, nights: number): BookingPricing {
  const subtotal = ratePerNight * nights;
  const r = ratePerNight < 7500 ? 0.12 : 0.18;
  const gst = Math.round(subtotal * r);
  return { rate_per_night: ratePerNight, nights, subtotal, gst_rate: r, gst, total: subtotal + gst };
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + 'T00:00:00');
  const b = new Date(checkOut + 'T00:00:00');
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
}

function generatePNR(): string {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const n = '23456789';
  let pnr = 'YLH';
  for (let i = 0; i < 4; i++) pnr += c[Math.floor(Math.random() * c.length)];
  for (let i = 0; i < 3; i++) pnr += n[Math.floor(Math.random() * n.length)];
  return pnr;
}

interface HotelState {
  allHotels: Hotel[];
  filtered: Hotel[];
  filters: HotelSearchFilters;
  loading: boolean;
  setFilter: <K extends keyof HotelSearchFilters>(key: K, value: HotelSearchFilters[K]) => void;
  setFilters: (f: Partial<HotelSearchFilters>) => void;
  resetFilters: () => void;
  searchHotels: (overrides?: Partial<HotelSearchFilters>) => Promise<void>;
  getHotel: (id: string) => Hotel | undefined;
  loadHotel: (id: string) => Promise<Hotel | undefined>;
  createBooking: (data: {
    hotel: Hotel; room: HotelRoom; guest_name: string; guest_email: string;
    guest_phone: string; check_in: string; check_out: string; guests: number;
    special_requests: string; payment_method: string;
  }) => HotelBooking;
  hydrateFromApi: () => Promise<void>;
}

function applyHotelFilters(list: Hotel[], f: HotelSearchFilters): Hotel[] {
  let out = [...list];
  const city = f.city.trim().toLowerCase();
  if (city) out = out.filter(h => h.city.toLowerCase().includes(city));
  if (f.priceMin > 0) out = out.filter(h => h.base_price >= f.priceMin);
  if (f.priceMax < 50000) out = out.filter(h => h.base_price <= f.priceMax);
  if (f.starRatings.length) out = out.filter(h => f.starRatings.includes(h.stars));
  if (f.amenities.length) out = out.filter(h => f.amenities.every(a => h.amenities.includes(a)));
  if (f.slaOnly) out = out.filter(h => h.sla_verified);
  if (f.guests > 0) out = out.filter(h => !h.rooms.length || h.rooms.some(r => r.max_guests >= f.guests));
  switch (f.sortBy) {
    case 'price-low': out.sort((a, b) => a.base_price - b.base_price); break;
    case 'price-high': out.sort((a, b) => b.base_price - a.base_price); break;
    case 'rating': out.sort((a, b) => b.avg_rating - a.avg_rating); break;
    case 'stars': out.sort((a, b) => b.stars - a.stars); break;
  }
  return out;
}

export const useHotelStore = create<HotelState>((set, get) => ({
  allHotels: CATALOG_HOTELS,
  filtered: CATALOG_HOTELS,
  filters: { ...defaultFilters },
  loading: false,

  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  searchHotels: async (overrides) => {
    const f = { ...get().filters, ...overrides };
    set({ filters: f, loading: true });
    await get().hydrateFromApi();
    set({ filtered: applyHotelFilters(get().allHotels, f), loading: false });
  },

  getHotel: (id) => get().allHotels.find(h => h.id === id),

  loadHotel: async (id) => {
    const existing = get().allHotels.find(h => h.id === id);
    if (existing) return existing;
    await get().hydrateFromApi();
    const fromList = get().allHotels.find(h => h.id === id);
    if (fromList) return fromList;
    const fromCatalog = CATALOG_HOTELS.find(h => h.id === id);
    if (fromCatalog) {
      set((s) => ({ allHotels: s.allHotels.some(h => h.id === fromCatalog.id) ? s.allHotels : [...s.allHotels, fromCatalog] }));
      return fromCatalog;
    }
    try {
      const row = await fetchHotelById(id);
      if (!row?.id) return undefined;
      const mapped = mapDbHotel(row);
      set((s) => {
        const live = s.allHotels.filter((h) => h.listing_source === 'partner' && h.id !== mapped.id);
        return { allHotels: mergeHotels([mapped, ...live]) };
      });
      return mapped;
    } catch {
      return undefined;
    }
  },

  createBooking: (data) => {
    const nights = nightsBetween(data.check_in, data.check_out);
    const pricing = calcBookingPricing(data.room.price_per_night, nights);
    return {
      id: crypto.randomUUID(),
      pnr: generatePNR(),
      hotel_id: data.hotel.id,
      hotel_name: data.hotel.name,
      hotel_city: data.hotel.city,
      hotel_stars: data.hotel.stars,
      hotel_photo: data.hotel.photos[0] ?? '',
      room_id: data.room.id,
      room_type: data.room.room_type,
      bed_type: data.room.bed_type,
      guest_name: data.guest_name,
      guest_email: data.guest_email,
      guest_phone: data.guest_phone,
      check_in: data.check_in,
      check_out: data.check_out,
      guests: data.guests,
      nights,
      rate_per_night: data.room.price_per_night,
      subtotal: pricing.subtotal,
      gst: pricing.gst,
      total: pricing.total,
      special_requests: data.special_requests,
      payment_method: data.payment_method,
      status: 'confirmed',
      created_at: new Date().toISOString().slice(0, 10),
    };
  },

  hydrateFromApi: async () => {
    try {
      const rows = await fetchHotels();
      const live = rows.map(mapDbHotel);
      set({ allHotels: mergeHotels(live) });
    } catch {
      const prevLive = get().allHotels.filter((h) => h.listing_source === 'partner');
      set({ allHotels: mergeHotels(prevLive) });
    }
  },
}));
