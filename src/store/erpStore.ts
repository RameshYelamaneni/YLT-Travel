import { create } from 'zustand';

const API = import.meta.env.VITE_API_BASE_URL ?? '';
const ERP_ENDPOINT = `${API}/erp.php`;

// ============================================================
// TYPES — all 10 modules
// ============================================================

// Module 1: Bus Operations
export interface ErpBus {
  id: string;
  name: string;
  registration_number: string | null;
  layout: string;
  total_seats: number;
  amenities: string[];
  photo_url: string | null;
  permit_expiry: string | null;
  insurance_expiry: string | null;
  next_maintenance: string | null;
  status: string;
  fuel_pct: number;
  gps_status: string;
  route_id: string | null;
  driver_id: string | null;
  cleaner_id: string | null;
  engine_hours: number;
  odometer_km: number;
  last_service_date: string | null;
}

export interface ErpBusHealth {
  id: string;
  bus_id: string;
  recorded_at: string;
  engine_temp_c: number | null;
  tire_pressure_psi: number | null;
  battery_volt: number | null;
  emissions_ok: boolean;
  fuel_pct: number | null;
  gps_status: string | null;
  odometer_km: number | null;
  engine_hours: number | null;
  notes: string | null;
}

export interface ErpBusExpense {
  id: string;
  bus_id: string;
  date: string;
  category: string;
  amount: number;
  description: string | null;
  receipt_url: string | null;
}

// Module 2: Crew & Workforce
export interface ErpCrew {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  license_number: string | null;
  license_expiry: string | null;
  assigned_vehicle_id: string | null;
  status: string;
  photo_url: string | null;
  address: string | null;
  emergency_contact: string | null;
  joined_date: string;
  salary: number;
}

export interface ErpCrewDocument {
  id: string;
  crew_id: string;
  doc_type: string;
  doc_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_url: string | null;
  verified: boolean;
}

export interface ErpShift {
  id: string;
  crew_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  route_id: string | null;
  bus_id: string | null;
  status: string;
  notes: string | null;
}

export interface ErpSlaScore {
  id: string;
  crew_id: string;
  period: string;
  on_time_pct: number;
  cancellation_count: number;
  customer_rating: number;
  safety_incidents: number;
  overall_score: number;
  notes: string | null;
}

// Module 3: Seat Inventory
export interface ErpSeatInventory {
  id: string;
  bus_id: string;
  travel_date: string;
  seat_number: string;
  status: string;
  channel: string | null;
  booking_pnr: string | null;
  passenger_name: string | null;
  locked_until: string | null;
}

export interface ErpSeatLock {
  id: string;
  bus_id: string;
  travel_date: string;
  seat_numbers: string[];
  locked_by: string | null;
  locked_at: string;
  expires_at: string;
  status: string;
}

export interface ErpChannelSale {
  id: string;
  booking_pnr: string;
  channel: string;
  route: string | null;
  travel_date: string;
  seats_sold: number;
  gross_amount: number;
  commission_pct: number;
  commission_amount: number;
  net_amount: number;
  status: string;
}

// Module 4: Trip & Schedule
export interface ErpRoute {
  id: string;
  name: string;
  from_city: string;
  to_city: string;
  stops: string[];
  distance_km: number;
  duration_mins: number;
  base_fare: number;
  status: string;
}

export interface ErpSchedule {
  id: string;
  route_id: string;
  bus_id: string | null;
  driver_id: string | null;
  cleaner_id: string | null;
  departure_date: string;
  departure_time: string;
  arrival_time: string | null;
  status: string;
  recurrence: string;
}

export interface ErpLiveTrip {
  id: string;
  schedule_id: string;
  bus_id: string | null;
  route_name: string | null;
  status: string;
  current_location: string | null;
  eta_minutes: number | null;
  speed_kmph: number | null;
  delay_minutes: number;
  passengers_onboard: number;
  started_at: string | null;
}

// Module 5: Earnings & Payouts
export interface ErpEarning {
  id: string;
  date: string;
  channel: string | null;
  gross_amount: number;
  commission_pct: number;
  commission_amount: number;
  net_amount: number;
  gst_amount: number;
  booking_count: number;
}

