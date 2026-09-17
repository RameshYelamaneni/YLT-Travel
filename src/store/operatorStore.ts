import { create } from 'zustand';
import type { FleetBus, Driver, OperatorRoute, ExpenseEntry, SlaReport, FleetCar } from '../types-operator';

interface OperatorState {
  fleet: FleetBus[];
  drivers: Driver[];
  routes: OperatorRoute[];
  expenses: ExpenseEntry[];
  slaReports: SlaReport[];
  cars: FleetCar[];

  addCar: (c: FleetCar) => void;
  updateCar: (id: string, patch: Partial<FleetCar>) => void;
  removeCar: (id: string) => void;

  addBus: (b: FleetBus) => void;
  updateBus: (id: string, patch: Partial<FleetBus>) => void;
  removeBus: (id: string) => void;

  addDriver: (d: Driver) => void;
  updateDriver: (id: string, patch: Partial<Driver>) => void;
  removeDriver: (id: string) => void;

  addExpense: (e: ExpenseEntry) => void;
  removeExpense: (id: string) => void;
}

const mockFleet: FleetBus[] = [
  { id: 'FB-01', registration: 'AP 28 AB 1234', model: 'Volvo 9400XL', status: 'running', capacity: 44, route_id: 'R-01', fuel_pct: 72, engine_health: 'good' },
  { id: 'FB-02', registration: 'AP 28 CD 5678', model: 'Mercedes Multi-Axle', status: 'running', capacity: 49, route_id: 'R-02', fuel_pct: 45, engine_health: 'warning' },
  { id: 'FB-03', registration: 'TS 09 EF 9012', model: 'Scania Metrolink', status: 'idle', capacity: 46, route_id: null, fuel_pct: 90, engine_health: 'good' },
  { id: 'FB-04', registration: 'KA 05 GH 3456', model: 'Volvo 9400PX', status: 'maintenance', capacity: 44, route_id: null, fuel_pct: 20, engine_health: 'critical' },
];

const mockDrivers: Driver[] = [
  { id: 'DR-01', name: 'S. Ramesh', phone: '9876543210', license_no: 'AP-2019-001234', status: 'on-duty', rating: 4.6, assigned_bus_id: 'FB-01' },
  { id: 'DR-02', name: 'K. Suresh', phone: '9876543211', license_no: 'TS-2018-005678', status: 'on-duty', rating: 4.4, assigned_bus_id: 'FB-02' },
  { id: 'DR-03', name: 'M. Venkat', phone: '9876543212', license_no: 'KA-2020-009012', status: 'off-duty', rating: 4.8, assigned_bus_id: null },
  { id: 'DR-04', name: 'P. Anil', phone: '9876543213', license_no: 'AP-2021-003456', status: 'leave', rating: 4.2, assigned_bus_id: null },
];

const mockRoutes: OperatorRoute[] = [
  { id: 'R-01', from_city: 'Hyderabad', to_city: 'Bengaluru', distance_km: 570, duration_mins: 540, base_fare: 980, trips_per_day: 4 },
  { id: 'R-02', from_city: 'Hyderabad', to_city: 'Chennai', distance_km: 630, duration_mins: 600, base_fare: 1100, trips_per_day: 3 },
  { id: 'R-03', from_city: 'Chennai', to_city: 'Tirupati', distance_km: 135, duration_mins: 180, base_fare: 420, trips_per_day: 6 },
];

const mockExpenses: ExpenseEntry[] = [
  { id: 'EX-01', bus_id: 'FB-01', category: 'fuel', amount: 8500, date: '2026-07-15', note: 'Diesel refill' },
  { id: 'EX-02', bus_id: 'FB-02', category: 'maintenance', amount: 12000, date: '2026-07-14', note: 'Brake pad replacement' },
  { id: 'EX-03', bus_id: 'FB-01', category: 'toll', amount: 1200, date: '2026-07-15', note: 'Highway toll' },
  { id: 'EX-04', bus_id: 'FB-03', category: 'fuel', amount: 7200, date: '2026-07-16', note: 'Diesel refill' },
];

const mockSla: SlaReport[] = [
  { id: 'SLA-01', bus_id: 'FB-01', route: 'Hyderabad → Bengaluru', on_time_pct: 94, cancelled_pct: 1, complaint_count: 2, verified: true },
  { id: 'SLA-02', bus_id: 'FB-02', route: 'Hyderabad → Chennai', on_time_pct: 88, cancelled_pct: 2, complaint_count: 5, verified: true },
  { id: 'SLA-03', bus_id: 'FB-03', route: 'Chennai → Tirupati', on_time_pct: 91, cancelled_pct: 0, complaint_count: 1, verified: false },
];

const mockCars: FleetCar[] = [
  { id: 'FC-001', registration: 'AP 28 LM 0011', model: 'Maruti Suzuki Dzire', type: 'Sedan', mode: 'chauffeured', fuel: 'cng', status: 'available', location_city: 'Hyderabad', rate_per_km: 14, base_fare: 149, odometer_km: 45200 },
  { id: 'FC-002', registration: 'AP 28 LM 0022', model: 'Toyota Innova Crysta', type: 'SUV', mode: 'chauffeured', fuel: 'diesel', status: 'on-trip', location_city: 'Hyderabad', rate_per_km: 22, base_fare: 299, odometer_km: 78500 },
  { id: 'FC-003', registration: 'TS 09 LM 0033', model: 'Maruti Swift', type: 'Hatchback', mode: 'self-drive', fuel: 'petrol', status: 'available', location_city: 'Chennai', rate_per_km: 11, base_fare: 99, odometer_km: 23100 },
  { id: 'FC-004', registration: 'KA 05 LM 0044', model: 'Hyundai Creta', type: 'SUV', mode: 'self-drive', fuel: 'diesel', status: 'maintenance', location_city: 'Bengaluru', rate_per_km: 18, base_fare: 199, odometer_km: 51200 },
];

export const useOperatorStore = create<OperatorState>()((set) => ({
  fleet: mockFleet,
  drivers: mockDrivers,
  routes: mockRoutes,
  expenses: mockExpenses,
  slaReports: mockSla,
  cars: mockCars,

  addCar: (c) => set((s) => ({ cars: [...s.cars, c] })),
  updateCar: (id, patch) => set((s) => ({ cars: s.cars.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  removeCar: (id) => set((s) => ({ cars: s.cars.filter((c) => c.id !== id) })),

  addBus: (b) => set((s) => ({ fleet: [...s.fleet, b] })),
  updateBus: (id, patch) => set((s) => ({ fleet: s.fleet.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
  removeBus: (id) => set((s) => ({ fleet: s.fleet.filter((b) => b.id !== id) })),

  addDriver: (d) => set((s) => ({ drivers: [...s.drivers, d] })),
  updateDriver: (id, patch) => set((s) => ({ drivers: s.drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
  removeDriver: (id) => set((s) => ({ drivers: s.drivers.filter((d) => d.id !== id) })),

  addExpense: (e) => set((s) => ({ expenses: [e, ...s.expenses] })),
  removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
}));
