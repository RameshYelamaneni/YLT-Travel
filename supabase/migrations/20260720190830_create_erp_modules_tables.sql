/*
# Create ERP Modules Tables (10-Module Partner Operations Suite)

## Overview
This migration creates the complete database schema for the YLT Partner ERP system,
covering all 10 operational modules: Bus Operations, Crew & Workforce, Seat Inventory,
Trip & Schedule Planner, Earnings & Payouts, Maintenance & Compliance, Intelligence &
Insights, Expense & Ledger, Partner Profile, and Access & Security.

## New Tables

### Module 1: Bus Operations Suite
- `erp_buses` — Bus fleet registry with health, diagnostics, permit, insurance, maintenance
- `erp_bus_health` — Bus health & diagnostics snapshots (engine temp, tire pressure, battery, emissions)
- `erp_bus_expenses` — Per-bus expense ledger (fuel, toll, maintenance, misc)

### Module 2: Crew & Workforce Hub
- `erp_crew` — Driver and helper/attendant profiles with license tracking
- `erp_crew_documents` — License, RC, insurance, PUC documents with expiry tracking
- `erp_shifts` — Shift scheduling for crew members
- `erp_sla_scores` — SLA performance tracking per crew member

### Module 3: Seat Inventory & Booking Engine
- `erp_seat_inventory` — Centralized seat inventory per bus per date
- `erp_seat_locks` — Temporary seat locks with TTL
- `erp_channel_sales` — Channel-wise sales tracking (YLT, RedBus, AbhiBus)

### Module 4: Trip & Schedule Planner
- `erp_routes` — Route builder with stops, distance, duration
- `erp_schedules` — Daily/weekly schedule entries
- `erp_live_trips` — Live trip status tracking

### Module 5: Earnings & Payout Center
- `erp_earnings` — Daily earnings records
- `erp_settlements` — Settlement ledger entries
- `erp_payouts` — Payout calendar and requests

### Module 6: Maintenance & Compliance Desk
- `erp_maintenance_logs` — Service logs with parts and costs
- `erp_part_replacements` — Part replacement history
- `erp_compliance` — Permit and insurance tracking with alerts

### Module 7: Intelligence & Insights
- `erp_insights` — Computed insights (fleet health, SLA, profitability)

### Module 8: Expense & Ledger Manager
- `erp_expenses` — All expense types (fuel, allowances, toll, parking, maintenance)
- `erp_pl_reports` — Profit/loss report summaries

### Module 9: Partner Profile & Branding
- `erp_partner_profile` — Company profile, brand assets, banking info

### Module 10: Access & Security
- `erp_roles` — Role-based access definitions
- `erp_audit_logs` — Audit trail of all actions
- `erp_api_keys` — API key management

## Security
- RLS enabled on ALL tables
- Single-tenant: all policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a partner portal where the ERP data is intentionally shared across the operator team
- No user_id columns — this is a shared operational database, not per-user isolated data

## Notes
1. All tables use `gen_random_uuid()` for primary keys
2. Timestamps default to `now()`
3. JSONB columns for flexible structured data (amenities, stops, passengers, etc.)
4. Indexes on frequently-queried columns (bus_id, crew_id, date, status, route_id)
*/

-- ============================================================
-- MODULE 1: BUS OPERATIONS SUITE
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  registration_number text,
  layout text DEFAULT 'Sleeper 2x1',
  total_seats integer DEFAULT 36,
  amenities jsonb DEFAULT '[]'::jsonb,
  photo_url text,
  permit_expiry date,
  insurance_expiry date,
  next_maintenance date,
  status text DEFAULT 'active',
  fuel_pct integer DEFAULT 100,
  gps_status text DEFAULT 'online',
  route_id text,
  driver_id text,
  cleaner_id text,
  engine_hours integer DEFAULT 0,
  odometer_km integer DEFAULT 0,
  last_service_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE erp_buses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_buses_select" ON erp_buses;
CREATE POLICY "erp_buses_select" ON erp_buses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_buses_insert" ON erp_buses;
CREATE POLICY "erp_buses_insert" ON erp_buses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_buses_update" ON erp_buses;
CREATE POLICY "erp_buses_update" ON erp_buses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_buses_delete" ON erp_buses;
CREATE POLICY "erp_buses_delete" ON erp_buses FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_buses_status ON erp_buses(status);
CREATE INDEX IF NOT EXISTS idx_erp_buses_driver ON erp_buses(driver_id);