export interface ErpSettlement {
  id: string;
  period: string;
  channel: string | null;
  gross_amount: number;
  commission_amount: number;
  gst_amount: number;
  net_payable: number;
  status: string;
  settled_at: string | null;
}

export interface ErpPayout {
  id: string;
  period: string;
  amount: number;
  status: string;
  requested_at: string;
  paid_at: string | null;
  utr_number: string | null;
  notes: string | null;
}

// Module 6: Maintenance & Compliance
export interface ErpMaintenanceLog {
  id: string;
  bus_id: string;
  service_date: string;
  service_type: string;
  odometer_km: number | null;
  cost: number;
  service_center: string | null;
  description: string | null;
  next_service_date: string | null;
}

export interface ErpPartReplacement {
  id: string;
  bus_id: string;
  maintenance_log_id: string | null;
  part_name: string;
  part_number: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  replaced_date: string;
  warranty_expiry: string | null;
  notes: string | null;
}

export interface ErpCompliance {
  id: string;
  bus_id: string;
  doc_type: string;
  doc_number: string | null;
  issue_date: string | null;
  expiry_date: string;
  status: string;
  alert_days: number;
  notes: string | null;
}

// Module 7: Insights
export interface ErpInsight {
  id: string;
  insight_type: string;
  entity_id: string | null;
  entity_name: string | null;
  score: number;
  metric_label: string | null;
  metric_value: string | null;
  trend: string;
  recommendation: string | null;
  severity: string;
}

// Module 8: Expenses & Ledger
export interface ErpExpense {
  id: string;
  date: string;
  category: string;
  sub_category: string | null;
  amount: number;
  bus_id: string | null;
  crew_id: string | null;
  description: string | null;
  receipt_url: string | null;
  gst_applicable: boolean;
  gst_amount: number;
}

export interface ErpPlReport {
  id: string;
  period: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  margin_pct: number;
}

// Module 9: Partner Profile
export interface ErpPartnerProfile {
  id: string;
  company_name: string;
  legal_name: string | null;
  gst_number: string | null;
  pan_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  logo_url: string | null;
  brand_color: string;
  website_url: string | null;
  description: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  upi_id: string | null;
}

// Module 10: Access & Security
export interface ErpRole {
  id: string;
  role_name: string;
  permissions: string[];
  description: string | null;
  user_count: number;
}

