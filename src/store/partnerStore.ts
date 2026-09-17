import { create } from 'zustand';

// ---- Types ----

export interface BusAsset {
  id: string;
  name: string;
  layout: 'Sleeper 2x1' | 'Seater 2x2' | 'Semi-Sleeper 2x2';
  totalSeats: number;
  amenities: string[];
  photoUrl?: string | null;
  permitExpiry: string;
  insuranceExpiry: string;
  nextMaintenance: string;
  status: 'active' | 'maintenance' | 'idle';
  fuelPct: number;
  gpsStatus: 'online' | 'offline';
  routeId?: string | null;
  driverId?: string | null;
}

export interface CarAsset {
  id: string;
  name: string;
  type: 'Sedan' | 'SUV' | 'Hatchback' | 'Luxury';
  pricingModel: 'per_km' | 'hourly' | 'daily' | 'subscription' | 'airport';
  rate: number;
  driverId?: string | null;
  status: 'active' | 'maintenance' | 'idle';
  fuelPct: number;
  photoUrl?: string | null;
  nextMaintenance: string;
}

export interface PoolRoute {
  id: string;
  from: string;
  to: string;
  departure: string;
  totalSeats: number;
  seatsSold: number;
  pricePerSeat: number;
  driverId?: string | null;
  status: 'active' | 'cancelled' | 'completed';
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseExpiry: string;
  assignedTo?: string | null;
  status: 'active' | 'off' | 'leave';
}

export interface Booking {
  id: string;
  pnr: string;
  type: 'bus' | 'car' | 'pool';
  route: string;
  date: string;
  amount: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  customer: string;
}

export interface Payout {
  id: string;
  period: string;
  amount: number;
  status: 'pending' | 'paid';
  requestedAt: string;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  vehicleId?: string;
}

interface PartnerState {
  buses: BusAsset[];
  cars: CarAsset[];
  pools: PoolRoute[];
  drivers: Driver[];
  bookings: Booking[];
  payouts: Payout[];
  alerts: Alert[];
  commissionRate: number;
  agencyName: string;
  contactEmail: string;
  city: string;

  addBus: (b: Omit<BusAsset, 'id'>) => void;
  updateBus: (id: string, patch: Partial<BusAsset>) => void;
  removeBus: (id: string) => void;

  addCar: (c: Omit<CarAsset, 'id'>) => void;
  updateCar: (id: string, patch: Partial<CarAsset>) => void;
  removeCar: (id: string) => void;

  addPool: (p: Omit<PoolRoute, 'id'>) => void;
  updatePool: (id: string, patch: Partial<PoolRoute>) => void;
  removePool: (id: string) => void;

  addDriver: (d: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, patch: Partial<Driver>) => void;
  removeDriver: (id: string) => void;

  requestPayout: (amount: number) => void;

