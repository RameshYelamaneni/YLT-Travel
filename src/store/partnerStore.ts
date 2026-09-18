import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import { useErpStore } from './erpStore';

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
  channel?: string;
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
  hydrateLive: (partnerId: string) => Promise<void>;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n: number) => n.toLocaleString('en-IN');

export const usePartnerStore = create<PartnerState>((set, get) => ({
  buses: [],
  cars: [],
  pools: [],
  drivers: [],
  bookings: [],
  payouts: [],
  alerts: [],
  commissionRate: 0.08,
  agencyName: '',
  contactEmail: '',
  city: '',

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

  hydrateLive: async (partnerId) => {
    const erp = useErpStore.getState();
    const today = new Date().toISOString().slice(0, 10);
    const layout = (v: string): BusAsset['layout'] => (
      /sleeper/i.test(v) ? 'Sleeper 2x1' : /semi/i.test(v) ? 'Semi-Sleeper 2x2' : 'Seater 2x2'
    );
    const buses: BusAsset[] = (erp.buses ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      layout: layout(b.layout || ''),
      totalSeats: Number(b.total_seats || 0),
      amenities: Array.isArray(b.amenities) ? b.amenities : [],
      photoUrl: b.photo_url,
      permitExpiry: b.permit_expiry || today,
      insuranceExpiry: b.insurance_expiry || today,
      nextMaintenance: b.next_maintenance || today,
      status: (b.status === 'maintenance' ? 'maintenance' : b.status === 'idle' ? 'idle' : 'active'),
      fuelPct: Number(b.fuel_pct || 0),
      gpsStatus: b.gps_status === 'offline' ? 'offline' : 'online',
      routeId: b.route_id,
      driverId: b.driver_id,
    }));
    const drivers: Driver[] = (erp.crew ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      licenseExpiry: c.license_expiry || today,
      assignedTo: c.assigned_vehicle_id,
      status: c.status === 'leave' ? 'leave' : c.status === 'off' ? 'off' : 'active',
    }));
    const payouts: Payout[] = (erp.payouts ?? []).map((p) => ({
      id: p.id,
      period: p.period,
      amount: Number(p.amount || 0),
      status: p.status === 'paid' ? 'paid' : 'pending',
      requestedAt: p.requested_at,
    }));
    let bookings: Booking[] = [];
    let cars: CarAsset[] = get().cars;
    try {
      const [bRes, cRes] = await Promise.all([
        apiFetch('/api/bookings?limit=100'),
        apiFetch(`/api/pms.php?resource=cars&partner_id=${encodeURIComponent(partnerId)}`),
      ]);
      const bData = await bRes.json();
      const rows = Array.isArray(bData) ? bData : [];
      bookings = rows.map((b: any) => ({
        id: b.id || b.pnr,
        pnr: b.pnr,
        type: b.type === 'car' ? 'car' : (b.type === 'pool' ? 'pool' : 'bus'),
        route: b.route || `${b.from_city ?? ''} → ${b.to_city ?? ''}`,
        date: b.date || b.travel_date || '',
        amount: Number(b.total ?? b.total_amount ?? 0),
        status: b.status === 'cancelled' ? 'cancelled' : (b.status === 'completed' ? 'completed' : 'confirmed'),
        customer: b.contact_email || b.guest_email || '',
        channel: b.channel || 'website',
      }));
      const cData = await cRes.json();
      cars = (cData.cars ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: (c.type || 'Sedan') as CarAsset['type'],
        pricingModel: (c.pricing_model || 'per_km') as CarAsset['pricingModel'],
        rate: Number(c.rate || 0),
        status: c.status === 'maintenance' ? 'maintenance' : c.status === 'idle' ? 'idle' : 'active',
        fuelPct: Number(c.fuel_pct || 100),
        nextMaintenance: c.next_maintenance || today,
        driverId: null,
      }));
    } catch { /* keep previous */ }
    const alerts: Alert[] = [];
    buses.forEach((b) => {
      if (b.permitExpiry <= today) alerts.push({ id: `p-${b.id}`, severity: 'critical', message: `Permit expired or due: ${b.name}`, vehicleId: b.id });
      else if (b.nextMaintenance <= today) alerts.push({ id: `m-${b.id}`, severity: 'warning', message: `Maintenance due: ${b.name}`, vehicleId: b.id });
      if (b.fuelPct < 30) alerts.push({ id: `f-${b.id}`, severity: 'warning', message: `Low fuel: ${b.name} (${b.fuelPct}%)`, vehicleId: b.id });
    });
    set({
      buses, drivers, payouts, bookings, cars, alerts,
      agencyName: erp.profile?.company_name || get().agencyName,
      contactEmail: erp.profile?.contact_email || get().contactEmail,
      city: erp.profile?.city || get().city,
    });
  },
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