export interface ErpAuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_name: string | null;
  user_role: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface ErpApiKey {
  id: string;
  key_name: string;
  api_key_prefix: string;
  permissions: string[];
  status: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

// ============================================================
// API HELPERS
// ============================================================

async function apiGet(table: string): Promise<any[]> {
  try {
    const res = await fetch(`${ERP_ENDPOINT}?table=${table}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function apiInsert(table: string, record: Record<string, unknown>): Promise<any | null> {
  try {
    const res = await fetch(`${ERP_ENDPOINT}?table=${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) { console.warn(`insert ${table} failed:`, res.status); return null; }
    return await res.json();
  } catch (e) { console.warn(`insert ${table} error:`, e); return null; }
}

async function apiUpdate(table: string, id: string, patch: Record<string, unknown>): Promise<any | null> {
  try {
    const res = await fetch(`${ERP_ENDPOINT}?table=${table}&id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) { console.warn(`update ${table} failed:`, res.status); return null; }
    return await res.json();
  } catch (e) { console.warn(`update ${table} error:`, e); return null; }
}

async function apiDelete(table: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`${ERP_ENDPOINT}?table=${table}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  } catch { return false; }
}

// ============================================================
// STORE
// ============================================================

interface ErpState {
  loaded: boolean;
  loading: boolean;
  error: string | null;

  buses: ErpBus[];
  busHealth: ErpBusHealth[];
  busExpenses: ErpBusExpense[];
  crew: ErpCrew[];
  crewDocuments: ErpCrewDocument[];
  shifts: ErpShift[];
  slaScores: ErpSlaScore[];
  seatInventory: ErpSeatInventory[];
  seatLocks: ErpSeatLock[];
  channelSales: ErpChannelSale[];
  routes: ErpRoute[];
  schedules: ErpSchedule[];
  liveTrips: ErpLiveTrip[];
  earnings: ErpEarning[];
  settlements: ErpSettlement[];
  payouts: ErpPayout[];
  maintenanceLogs: ErpMaintenanceLog[];
  partReplacements: ErpPartReplacement[];
  compliance: ErpCompliance[];
  insights: ErpInsight[];
  expenses: ErpExpense[];
  plReports: ErpPlReport[];
  profile: ErpPartnerProfile | null;
  roles: ErpRole[];
  auditLogs: ErpAuditLog[];
  apiKeys: ErpApiKey[];

  loadAll: () => Promise<void>;
  insert: (table: string, record: Record<string, unknown>) => Promise<void>;
  update: (table: string, id: string, patch: Record<string, unknown>) => Promise<void>;
  remove: (table: string, id: string) => Promise<void>;
  logAction: (action: string, entity: string, entityId: string, details?: Record<string, unknown>) => Promise<void>;
}

const TABLE_TO_STATE_KEY: Record<string, keyof ErpState> = {
  erp_buses: 'buses',
  erp_bus_health: 'busHealth',
  erp_bus_expenses: 'busExpenses',
  erp_crew: 'crew',
  erp_crew_documents: 'crewDocuments',
  erp_shifts: 'shifts',
  erp_sla_scores: 'slaScores',
  erp_seat_inventory: 'seatInventory',
  erp_seat_locks: 'seatLocks',
  erp_channel_sales: 'channelSales',
  erp_routes: 'routes',
  erp_schedules: 'schedules',
  erp_live_trips: 'liveTrips',
  erp_earnings: 'earnings',
  erp_settlements: 'settlements',
  erp_payouts: 'payouts',
  erp_maintenance_logs: 'maintenanceLogs',
  erp_part_replacements: 'partReplacements',
  erp_compliance: 'compliance',
  erp_insights: 'insights',
  erp_expenses: 'expenses',
  erp_pl_reports: 'plReports',
  erp_partner_profile: 'profile',
  erp_roles: 'roles',
  erp_audit_logs: 'auditLogs',
  erp_api_keys: 'apiKeys',
};

export const useErpStore = create<ErpState>((set, get) => ({
  loaded: false,
  loading: false,
  error: null,

  buses: [], busHealth: [], busExpenses: [],
  crew: [], crewDocuments: [], shifts: [], slaScores: [],
  seatInventory: [], seatLocks: [], channelSales: [],
  routes: [], schedules: [], liveTrips: [],
  earnings: [], settlements: [], payouts: [],
  maintenanceLogs: [], partReplacements: [], compliance: [],
  insights: [],
  expenses: [], plReports: [],
  profile: null,
  roles: [], auditLogs: [], apiKeys: [],

  loadAll: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null });
    try {
      const tables = Object.keys(TABLE_TO_STATE_KEY);
      const results = await Promise.all(tables.map((t) => apiGet(t)));
      const patch: Partial<ErpState> = { loading: false, loaded: true };
      tables.forEach((t, i) => {
        const key = TABLE_TO_STATE_KEY[t];
        if (key === 'profile') {
          (patch as any)[key] = (results[i][0] as ErpPartnerProfile) ?? null;
        } else {
          (patch as any)[key] = results[i] ?? [];
        }
      });
      set(patch);
    } catch (e: any) {
      set({ loading: false, error: e.message });
    }
  },

  insert: async (table, record) => {
    const data = await apiInsert(table, record);
    if (!data) return;
    const key = TABLE_TO_STATE_KEY[table];
    if (!key) return;
    if (key === 'profile') {
      set({ profile: data as ErpPartnerProfile });
    } else {
      set((s) => ({ [key]: [data, ...((s as any)[key] as any[])] } as any));
    }
  },

  update: async (table, id, patch) => {
    const data = await apiUpdate(table, id, patch);
    if (!data) return;
    const key = TABLE_TO_STATE_KEY[table];
    if (!key) return;
    if (key === 'profile') {
      set({ profile: data as ErpPartnerProfile });
    } else {
      set((s) => ({ [key]: ((s as any)[key] as any[]).map((r: any) => r.id === id ? data : r) } as any));
    }
  },

  remove: async (table, id) => {
    const ok = await apiDelete(table, id);
    if (!ok) return;
    const key = TABLE_TO_STATE_KEY[table];
    if (!key || key === 'profile') return;
    set((s) => ({ [key]: ((s as any)[key] as any[]).filter((r: any) => r.id !== id) } as any));
  },

  logAction: async (action, entity, entityId, details = {}) => {
    const data = await apiInsert('erp_audit_logs', {
      action, entity_type: entity, entity_id: entityId,
      user_name: 'Partner Admin', user_role: 'Admin',
      details, ip_address: null,
    });
    if (data) {
      set((s) => ({ auditLogs: [data as ErpAuditLog, ...s.auditLogs].slice(0, 500) }));
    }
  },
}));