  setProfile: (patch: Partial<Pick<PartnerState, 'agencyName' | 'contactEmail' | 'city' | 'commissionRate'>>) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const today = new Date();
const inDays = (n: number) => new Date(today.getTime() + n * 86400000).toISOString().slice(0, 10);
const fmt = (n: number) => n.toLocaleString('en-IN');

export const usePartnerStore = create<PartnerState>((set) => ({
  buses: [
    { id: 'b1', name: 'Volvo 9400 XL', layout: 'Sleeper 2x1', totalSeats: 36, amenities: ['AC', 'Charging', 'WiFi', 'Blanket'], permitExpiry: inDays(120), insuranceExpiry: inDays(200), nextMaintenance: inDays(12), status: 'active', fuelPct: 78, gpsStatus: 'online', routeId: 'r1', driverId: 'd1' },
    { id: 'b2', name: 'Mercedes Multi', layout: 'Seater 2x2', totalSeats: 44, amenities: ['AC', 'Charging'], permitExpiry: inDays(20), insuranceExpiry: inDays(90), nextMaintenance: inDays(3), status: 'maintenance', fuelPct: 45, gpsStatus: 'offline', routeId: null, driverId: 'd2' },
  ],
  cars: [
    { id: 'c1', name: 'Honda City', type: 'Sedan', pricingModel: 'per_km', rate: 14, driverId: 'd3', status: 'active', fuelPct: 80, nextMaintenance: inDays(25) },
    { id: 'c2', name: 'Toyota Innova', type: 'SUV', pricingModel: 'hourly', rate: 320, driverId: 'd4', status: 'active', fuelPct: 62, nextMaintenance: inDays(8) },
    { id: 'c3', name: 'BMW 5 Series', type: 'Luxury', pricingModel: 'daily', rate: 4500, driverId: null, status: 'idle', fuelPct: 90, nextMaintenance: inDays(40) },
  ],
  pools: [
    { id: 'p1', from: 'Tirupati', to: 'Chennai', departure: '07:00', totalSeats: 4, seatsSold: 3, pricePerSeat: 350, driverId: 'd3', status: 'active' },
    { id: 'p2', from: 'Hyderabad', to: 'Vijayawada', departure: '18:30', totalSeats: 4, seatsSold: 1, pricePerSeat: 500, driverId: 'd4', status: 'active' },
  ],
  drivers: [
    { id: 'd1', name: 'Ramesh Kumar', phone: '9876543210', licenseExpiry: inDays(300), assignedTo: 'b1', status: 'active' },
    { id: 'd2', name: 'Suresh Reddy', phone: '9876511220', licenseExpiry: inDays(45), assignedTo: 'b2', status: 'active' },
    { id: 'd3', name: 'Anil Joshi', phone: '9988776655', licenseExpiry: inDays(180), assignedTo: 'c1', status: 'active' },
    { id: 'd4', name: 'Vijay Nair', phone: '9123456780', licenseExpiry: inDays(15), assignedTo: 'c2', status: 'off' },
  ],
  bookings: [
    { id: 'bk1', pnr: 'YLTA4B23', type: 'bus', route: 'Hyderabad → Bengaluru', date: inDays(2), amount: 1199, status: 'confirmed', customer: 'arjun@mail.com' },
    { id: 'bk2', pnr: 'YLTC9D11', type: 'car', route: 'Airport Drop', date: inDays(1), amount: 840, status: 'confirmed', customer: 'meena@mail.com' },
    { id: 'bk3', pnr: 'YLTP2X55', type: 'pool', route: 'Tirupati → Chennai', date: inDays(3), amount: 1050, status: 'confirmed', customer: 'kavya@mail.com' },
    { id: 'bk4', pnr: 'YLTA7B88', type: 'bus', route: 'Chennai → Vijayawada', date: inDays(-5), amount: 949, status: 'completed', customer: 'rahul@mail.com' },
    { id: 'bk5', pnr: 'YLTC3D42', type: 'car', route: 'City Tour (4h)', date: inDays(-2), amount: 1280, status: 'completed', customer: 'sara@mail.com' },
    { id: 'bk6', pnr: 'YLTA1B09', type: 'bus', route: 'Hyderabad → Vijayawada', date: inDays(-1), amount: 650, status: 'cancelled', customer: 'neha@mail.com' },
  ],
  payouts: [
    { id: 'po1', period: 'Week of Jul 7–13', amount: 18420, status: 'paid', requestedAt: inDays(-7) },
    { id: 'po2', period: 'Week of Jul 14–20', amount: 21380, status: 'pending', requestedAt: inDays(-1) },
  ],
  alerts: [
    { id: 'a1', severity: 'critical', message: 'Permit for Volvo 9400 XL expires in 20 days', vehicleId: 'b2' },
    { id: 'a2', severity: 'warning', message: 'Mercedes Multi due for maintenance in 3 days', vehicleId: 'b2' },
    { id: 'a3', severity: 'warning', message: 'Driver Vijay Nair license expires in 15 days' },
    { id: 'a4', severity: 'info', message: 'Pool Tirupati → Chennai is 75% full', vehicleId: 'p1' },
  ],
  commissionRate: 0.08,
  agencyName: 'YLT Partner Agency',
  contactEmail: 'partner@ylt.in',
  city: 'Tirupati',

  addBus: (b) => set((s) => ({ buses: [...s.buses, { ...b, id: uid() }] })),
  updateBus: (id, patch) => set((s) => ({ buses: s.buses.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  removeBus: (id) => set((s) => ({ buses: s.buses.filter((x) => x.id !== id) })),

  addCar: (c) => set((s) => ({ cars: [...s.cars, { ...c, id: uid() }] })),
  updateCar: (id, patch) => set((s) => ({ cars: s.cars.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  removeCar: (id) => set((s) => ({ cars: s.cars.filter((x) => x.id !== id) })),

  addPool: (p) => set((s) => ({ pools: [...s.pools, { ...p, id: uid() }] })),
  updatePool: (id, patch) => set((s) => ({ pools: s.pools.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  removePool: (id) => set((s) => ({ pools: s.pools.filter((x) => x.id !== id) })),

  addDriver: (d) => set((s) => ({ drivers: [...s.drivers, { ...d, id: uid() }] })),
  updateDriver: (id, patch) => set((s) => ({ drivers: s.drivers.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  removeDriver: (id) => set((s) => ({ drivers: s.drivers.filter((x) => x.id !== id) })),

  requestPayout: (amount) => set((s) => ({ payouts: [{ id: uid(), period: 'Manual request', amount, status: 'pending', requestedAt: new Date().toISOString().slice(0, 10) }, ...s.payouts] })),

  setProfile: (patch) => set(patch),
}));

// ---- Derived analytics ----

export function partnerEarnings(bookings: Booking[], rate: number) {
  const total = bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + b.amount, 0);
  const partner = Math.round(total * (1 - rate));
  const platform = total - partner;
  return { total, partner, platform };
}

export function dailyEarnings(bookings: Booking[], rate: number) {
  const map = new Map<string, number>();
  bookings.filter((b) => b.status !== 'cancelled').forEach((b) => {
    map.set(b.date, (map.get(b.date) ?? 0) + b.amount * (1 - rate));
  });
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export function busOccupancy(bus: BusAsset, bookings: Booking[]) {
  const busBookings = bookings.filter((b) => b.type === 'bus' && b.status === 'confirmed');
  if (!busBookings.length) return 0;
  return Math.round((busBookings.length / Math.max(busBookings.length, 1)) * 100);
}

export function carUtilization(car: CarAsset, bookings: Booking[]) {
  const carBookings = bookings.filter((b) => b.type === 'car' && b.status !== 'cancelled');
  return carBookings.length ? Math.min(100, carBookings.length * 15) : 0;
}

export function poolFill(p: PoolRoute) {
  return p.totalSeats ? Math.round((p.seatsSold / p.totalSeats) * 100) : 0;
}

export function slaCompliance(buses: BusAsset[], cars: CarAsset[], pools: PoolRoute[], drivers: Driver[]) {
  let total = 0, ok = 0;
  const today = new Date().toISOString().slice(0, 10);
  [...buses, ...cars].forEach((v: any) => {
    total++;
    if (v.nextMaintenance >= today && v.status !== 'maintenance') ok++;
  });
  pools.forEach((p) => { total++; if (p.status === 'active') ok++; });
  drivers.forEach((d) => { total++; if (d.licenseExpiry >= today) ok++; });
  return total ? Math.round((ok / total) * 100) : 100;
}

export const fmtINR = fmt;
