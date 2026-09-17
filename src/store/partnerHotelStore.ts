import { create } from 'zustand';

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
}

export interface HotelBookingRecord {
  id: string;
  pnr: string;
  hotelName: string;
  guestName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  amount: number;
  status: 'confirmed' | 'cancelled' | 'checked-in' | 'checked-out';
}

const SEED_HOTELS: HotelAsset[] = [
  {
    id: 'ph1', name: 'Grand Palace Hotel', city: 'Tirupati', address: '12 Temple Road, Tirupati',
    stars: 5, amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Gym', 'Bar', 'Room Service', 'AC'],
    slaVerified: true, status: 'active', occupancyPct: 78, monthlyRevenue: 845000,
    contactPhone: '+91 9876543210', photo: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=400',
    rooms: [
      { id: 'r1', type: 'Standard', capacity: 2, rate: 2400, available: true },
      { id: 'r2', type: 'Deluxe', capacity: 3, rate: 4200, available: true },
      { id: 'r3', type: 'Suite', capacity: 4, rate: 7800, available: false },
    ],
  },
  {
    id: 'ph2', name: 'YLT Business Suites', city: 'Chennai', address: '45 MG Road, Chennai',
    stars: 4, amenities: ['WiFi', 'Restaurant', 'Gym', 'Business Center', 'AC', 'Parking'],
    slaVerified: true, status: 'active', occupancyPct: 65, monthlyRevenue: 520000,
    contactPhone: '+91 9876543211', photo: 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg?auto=compress&cs=tinysrgb&w=400',
    rooms: [
      { id: 'r1', type: 'Standard', capacity: 2, rate: 2800, available: true },
      { id: 'r2', type: 'Premium', capacity: 2, rate: 4500, available: true },
    ],
  },
  {
    id: 'ph3', name: 'Heritage Inn', city: 'Hyderabad', address: '78 Charminar Rd, Hyderabad',
    stars: 3, amenities: ['WiFi', 'Restaurant', 'AC', 'Parking', 'Laundry'],
    slaVerified: false, status: 'maintenance', occupancyPct: 42, monthlyRevenue: 185000,
    contactPhone: '+91 9876543212', photo: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=400',
    rooms: [
      { id: 'r1', type: 'Standard', capacity: 2, rate: 1800, available: true },
      { id: 'r2', type: 'Family Room', capacity: 5, rate: 5500, available: true },
    ],
  },
];

const SEED_BOOKINGS: HotelBookingRecord[] = [
  { id: 'hb1', pnr: 'YLHABCD123', hotelName: 'Grand Palace Hotel', guestName: 'Ravi Kumar', roomType: 'Deluxe', checkIn: '2026-07-20', checkOut: '2026-07-22', nights: 2, amount: 8400, status: 'confirmed' },
  { id: 'hb2', pnr: 'YLHEFGH456', hotelName: 'YLT Business Suites', guestName: 'Priya Sharma', roomType: 'Premium', checkIn: '2026-07-21', checkOut: '2026-07-23', nights: 2, amount: 9000, status: 'checked-in' },
  { id: 'hb3', pnr: 'YLHIJKL789', hotelName: 'Grand Palace Hotel', guestName: 'Arjun Mehta', roomType: 'Standard', checkIn: '2026-07-19', checkOut: '2026-07-20', nights: 1, amount: 2400, status: 'checked-out' },
  { id: 'hb4', pnr: 'YLHMNOP012', hotelName: 'Heritage Inn', guestName: 'Divya Reddy', roomType: 'Family Room', checkIn: '2026-07-25', checkOut: '2026-07-27', nights: 2, amount: 11000, status: 'confirmed' },
  { id: 'hb5', pnr: 'YLHPQRS345', hotelName: 'YLT Business Suites', guestName: 'Kiran Teja', roomType: 'Standard', checkIn: '2026-07-18', checkOut: '2026-07-19', nights: 1, amount: 2800, status: 'cancelled' },
];

interface PartnerHotelState {
  hotels: HotelAsset[];
  bookings: HotelBookingRecord[];
  addHotel: (h: Omit<HotelAsset, 'id'>) => void;
  updateHotel: (id: string, data: Partial<HotelAsset>) => void;
  removeHotel: (id: string) => void;
  toggleSla: (id: string) => void;
  updateRoom: (hotelId: string, roomId: string, data: Partial<HotelAsset['rooms'][0]>) => void;
  updateBookingStatus: (id: string, status: HotelBookingRecord['status']) => void;
  addBooking: (b: Omit<HotelBookingRecord, 'id'>) => void;
}

export const usePartnerHotelStore = create<PartnerHotelState>((set) => ({
  hotels: SEED_HOTELS,
  bookings: SEED_BOOKINGS,
  addHotel: (h) => set((s) => ({ hotels: [...s.hotels, { ...h, id: `ph${Date.now()}` }] })),
  updateHotel: (id, data) => set((s) => ({ hotels: s.hotels.map(h => h.id === id ? { ...h, ...data } : h) })),
  removeHotel: (id) => set((s) => ({ hotels: s.hotels.filter(h => h.id !== id) })),
  toggleSla: (id) => set((s) => ({ hotels: s.hotels.map(h => h.id === id ? { ...h, slaVerified: !h.slaVerified } : h) })),
  updateRoom: (hotelId, roomId, data) => set((s) => ({
    hotels: s.hotels.map(h => h.id === hotelId ? {
      ...h,
      rooms: h.rooms.map(r => r.id === roomId ? { ...r, ...data } : r),
    } : h),
  })),
  updateBookingStatus: (id, status) => set((s) => ({
    bookings: s.bookings.map(b => b.id === id ? { ...b, status } : b),
  })),
  addBooking: (b) => set((s) => ({ bookings: [{ ...b, id: `hb${Date.now()}` }, ...s.bookings] })),
}));

export function fmtINR(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

export function hotelSlaCompliance(hotels: HotelAsset[]): number {
  if (!hotels.length) return 0;
  return Math.round((hotels.filter(h => h.slaVerified).length / hotels.length) * 100);
}

export function avgOccupancy(hotels: HotelAsset[]): number {
  if (!hotels.length) return 0;
  return Math.round(hotels.reduce((s, h) => s + h.occupancyPct, 0) / hotels.length);
}
