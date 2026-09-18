import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import { authToken, authUserId } from '../lib/auth';

export interface HotelAsset {
  id: string;
  name: string;
  city: string;
  address: string;
  stars: number;
  rooms: { id: string; type: string; capacity: number; rate: number; available: boolean }[];
  amenities: string[];
  slaVerified: boolean;
  status: 'active' | 'maintenance' | 'inactive';
  occupancyPct: number;
  monthlyRevenue: number;
  contactPhone: string;
  photo: string;
  gallery: string[];
}

export interface HotelRoom {
  id: string;
  hotel_id: string;
  room_number: string;
  floor: string;
  room_type: string;
  rate: number;
  status: string;
  hk_status: string;
  booking_id: string | null;
  guest_name: string | null;
  photo_url: string;
}

export interface HotelBookingRecord {
  id: string;
  pnr: string;
  hotelName: string;
  hotel_id?: string;
  guestName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  amount: number;
  status: 'confirmed' | 'cancelled' | 'checked-in' | 'checked-out';
  roomNumber?: string;
  room_id?: string;
  feedback_token?: string;
  guest_email?: string;
  guest_phone?: string;
}

export interface HotelGuest {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  city?: string;
  tags?: string[];
  last_stay?: string;
  last_trip?: string;
  stays: HotelBookingRecord[];
  trips?: { id?: string; pnr?: string; from_city?: string; to_city?: string; travel_date?: string; total_amount?: number; status?: string }[];
}

export interface HotelRatePlan {
  id: string;
  hotel_id: string;
  name: string;
  room_type: string;
  amount: number;
  meal_plan: string;
  refundable: boolean;
  status: string;
}

export interface HotelFolioCharge {
  id: string;
  booking_id: string;
  pnr: string;
  description: string;
  amount: number;
  charge_type: string;
  created_at?: string;
}

export interface HotelNote {
  id: string;
  hotel_id: string;
  booking_id: string;
  guest_key: string;
  kind: string;
  title: string;
  body: string;
  due_date: string;
  status: string;
}

interface PartnerHotelState {
  partnerId: string;
  hotels: HotelAsset[];
  bookings: HotelBookingRecord[];
  rooms: HotelRoom[];
  arrivals: HotelBookingRecord[];
  inhouse: HotelBookingRecord[];
  departures: HotelBookingRecord[];
  occupancyPct: number;
  guests: HotelGuest[];
  ratePlans: HotelRatePlan[];
  folioCharges: HotelFolioCharge[];
  notes: HotelNote[];
  loading: boolean;
  hydrated: boolean;
  lastError: string | null;
  lastFeedbackLink: string | null;
  load: (partnerId: string) => Promise<void>;
  addHotel: (h: Omit<HotelAsset, 'id'> & { id?: string }) => Promise<void>;
  updateHotel: (id: string, data: Partial<HotelAsset>) => Promise<void>;
  removeHotel: (id: string) => Promise<void>;
  toggleSla: (id: string) => Promise<void>;
  updateRoom: (hotelId: string, roomId: string, data: Partial<HotelAsset['rooms'][0]>) => Promise<void>;
  setRoomHk: (roomId: string, status: string, hk: string) => Promise<void>;
  setRoomPhoto: (roomId: string, photoUrl: string) => Promise<void>;
  updateBookingStatus: (id: string, status: HotelBookingRecord['status'], roomId?: string) => Promise<void>;
  addBooking: (b: Omit<HotelBookingRecord, 'id'> & { hotelId?: string; guestEmail?: string; guestPhone?: string; customerId?: string; roomId?: string }) => Promise<void>;
  saveGuest: (g: { name: string; phone?: string; email?: string; notes?: string }) => Promise<void>;
  saveRatePlan: (r: Partial<HotelRatePlan> & { name: string }) => Promise<void>;
  removeRatePlan: (id: string) => Promise<void>;
  addFolioCharge: (c: { booking_id: string; pnr?: string; description: string; amount: number; charge_type?: string }) => Promise<void>;
  saveNote: (n: Partial<HotelNote> & { title: string }) => Promise<void>;
}

