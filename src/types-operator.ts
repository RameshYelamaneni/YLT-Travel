export interface FleetCar {
  id: string;
  registration: string;
  model: string;
  type: CarType;
  mode: CarMode;
  fuel: FuelType;
  status: 'available' | 'on-trip' | 'maintenance';
  location_city: string;
  rate_per_km: number;
  base_fare: number;
  odometer_km: number;
}

export type CarType = 'Sedan' | 'SUV' | 'Hatchback' | 'Luxury';
export type CarMode = 'self-drive' | 'chauffeured';
export type FuelType = 'cng' | 'diesel' | 'petrol' | 'electric';

export interface FleetBus {
  id: string;
  registration: string;
  model: string;
  status: 'idle' | 'running' | 'maintenance';
  capacity: number;
  route_id: string | null;
  fuel_pct: number;
  engine_health: 'good' | 'warning' | 'critical';
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license_no: string;
  status: 'on-duty' | 'off-duty' | 'leave';
  rating: number;
  assigned_bus_id: string | null;
}

export interface OperatorRoute {
  id: string;
  from_city: string;
  to_city: string;
  distance_km: number;
  duration_mins: number;
  base_fare: number;
  trips_per_day: number;
}

export interface ExpenseEntry {
  id: string;
  bus_id: string;
  category: 'fuel' | 'maintenance' | 'toll' | 'salary';
  amount: number;
  date: string;
  note: string;
}

export interface SlaReport {
  id: string;
  bus_id: string;
  route: string;
  on_time_pct: number;
  cancelled_pct: number;
  complaint_count: number;
  verified: boolean;
}
