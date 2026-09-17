import { create } from 'zustand';
import type { Hotel, HotelSearchFilters, HotelBooking, BookingPricing, HotelRoom, HotelReview } from '../types-hotel';

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

function pick<T>(arr: T[], n: number): T[] {
  const s = [...arr].sort(() => Math.random() - 0.5);
  return s.slice(0, n);
}

function genRooms(hotelId: string): HotelRoom[] {
  const types = [
    { room_type: 'Standard', bed_type: 'Double', max_guests: 2, base: 1800 },
    { room_type: 'Deluxe', bed_type: 'King', max_guests: 3, base: 3500 },
    { room_type: 'Suite', bed_type: 'King', max_guests: 4, base: 6800 },
    { room_type: 'Premium', bed_type: 'Twin', max_guests: 2, base: 4200 },
    { room_type: 'Family Room', bed_type: 'Double', max_guests: 5, base: 5500 },
  ];
  return types.slice(0, 2 + Math.floor(Math.random() * 3)).map((t, i) => ({
    id: `${hotelId}-r${i}`,
    room_type: t.room_type,
    bed_type: t.bed_type,
    max_guests: t.max_guests,
    price_per_night: t.base + Math.floor(Math.random() * 1200),
    amenities: pick(ALL_AMENITIES, 3 + Math.floor(Math.random() * 4)),
    photo: ROOM_PHOTOS[i % ROOM_PHOTOS.length],
    available: Math.random() > 0.15,
  }));
}

function genReviews(): HotelReview[] {
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
  const n = 3 + Math.floor(Math.random() * 6);
  return Array.from({ length: n }, (_, i) => ({
    id: `rev-${i}-${Math.random().toString(36).slice(2, 8)}`,
    guest_name: names[i % names.length],
    rating: 3 + Math.floor(Math.random() * 3),
    date: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString().slice(0, 10),
    comment: comments[i % comments.length],
  }));
}

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
      const stars = 2 + Math.floor(Math.random() * 4);
      const reviews = genReviews();
      const avg = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
      const rooms = genRooms(`h${hid}`);
      hotels.push({
        id: `h${hid}`,
        name: t.name,
        city,
        address: `${100 + hid * 17} Main Road, ${city}`,
        stars,
        avg_rating: avg,
        review_count: reviews.length,
        description: t.desc,
        photos: pick(HOTEL_PHOTOS, 3 + Math.floor(Math.random() * 2)),
        amenities: pick(ALL_AMENITIES, 4 + Math.floor(Math.random() * 5)),
        rooms,
        reviews,
        sla_verified: Math.random() > 0.3,
        cancellation_policy: stars >= 4 ? 'Free cancellation up to 48 hours before check-in.' : 'Free cancellation up to 24 hours before check-in. 50% charge for late cancellation.',
        contact_phone: `+91 ${8000000000 + Math.floor(Math.random() * 999999999)}`,
        contact_email: `reservations@${t.name.toLowerCase().replace(/\s+/g, '')}.com`,
        base_price: Math.min(...rooms.map(r => r.price_per_night)),
      });
      hid++;
    }
  }
  return hotels;
}

const SEED_HOTELS = generateHotels();

const defaultFilters: HotelSearchFilters = {
  city: '', checkIn: '', checkOut: '', guests: 2,
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
  searchHotels: (overrides?: Partial<HotelSearchFilters>) => void;
  getHotel: (id: string) => Hotel | undefined;
  createBooking: (data: {
    hotel: Hotel; room: HotelRoom; guest_name: string; guest_email: string;
    guest_phone: string; check_in: string; check_out: string; guests: number;
    special_requests: string; payment_method: string;
  }) => HotelBooking;
}

export const useHotelStore = create<HotelState>((set, get) => ({
  allHotels: SEED_HOTELS,
  filtered: SEED_HOTELS,
  filters: { ...defaultFilters },
  loading: false,

  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  searchHotels: (overrides) => {
    const f = { ...get().filters, ...overrides };
    set({ filters: f, loading: true });
    let list = [...get().allHotels];
    if (f.city) list = list.filter(h => h.city.toLowerCase().includes(f.city.toLowerCase()));
    if (f.priceMin > 0) list = list.filter(h => h.base_price >= f.priceMin);
    if (f.priceMax < 50000) list = list.filter(h => h.base_price <= f.priceMax);
    if (f.starRatings.length) list = list.filter(h => f.starRatings.includes(h.stars));
    if (f.amenities.length) list = list.filter(h => f.amenities.every(a => h.amenities.includes(a)));
    if (f.slaOnly) list = list.filter(h => h.sla_verified);
    if (f.guests > 0) list = list.filter(h => h.rooms.some(r => r.max_guests >= f.guests));
    switch (f.sortBy) {
      case 'price-low': list.sort((a, b) => a.base_price - b.base_price); break;
      case 'price-high': list.sort((a, b) => b.base_price - a.base_price); break;
      case 'rating': list.sort((a, b) => b.avg_rating - a.avg_rating); break;
      case 'stars': list.sort((a, b) => b.stars - a.stars); break;
    }
    setTimeout(() => set({ filtered: list, loading: false }), 300);
  },

  getHotel: (id) => get().allHotels.find(h => h.id === id),

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
}));