// ============================================================
// DERIVED ANALYTICS
// ============================================================

export function fleetHealthScore(buses: ErpBus[]): number {
  if (!buses.length) return 100;
  let total = 0;
  buses.forEach((b) => {
    let score = 100;
    if (b.status === 'maintenance') score -= 30;
    if (b.fuel_pct < 30) score -= 15;
    if (b.gps_status === 'offline') score -= 10;
    const today = new Date().toISOString().slice(0, 10);
    if (b.next_maintenance && b.next_maintenance <= today) score -= 20;
    if (b.permit_expiry && b.permit_expiry <= today) score -= 25;
    total += Math.max(0, score);
  });
  return Math.round(total / buses.length);
}

export function crewSlaAverage(slaScores: ErpSlaScore[]): number {
  if (!slaScores.length) return 100;
  return Math.round(slaScores.reduce((s, r) => s + r.overall_score, 0) / slaScores.length);
}

export function routeProfitability(channelSales: ErpChannelSale[], expenses: ErpExpense[]): { route: string; revenue: number; cost: number; profit: number }[] {
  const revByRoute = new Map<string, number>();
  channelSales.forEach((s) => {
    const r = s.route ?? 'Unknown';
    revByRoute.set(r, (revByRoute.get(r) ?? 0) + s.net_amount);
  });
  const totalCost = expenses.reduce((s, e) => s + e.amount, 0);
  const routeCount = Math.max(1, revByRoute.size);
  const costPerRoute = totalCost / routeCount;
  return Array.from(revByRoute.entries()).map(([route, revenue]) => ({
    route, revenue, cost: costPerRoute, profit: revenue - costPerRoute,
  })).sort((a, b) => b.profit - a.profit);
}

export function bookingHeatmap(channelSales: ErpChannelSale[]): { date: string; count: number; revenue: number }[] {
  const map = new Map<string, { count: number; revenue: number }>();
  channelSales.forEach((s) => {
    const e = map.get(s.travel_date) ?? { count: 0, revenue: 0 };
    e.count += s.seats_sold;
    e.revenue += s.net_amount;
    map.set(s.travel_date, e);
  });
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
}

export function totalEarnings(earnings: ErpEarning[]): { gross: number; net: number; commission: number; gst: number } {
  return earnings.reduce((s, e) => ({
    gross: s.gross + e.gross_amount,
    net: s.net + e.net_amount,
    commission: s.commission + e.commission_amount,
    gst: s.gst + e.gst_amount,
  }), { gross: 0, net: 0, commission: 0, gst: 0 });
}

export function totalExpenses(expenses: ErpExpense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}

export function expensesByCategory(expenses: ErpExpense[]): { category: string; total: number }[] {
  const map = new Map<string, number>();
  expenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
  return Array.from(map.entries()).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

export function expiringCompliance(compliance: ErpCompliance[], withinDays = 30): ErpCompliance[] {
  const limit = new Date(Date.now() + withinDays * 86400000).toISOString().slice(0, 10);
  return compliance.filter((c) => c.expiry_date <= limit);
}

export function expiringLicenses(crew: ErpCrew[], withinDays = 30): ErpCrew[] {
  const limit = new Date(Date.now() + withinDays * 86400000).toISOString().slice(0, 10);
  return crew.filter((c) => c.license_expiry && c.license_expiry <= limit);
}

export function fmtINR(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}