function mapHotel(h: any, rooms: HotelRoom[], bookings: HotelBookingRecord[]): HotelAsset {
  const hid = String(h.id);
  const hrs = rooms.filter((r) => r.hotel_id === hid);
  const occ = hrs.length ? Math.round(100 * hrs.filter((r) => r.status === 'occupied').length / hrs.length) : 0;
  const rev = bookings.filter((b) => (b.hotel_id === hid || b.hotelName === h.name) && b.status !== 'cancelled').reduce((s, b) => s + Number(b.amount || 0), 0);
  let amenities: string[] = [];
  if (Array.isArray(h.amenities)) amenities = h.amenities;
  else if (typeof h.amenities === 'string') {
    try { amenities = JSON.parse(h.amenities); } catch { amenities = []; }
  }
  const types = new Map<string, HotelRoom>();
  hrs.forEach((r) => { if (!types.has(r.room_type)) types.set(r.room_type, r); });
  return {
    id: hid,
    name: h.name,
    city: h.city ?? '',
    address: h.address ?? '',
    stars: Number(h.star_rating ?? h.stars ?? 3),
    amenities,
    slaVerified: h.sla_verified !== 0 && h.sla_verified !== '0',
    status: (h.status === 'maintenance' || h.status === 'inactive' ? h.status : 'active') as HotelAsset['status'],
    occupancyPct: occ,
    monthlyRevenue: rev,
    contactPhone: h.contact_phone ?? '',
    photo: h.image_url || h.photo || '',
    gallery: Array.isArray(h.gallery_urls) ? h.gallery_urls.filter((u: unknown) => typeof u === 'string' && u && !String(u).startsWith('data:')) : [],
    rooms: Array.from(types.values()).map((r) => ({
      id: r.id,
      type: r.room_type,
      capacity: 2,
      rate: Number(r.rate || 0),
      available: r.status === 'vacant',
    })),
  };
}