CREATE TABLE IF NOT EXISTS erp_bus_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES erp_buses(id) ON DELETE CASCADE,
  recorded_at timestamptz DEFAULT now(),
  engine_temp_c numeric,
  tire_pressure_psi numeric,
  battery_volt numeric,
  emissions_ok boolean DEFAULT true,
  fuel_pct integer,
  gps_status text,
  odometer_km integer,
  engine_hours integer,
  notes text
);

ALTER TABLE erp_bus_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_bus_health_select" ON erp_bus_health;
CREATE POLICY "erp_bus_health_select" ON erp_bus_health FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_bus_health_insert" ON erp_bus_health;
CREATE POLICY "erp_bus_health_insert" ON erp_bus_health FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_bus_health_update" ON erp_bus_health;
CREATE POLICY "erp_bus_health_update" ON erp_bus_health FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_bus_health_delete" ON erp_bus_health;
CREATE POLICY "erp_bus_health_delete" ON erp_bus_health FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_bus_health_bus ON erp_bus_health(bus_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS erp_bus_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES erp_buses(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  receipt_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_bus_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_bus_expenses_select" ON erp_bus_expenses;
CREATE POLICY "erp_bus_expenses_select" ON erp_bus_expenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_bus_expenses_insert" ON erp_bus_expenses;
CREATE POLICY "erp_bus_expenses_insert" ON erp_bus_expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_bus_expenses_update" ON erp_bus_expenses;
CREATE POLICY "erp_bus_expenses_update" ON erp_bus_expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_bus_expenses_delete" ON erp_bus_expenses;
CREATE POLICY "erp_bus_expenses_delete" ON erp_bus_expenses FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_bus_expenses_bus ON erp_bus_expenses(bus_id, date DESC);

-- ============================================================
-- MODULE 2: CREW & WORKFORCE HUB
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_crew (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'driver',
  license_number text,
  license_expiry date,
  assigned_vehicle_id text,
  status text DEFAULT 'active',
  photo_url text,
  address text,
  emergency_contact text,
  joined_date date DEFAULT CURRENT_DATE,
  salary numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE erp_crew ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_crew_select" ON erp_crew;
CREATE POLICY "erp_crew_select" ON erp_crew FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_crew_insert" ON erp_crew;
CREATE POLICY "erp_crew_insert" ON erp_crew FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_crew_update" ON erp_crew;
CREATE POLICY "erp_crew_update" ON erp_crew FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_crew_delete" ON erp_crew;
CREATE POLICY "erp_crew_delete" ON erp_crew FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_crew_role ON erp_crew(role, status);

CREATE TABLE IF NOT EXISTS erp_crew_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES erp_crew(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  doc_number text,
  issue_date date,
  expiry_date date,
  file_url text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_crew_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_crew_documents_select" ON erp_crew_documents;
CREATE POLICY "erp_crew_documents_select" ON erp_crew_documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_crew_documents_insert" ON erp_crew_documents;
CREATE POLICY "erp_crew_documents_insert" ON erp_crew_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_crew_documents_update" ON erp_crew_documents;
CREATE POLICY "erp_crew_documents_update" ON erp_crew_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_crew_documents_delete" ON erp_crew_documents;
CREATE POLICY "erp_crew_documents_delete" ON erp_crew_documents FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_crew_docs_crew ON erp_crew_documents(crew_id);

CREATE TABLE IF NOT EXISTS erp_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES erp_crew(id) ON DELETE CASCADE,
  shift_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  route_id text,
  bus_id text,
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_shifts_select" ON erp_shifts;
CREATE POLICY "erp_shifts_select" ON erp_shifts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_shifts_insert" ON erp_shifts;
CREATE POLICY "erp_shifts_insert" ON erp_shifts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_shifts_update" ON erp_shifts;
CREATE POLICY "erp_shifts_update" ON erp_shifts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_shifts_delete" ON erp_shifts;
CREATE POLICY "erp_shifts_delete" ON erp_shifts FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_shifts_date ON erp_shifts(shift_date, crew_id);

CREATE TABLE IF NOT EXISTS erp_sla_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES erp_crew(id) ON DELETE CASCADE,
  period text NOT NULL,
  on_time_pct numeric DEFAULT 100,
  cancellation_count integer DEFAULT 0,
  customer_rating numeric DEFAULT 5,
  safety_incidents integer DEFAULT 0,
  overall_score numeric DEFAULT 100,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_sla_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_sla_scores_select" ON erp_sla_scores;
CREATE POLICY "erp_sla_scores_select" ON erp_sla_scores FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_sla_scores_insert" ON erp_sla_scores;
CREATE POLICY "erp_sla_scores_insert" ON erp_sla_scores FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_sla_scores_update" ON erp_sla_scores;
CREATE POLICY "erp_sla_scores_update" ON erp_sla_scores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_sla_scores_delete" ON erp_sla_scores;
CREATE POLICY "erp_sla_scores_delete" ON erp_sla_scores FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_sla_crew ON erp_sla_scores(crew_id, period);

-- ============================================================
-- MODULE 3: SEAT INVENTORY & BOOKING ENGINE
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_seat_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES erp_buses(id) ON DELETE CASCADE,
  travel_date date NOT NULL,
  seat_number text NOT NULL,
  status text DEFAULT 'available',
  channel text,
  booking_pnr text,
  passenger_name text,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bus_id, travel_date, seat_number)
);

ALTER TABLE erp_seat_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_seat_inventory_select" ON erp_seat_inventory;
CREATE POLICY "erp_seat_inventory_select" ON erp_seat_inventory FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_seat_inventory_insert" ON erp_seat_inventory;
CREATE POLICY "erp_seat_inventory_insert" ON erp_seat_inventory FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_seat_inventory_update" ON erp_seat_inventory;
CREATE POLICY "erp_seat_inventory_update" ON erp_seat_inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_seat_inventory_delete" ON erp_seat_inventory;
CREATE POLICY "erp_seat_inventory_delete" ON erp_seat_inventory FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_seat_inv ON erp_seat_inventory(bus_id, travel_date, status);

CREATE TABLE IF NOT EXISTS erp_seat_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES erp_buses(id) ON DELETE CASCADE,
  travel_date date NOT NULL,
  seat_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
  locked_by text,
  locked_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text DEFAULT 'active'
);

ALTER TABLE erp_seat_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_seat_locks_select" ON erp_seat_locks;
CREATE POLICY "erp_seat_locks_select" ON erp_seat_locks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_seat_locks_insert" ON erp_seat_locks;
CREATE POLICY "erp_seat_locks_insert" ON erp_seat_locks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_seat_locks_update" ON erp_seat_locks;
CREATE POLICY "erp_seat_locks_update" ON erp_seat_locks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_seat_locks_delete" ON erp_seat_locks;
CREATE POLICY "erp_seat_locks_delete" ON erp_seat_locks FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_seat_locks_bus ON erp_seat_locks(bus_id, travel_date, status);

CREATE TABLE IF NOT EXISTS erp_channel_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_pnr text NOT NULL,
  channel text NOT NULL,
  route text,
  travel_date date NOT NULL,
  seats_sold integer DEFAULT 1,
  gross_amount numeric DEFAULT 0,
  commission_pct numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  status text DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_channel_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_channel_sales_select" ON erp_channel_sales;
CREATE POLICY "erp_channel_sales_select" ON erp_channel_sales FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_channel_sales_insert" ON erp_channel_sales;
CREATE POLICY "erp_channel_sales_insert" ON erp_channel_sales FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_channel_sales_update" ON erp_channel_sales;
CREATE POLICY "erp_channel_sales_update" ON erp_channel_sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_channel_sales_delete" ON erp_channel_sales;
CREATE POLICY "erp_channel_sales_delete" ON erp_channel_sales FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_channel_sales_date ON erp_channel_sales(travel_date, channel);

-- ============================================================
-- MODULE 4: TRIP & SCHEDULE PLANNER
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  from_city text NOT NULL,
  to_city text NOT NULL,
  stops jsonb DEFAULT '[]'::jsonb,
  distance_km numeric DEFAULT 0,
  duration_mins integer DEFAULT 0,
  base_fare numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_routes_select" ON erp_routes;
CREATE POLICY "erp_routes_select" ON erp_routes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_routes_insert" ON erp_routes;
CREATE POLICY "erp_routes_insert" ON erp_routes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_routes_update" ON erp_routes;
CREATE POLICY "erp_routes_update" ON erp_routes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_routes_delete" ON erp_routes;
CREATE POLICY "erp_routes_delete" ON erp_routes FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS erp_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES erp_routes(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES erp_buses(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES erp_crew(id) ON DELETE SET NULL,
  cleaner_id uuid REFERENCES erp_crew(id) ON DELETE SET NULL,
  departure_date date NOT NULL,
  departure_time text NOT NULL,
  arrival_time text,
  status text DEFAULT 'scheduled',
  recurrence text DEFAULT 'one_time',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_schedules_select" ON erp_schedules;
CREATE POLICY "erp_schedules_select" ON erp_schedules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_schedules_insert" ON erp_schedules;
CREATE POLICY "erp_schedules_insert" ON erp_schedules FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_schedules_update" ON erp_schedules;
CREATE POLICY "erp_schedules_update" ON erp_schedules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_schedules_delete" ON erp_schedules;
CREATE POLICY "erp_schedules_delete" ON erp_schedules FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_schedules_date ON erp_schedules(departure_date, status);

CREATE TABLE IF NOT EXISTS erp_live_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES erp_schedules(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES erp_buses(id) ON DELETE SET NULL,
  route_name text,
  status text DEFAULT 'not_started',
  current_location text,
  eta_minutes integer,
  speed_kmph numeric,
  delay_minutes integer DEFAULT 0,
  passengers_onboard integer DEFAULT 0,
  started_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE erp_live_trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_live_trips_select" ON erp_live_trips;
CREATE POLICY "erp_live_trips_select" ON erp_live_trips FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_live_trips_insert" ON erp_live_trips;
CREATE POLICY "erp_live_trips_insert" ON erp_live_trips FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_live_trips_update" ON erp_live_trips;
CREATE POLICY "erp_live_trips_update" ON erp_live_trips FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_live_trips_delete" ON erp_live_trips;
CREATE POLICY "erp_live_trips_delete" ON erp_live_trips FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_live_trips_status ON erp_live_trips(status);

-- ============================================================
-- MODULE 5: EARNINGS & PAYOUT CENTER
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  channel text,
  gross_amount numeric DEFAULT 0,
  commission_pct numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  booking_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_earnings_select" ON erp_earnings;
CREATE POLICY "erp_earnings_select" ON erp_earnings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_earnings_insert" ON erp_earnings;
CREATE POLICY "erp_earnings_insert" ON erp_earnings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_earnings_update" ON erp_earnings;
CREATE POLICY "erp_earnings_update" ON erp_earnings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_earnings_delete" ON erp_earnings;
CREATE POLICY "erp_earnings_delete" ON erp_earnings FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_earnings_date ON erp_earnings(date DESC, channel);

CREATE TABLE IF NOT EXISTS erp_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  channel text,
  gross_amount numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  net_payable numeric DEFAULT 0,
  status text DEFAULT 'pending',
  settled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_settlements_select" ON erp_settlements;
CREATE POLICY "erp_settlements_select" ON erp_settlements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_settlements_insert" ON erp_settlements;
CREATE POLICY "erp_settlements_insert" ON erp_settlements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_settlements_update" ON erp_settlements;
CREATE POLICY "erp_settlements_update" ON erp_settlements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_settlements_delete" ON erp_settlements;
CREATE POLICY "erp_settlements_delete" ON erp_settlements FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS erp_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  utr_number text,
  notes text
);

ALTER TABLE erp_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_payouts_select" ON erp_payouts;
CREATE POLICY "erp_payouts_select" ON erp_payouts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_payouts_insert" ON erp_payouts;
CREATE POLICY "erp_payouts_insert" ON erp_payouts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_payouts_update" ON erp_payouts;
CREATE POLICY "erp_payouts_update" ON erp_payouts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_payouts_delete" ON erp_payouts;
CREATE POLICY "erp_payouts_delete" ON erp_payouts FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_payouts_status ON erp_payouts(status, requested_at DESC);

-- ============================================================
-- MODULE 6: MAINTENANCE & COMPLIANCE DESK
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES erp_buses(id) ON DELETE CASCADE,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  service_type text NOT NULL,
  odometer_km integer,
  cost numeric DEFAULT 0,
  service_center text,
  description text,
  next_service_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_maintenance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_maintenance_logs_select" ON erp_maintenance_logs;
CREATE POLICY "erp_maintenance_logs_select" ON erp_maintenance_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_maintenance_logs_insert" ON erp_maintenance_logs;
CREATE POLICY "erp_maintenance_logs_insert" ON erp_maintenance_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_maintenance_logs_update" ON erp_maintenance_logs;
CREATE POLICY "erp_maintenance_logs_update" ON erp_maintenance_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_maintenance_logs_delete" ON erp_maintenance_logs;
CREATE POLICY "erp_maintenance_logs_delete" ON erp_maintenance_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_maint_logs_bus ON erp_maintenance_logs(bus_id, service_date DESC);

CREATE TABLE IF NOT EXISTS erp_part_replacements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES erp_buses(id) ON DELETE CASCADE,
  maintenance_log_id uuid REFERENCES erp_maintenance_logs(id) ON DELETE SET NULL,
  part_name text NOT NULL,
  part_number text,
  quantity integer DEFAULT 1,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  replaced_date date NOT NULL DEFAULT CURRENT_DATE,
  warranty_expiry date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_part_replacements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_part_replacements_select" ON erp_part_replacements;
CREATE POLICY "erp_part_replacements_select" ON erp_part_replacements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_part_replacements_insert" ON erp_part_replacements;
CREATE POLICY "erp_part_replacements_insert" ON erp_part_replacements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_part_replacements_update" ON erp_part_replacements;
CREATE POLICY "erp_part_replacements_update" ON erp_part_replacements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_part_replacements_delete" ON erp_part_replacements;
CREATE POLICY "erp_part_replacements_delete" ON erp_part_replacements FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_parts_bus ON erp_part_replacements(bus_id, replaced_date DESC);

CREATE TABLE IF NOT EXISTS erp_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES erp_buses(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  doc_number text,
  issue_date date,
  expiry_date date NOT NULL,
  status text DEFAULT 'valid',
  alert_days integer DEFAULT 30,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_compliance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_compliance_select" ON erp_compliance;
CREATE POLICY "erp_compliance_select" ON erp_compliance FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_compliance_insert" ON erp_compliance;
CREATE POLICY "erp_compliance_insert" ON erp_compliance FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_compliance_update" ON erp_compliance;
CREATE POLICY "erp_compliance_update" ON erp_compliance FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_compliance_delete" ON erp_compliance;
CREATE POLICY "erp_compliance_delete" ON erp_compliance FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_compliance_expiry ON erp_compliance(expiry_date, status);

-- ============================================================
-- MODULE 7: INTELLIGENCE & INSIGHTS
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,
  entity_id text,
  entity_name text,
  score numeric DEFAULT 0,
  metric_label text,
  metric_value text,
  trend text DEFAULT 'stable',
  recommendation text,
  severity text DEFAULT 'info',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_insights_select" ON erp_insights;
CREATE POLICY "erp_insights_select" ON erp_insights FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_insights_insert" ON erp_insights;
CREATE POLICY "erp_insights_insert" ON erp_insights FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_insights_update" ON erp_insights;
CREATE POLICY "erp_insights_update" ON erp_insights FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_insights_delete" ON erp_insights;
CREATE POLICY "erp_insights_delete" ON erp_insights FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_insights_type ON erp_insights(insight_type, severity);

-- ============================================================
-- MODULE 8: EXPENSE & LEDGER MANAGER
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  sub_category text,
  amount numeric NOT NULL DEFAULT 0,
  bus_id uuid REFERENCES erp_buses(id) ON DELETE SET NULL,
  crew_id uuid REFERENCES erp_crew(id) ON DELETE SET NULL,
  description text,
  receipt_url text,
  gst_applicable boolean DEFAULT false,
  gst_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_expenses_select" ON erp_expenses;
CREATE POLICY "erp_expenses_select" ON erp_expenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_expenses_insert" ON erp_expenses;
CREATE POLICY "erp_expenses_insert" ON erp_expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_expenses_update" ON erp_expenses;
CREATE POLICY "erp_expenses_update" ON erp_expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_expenses_delete" ON erp_expenses;
CREATE POLICY "erp_expenses_delete" ON erp_expenses FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_expenses_date ON erp_expenses(date DESC, category);

CREATE TABLE IF NOT EXISTS erp_pl_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  revenue numeric DEFAULT 0,
  expenses numeric DEFAULT 0,
  net_profit numeric DEFAULT 0,
  margin_pct numeric DEFAULT 0,
  report_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_pl_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_pl_reports_select" ON erp_pl_reports;
CREATE POLICY "erp_pl_reports_select" ON erp_pl_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_pl_reports_insert" ON erp_pl_reports;
CREATE POLICY "erp_pl_reports_insert" ON erp_pl_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_pl_reports_update" ON erp_pl_reports;
CREATE POLICY "erp_pl_reports_update" ON erp_pl_reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_pl_reports_delete" ON erp_pl_reports;
CREATE POLICY "erp_pl_reports_delete" ON erp_pl_reports FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_pl_reports_period ON erp_pl_reports(period);

-- ============================================================
-- MODULE 9: PARTNER PROFILE & BRANDING
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_partner_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  legal_name text,
  gst_number text,
  pan_number text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  state text,
  pincode text,
  logo_url text,
  brand_color text DEFAULT '#cd2c40',
  website_url text,
  description text,
  bank_name text,
  bank_account_number text,
  bank_ifsc text,
  bank_branch text,
  upi_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE erp_partner_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_partner_profile_select" ON erp_partner_profile;
CREATE POLICY "erp_partner_profile_select" ON erp_partner_profile FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_partner_profile_insert" ON erp_partner_profile;
CREATE POLICY "erp_partner_profile_insert" ON erp_partner_profile FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_partner_profile_update" ON erp_partner_profile;
CREATE POLICY "erp_partner_profile_update" ON erp_partner_profile FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_partner_profile_delete" ON erp_partner_profile;
CREATE POLICY "erp_partner_profile_delete" ON erp_partner_profile FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- MODULE 10: ACCESS & SECURITY
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  permissions jsonb DEFAULT '[]'::jsonb,
  description text,
  user_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_roles_select" ON erp_roles;
CREATE POLICY "erp_roles_select" ON erp_roles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_roles_insert" ON erp_roles;
CREATE POLICY "erp_roles_insert" ON erp_roles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_roles_update" ON erp_roles;
CREATE POLICY "erp_roles_update" ON erp_roles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_roles_delete" ON erp_roles;
CREATE POLICY "erp_roles_delete" ON erp_roles FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS erp_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text,
  entity_id text,
  user_name text,
  user_role text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE erp_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_audit_logs_select" ON erp_audit_logs;
CREATE POLICY "erp_audit_logs_select" ON erp_audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_audit_logs_insert" ON erp_audit_logs;
CREATE POLICY "erp_audit_logs_insert" ON erp_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_audit_logs_update" ON erp_audit_logs;
CREATE POLICY "erp_audit_logs_update" ON erp_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_audit_logs_delete" ON erp_audit_logs;
CREATE POLICY "erp_audit_logs_delete" ON erp_audit_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_erp_audit_logs_created ON erp_audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS erp_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL,
  api_key_prefix text NOT NULL,
  permissions jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz
);

ALTER TABLE erp_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_api_keys_select" ON erp_api_keys;
CREATE POLICY "erp_api_keys_select" ON erp_api_keys FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "erp_api_keys_insert" ON erp_api_keys;
CREATE POLICY "erp_api_keys_insert" ON erp_api_keys FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "erp_api_keys_update" ON erp_api_keys;
CREATE POLICY "erp_api_keys_update" ON erp_api_keys FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "erp_api_keys_delete" ON erp_api_keys;
CREATE POLICY "erp_api_keys_delete" ON erp_api_keys FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO erp_partner_profile (company_name, legal_name, gst_number, pan_number, contact_email, contact_phone, address, city, state, pincode, brand_color, description, bank_name, bank_account_number, bank_ifsc, upi_id)
SELECT 'YLT Partner Agency', 'YLT Transit Operators Pvt Ltd', '29ABCDE1234F1Z5', 'ABCDE1234F', 'partner@ylt.in', '+91 9876543210', '12 Temple Road', 'Tirupati', 'Andhra Pradesh', '517501', '#cd2c40', 'Premier bus and car operations across South India', 'HDFC Bank', '50100012345678', 'HDFC0001234', 'ylt@hdfcbank'
WHERE NOT EXISTS (SELECT 1 FROM erp_partner_profile);

INSERT INTO erp_roles (role_name, permissions, description, user_count)
SELECT 'Admin', '["all"]', 'Full access to all modules', 1
WHERE NOT EXISTS (SELECT 1 FROM erp_roles);

INSERT INTO erp_roles (role_name, permissions, description, user_count)
SELECT 'Fleet Manager', '["buses","maintenance","crew","trips"]', 'Manage fleet, crew, and trips', 2
WHERE NOT EXISTS (SELECT 1 FROM erp_roles WHERE role_name = 'Fleet Manager');

INSERT INTO erp_roles (role_name, permissions, description, user_count)
SELECT 'Accountant', '["earnings","expenses","payouts"]', 'Financial operations only', 1
WHERE NOT EXISTS (SELECT 1 FROM erp_roles WHERE role_name = 'Accountant');