function staffHeaders(extra?: Record<string, string>): Record<string, string> {
  const t = authToken();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}`, 'X-Authorization': `Bearer ${t}` } : {}),
    ...(extra || {}),
  };
}

function failMessage(status: number, data: any, fallback: string): string {
  const err = typeof data?.error === 'string' ? data.error : '';
  if (err) return err;
  if (status === 401 || status === 403) return 'Sign in as a partner to save. Add property needs a partner JWT.';
  if (status === 400) return 'Could not save this property. Check the form and try again.';
  return fallback;
}

async function pmsRequest(path: string, init: RequestInit = {}): Promise<any> {
  const headers = new Headers(init.headers);
  const extra = staffHeaders();
  Object.entries(extra).forEach(([k, v]) => {
    if (!headers.has(k)) headers.set(k, v);
  });
  const res = await apiFetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(failMessage(res.status, data, `Save failed (${res.status || 'network'}).`));
  }
  return data;
}

function resolvePartnerId(fallback = ''): string {
  return fallback || authUserId();
}

function mapBooking(b: any): HotelBookingRecord {
  return {
    id: String(b.id),
    pnr: b.pnr,
    hotelName: b.hotelName || b.hotel_name || '',
    hotel_id: b.hotel_id,
    guestName: b.guestName || b.guest_name || '',
    roomType: b.roomType || b.room_type || '',
    checkIn: (b.checkIn || b.check_in || '').slice(0, 10),
    checkOut: (b.checkOut || b.check_out || '').slice(0, 10),
    nights: Number(b.nights || 1),
    amount: Number(b.amount ?? b.total_amount ?? 0),
    status: (b.status || 'confirmed') as HotelBookingRecord['status'],
    roomNumber: b.roomNumber || b.room_number || '',
    room_id: b.room_id,
    feedback_token: b.feedback_token,
    guest_email: b.guest_email,
    guest_phone: b.guest_phone,
  };
}

export const usePartnerHotelStore = create<PartnerHotelState>((set, get) => ({
  partnerId: '',
  hotels: [],
  bookings: [],
  rooms: [],
  arrivals: [],
  inhouse: [],
  departures: [],
  occupancyPct: 0,
  guests: [],
  ratePlans: [],
  folioCharges: [],
  notes: [],
  loading: false,
  hydrated: false,
  lastError: null,
  lastFeedbackLink: null,

  load: async (partnerId) => {
    const pid = resolvePartnerId(partnerId);
    if (!pid) {
      const msg = authToken() ? 'Partner id missing from this session.' : 'Sign in as a partner to load properties.';
      set({ hotels: [], bookings: [], rooms: [], arrivals: [], inhouse: [], departures: [], occupancyPct: 0, guests: [], ratePlans: [], folioCharges: [], notes: [], partnerId: '', hydrated: false, loading: false, lastError: msg });
      return;
    }
    const first = get().partnerId !== pid || !get().hydrated;
    /* Quiet refresh after the first paint — never flip loading so HotelERP stays mounted. */
    if (first) set({ loading: true, partnerId: pid, lastError: null });
    else set({ partnerId: pid });
    try {
      const data = await pmsRequest('/api/pms.php?resource=desk');
      const rooms: HotelRoom[] = (Array.isArray(data.rooms) ? data.rooms : []).map((r: any) => ({
        id: r.id,
        hotel_id: r.hotel_id,
        room_number: r.room_number,
        floor: r.floor ?? '1',
        room_type: r.room_type,
        rate: Number(r.rate || 0),
        status: r.status,
        hk_status: r.hk_status,
        booking_id: r.booking_id,
        guest_name: r.guest_name,
        photo_url: String(r.photo_url || r.image_url || ''),
      }));
      const bookings = (Array.isArray(data.bookings) ? data.bookings : []).map(mapBooking);
      const hotels = (Array.isArray(data.hotels) ? data.hotels : []).map((h: any) => mapHotel(h, rooms, bookings));
      const guestRows = Array.isArray(data.customers) ? data.customers : (Array.isArray(data.guests) ? data.guests : []);
      const guests: HotelGuest[] = guestRows.map((g: any) => ({
        id: String(g.id || ''),
        name: g.name || '',
        phone: g.phone || '',
        email: g.email || '',
        notes: g.notes || '',
        city: g.city || '',
        tags: Array.isArray(g.tags) ? g.tags : [],
        last_stay: g.last_stay || '',
        last_trip: g.last_trip || '',
        stays: Array.isArray(g.stays) ? g.stays.map(mapBooking) : [],
        trips: Array.isArray(g.trips) ? g.trips : [],
      }));
      const ratePlans: HotelRatePlan[] = (Array.isArray(data.rate_plans) ? data.rate_plans : []).map((r: any) => ({
        id: String(r.id),
        hotel_id: r.hotel_id || '',
        name: r.name || '',
        room_type: r.room_type || 'Standard',
        amount: Number(r.amount || 0),
        meal_plan: r.meal_plan || 'Room only',
        refundable: r.refundable !== 0 && r.refundable !== '0',
        status: r.status || 'active',
      }));
      const folioCharges: HotelFolioCharge[] = (Array.isArray(data.folio_charges) ? data.folio_charges : []).map((c: any) => ({
        id: String(c.id),
        booking_id: c.booking_id || '',
        pnr: c.pnr || '',
        description: c.description || '',
        amount: Number(c.amount || 0),
        charge_type: c.charge_type || 'other',
        created_at: c.created_at,
      }));
      const notes: HotelNote[] = (Array.isArray(data.notes) ? data.notes : []).map((n: any) => ({
        id: String(n.id),
        hotel_id: n.hotel_id || '',
        booking_id: n.booking_id || '',
        guest_key: n.guest_key || '',
        kind: n.kind || 'note',
        title: n.title || '',
        body: n.body || '',
        due_date: (n.due_date || '').slice(0, 10),
        status: n.status || 'open',
      }));
      set({
        hotels,
        rooms,
        bookings,
        arrivals: (Array.isArray(data.arrivals) ? data.arrivals : []).map(mapBooking),
        inhouse: (Array.isArray(data.inhouse) ? data.inhouse : []).map(mapBooking),
        departures: (Array.isArray(data.departures) ? data.departures : []).map(mapBooking),
        occupancyPct: Number(data.occupancy_pct ?? 0),
        guests,
        ratePlans,
        folioCharges,
        notes,
        loading: false,
        hydrated: true,
        lastError: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load hotel desk.';
      set({ loading: false, lastError: msg });
    }
  },

  addHotel: async (h) => {
    const pid = resolvePartnerId(get().partnerId);
    if (!pid) {
      const msg = 'Sign in as a partner to add a property.';
      set({ lastError: msg });
      throw new Error(msg);
    }
    if (!authToken()) {
      const msg = 'Sign in as a partner (JWT) to save this hotel.';
      set({ lastError: msg });
      throw new Error(msg);
    }
    try {
      await pmsRequest('/api/pms.php?resource=hotels', {
        method: 'POST',
        body: JSON.stringify({
          partner_id: pid,
          id: h.id,
          name: h.name,
          city: h.city,
          address: h.address,
          stars: h.stars,
          amenities: h.amenities,
          photo: h.photo,
          gallery: h.gallery || [],
          contactPhone: h.contactPhone,
          slaVerified: h.slaVerified,
          status: h.status,
          is_active: h.status === 'inactive' ? 0 : 1,
          rooms_available: 8,
          price_per_night: h.rooms?.[0]?.rate ?? 2000,
        }),
      });
      set({ lastError: null });
      await get().load(pid);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save hotel.';
      set({ lastError: msg });
      throw new Error(msg);
    }
  },

  updateHotel: async (id, data) => {
    const cur = get().hotels.find((x) => x.id === id);
    if (!cur) return;
    const next = { ...cur, ...data };
    await get().addHotel({ ...next, id });
  },

  removeHotel: async (id) => {
    const pid = resolvePartnerId(get().partnerId);
    await pmsRequest(`/api/pms.php?resource=hotels&id=${encodeURIComponent(id)}&partner_id=${encodeURIComponent(pid)}`, { method: 'DELETE' });
    await get().load(pid);
  },

  toggleSla: async (id) => {
    const h = get().hotels.find((x) => x.id === id);
    if (!h) return;
    await get().updateHotel(id, { slaVerified: !h.slaVerified });
  },

  updateRoom: async (_hotelId, roomId, data) => {
    const pid = resolvePartnerId(get().partnerId);
    await pmsRequest('/api/pms.php?resource=rooms', {
      method: 'PUT',
      body: JSON.stringify({ id: roomId, partner_id: pid, status: data.available === false ? 'ooo' : 'vacant', rate: data.rate, room_type: data.type }),
    });
    await get().load(pid);
  },

  setRoomHk: async (roomId, status, hk) => {
    const pid = resolvePartnerId(get().partnerId);
    await pmsRequest('/api/pms.php?resource=rooms', {
      method: 'PUT',
      body: JSON.stringify({ id: roomId, partner_id: pid, action: 'hk', status, hk_status: hk }),
    });
    await get().load(pid);
  },

  setRoomPhoto: async (roomId, photoUrl) => {
    const pid = resolvePartnerId(get().partnerId);
    await pmsRequest('/api/pms.php?resource=rooms', {
      method: 'PUT',
      body: JSON.stringify({ id: roomId, partner_id: pid, action: 'photo', photo_url: photoUrl }),
    });
    set((s) => ({
      rooms: s.rooms.map((r) => r.id === roomId ? { ...r, photo_url: photoUrl } : r),
    }));
  },

  updateBookingStatus: async (id, status, roomId) => {
    const pid = resolvePartnerId(get().partnerId);
    const action = status === 'checked-in' ? 'checkin' : status === 'checked-out' ? 'checkout' : '';
    const data = await pmsRequest(`/api/pms.php?resource=bookings&id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ id, partner_id: pid, status, action, room_id: roomId }),
    });
    const token = data.feedback_token || data.token;
    set({ lastFeedbackLink: token ? `${window.location.origin}/?rate=${encodeURIComponent(token)}` : get().lastFeedbackLink });
    await get().load(pid);
  },

  addBooking: async (b) => {
    const pid = resolvePartnerId(get().partnerId);
    await pmsRequest('/api/pms.php?resource=bookings', {
      method: 'POST',
      body: JSON.stringify({
        partner_id: pid,
        hotel_id: b.hotelId,
        hotel_name: b.hotelName,
        guest_name: b.guestName,
        guest_email: b.guestEmail,
        guest_phone: b.guestPhone,
        customer_id: b.customerId,
        room_type: b.roomType,
        room_id: b.roomId || b.room_id,
        room_number: b.roomNumber,
        check_in: b.checkIn,
        check_out: b.checkOut,
        nights: b.nights,
        total_amount: b.amount,
        status: b.status || 'confirmed',
      }),
    });
    await get().load(pid);
    void import('./partnerCrmStore').then((m) => m.usePartnerCrmStore.getState().load(pid));
  },

  saveGuest: async (g) => {
    const pid = resolvePartnerId(get().partnerId);
    await pmsRequest('/api/pms.php?resource=guests', {
      method: 'POST',
      body: JSON.stringify({ partner_id: pid, name: g.name, phone: g.phone, email: g.email, notes: g.notes }),
    });
    await get().load(pid);
    void import('./partnerCrmStore').then((m) => m.usePartnerCrmStore.getState().load(pid));
  },

  saveRatePlan: async (r) => {
    const pid = resolvePartnerId(get().partnerId);
    await pmsRequest('/api/pms.php?resource=rates', {
      method: 'POST',
      body: JSON.stringify({
        partner_id: pid,
        id: r.id,
        hotel_id: r.hotel_id,
        name: r.name,
        room_type: r.room_type,
        amount: r.amount,
        meal_plan: r.meal_plan,
        refundable: r.refundable ? 1 : 0,
        status: r.status || 'active',
      }),
    });
    await get().load(pid);
  },

  removeRatePlan: async (id) => {
    const pid = resolvePartnerId(get().partnerId);
    await pmsRequest(`/api/pms.php?resource=rates&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await get().load(pid);
  },

  addFolioCharge: async (c) => {
    const pid = resolvePartnerId(get().partnerId);
    await pmsRequest('/api/pms.php?resource=folio', {
      method: 'POST',
      body: JSON.stringify({ partner_id: pid, ...c }),
    });
    await get().load(pid);
  },

  saveNote: async (n) => {
    const pid = resolvePartnerId(get().partnerId);
    await pmsRequest('/api/pms.php?resource=notes', {
      method: 'POST',
      body: JSON.stringify({ partner_id: pid, ...n }),
    });
    await get().load(pid);
  },
}));

export function fmtINR(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

export function hotelSlaCompliance(hotels: HotelAsset[]): number {
  if (!hotels.length) return 0;
  return Math.round((hotels.filter((h) => h.slaVerified).length / hotels.length) * 100);
}

export function avgOccupancy(hotels: HotelAsset[]): number {
  if (!hotels.length) return 0;
  return Math.round(hotels.reduce((s, h) => s + h.occupancyPct, 0) / hotels.length);
}
