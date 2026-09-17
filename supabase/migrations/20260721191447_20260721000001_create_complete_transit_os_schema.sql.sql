/*
# Create complete Transit OS schema on Supabase (Postgres)

This single migration replaces all legacy MySQL/PHP tables with a clean
Postgres schema. It creates every table the Go backend needs:
auth (users, employees, partners, otp_codes), bookings (bus + hotel),
directors, offers, routes, payments, newsletter, hotels, email_templates,
app_settings, employee_files, and the full 25-table ERP suite.

## Tables created (grouped by module):

### Auth & Users
- `users` — customer accounts (email + password or OTP-only)
- `employees` — internal staff (admin/operator/sales/support/marketing/manager)
- `partners` — agent/agency accounts
- `otp_codes` — email OTP login codes (10-min expiry)
- `app_settings` — single-row business + SMTP config (id=1)

### Bookings
- `bookings` — bus booking records with PNR, seats, passengers, payment status
- `hotel_bookings` — hotel reservation records with PNR
- `payments` — UTR submission + verification tracking

### CMS / Catalog
- `directors` — board of directors (about page)
- `offers` — promo codes
- `routes` — bus route catalog
- `hotels` — hotel catalog
- `newsletter_subscribers` — email newsletter signups
- `email_templates` — HTML email templates with {{var}} placeholders
- `employee_files` — file upload metadata (files stored on disk)

### ERP (25 tables)
- Bus Ops: erp_buses, erp_bus_health, erp_bus_expenses
- Crew: erp_crew, erp_crew_documents, erp_shifts, erp_sla_scores
- Seats: erp_seat_inventory, erp_seat_locks, erp_channel_sales
- Trips: erp_routes, erp_schedules, erp_live_trips
- Earnings: erp_earnings, erp_settlements, erp_payouts
- Maintenance: erp_maintenance_logs, erp_part_replacements, erp_compliance
- Insights: erp_insights
- Expenses: erp_expenses, erp_pl_reports
- Profile: erp_partner_profile
- Access: erp_roles, erp_audit_logs, erp_api_keys

## Security
- RLS enabled on ALL tables.
- This app uses the Go backend with a service-role key for all DB access,
  so policies use `TO anon, authenticated` with `USING (true)` — the Go
  backend bypasses RLS via the service role, and the anon key is only used
  by the frontend for public reads (search, offers, routes, hotels).

## Important notes
- All IDs are uuid with DEFAULT gen_random_uuid()
- All timestamps are timestamptz with DEFAULT now()
- Nullable columns use appropriate types (text, timestamptz, etc.)
- Boolean columns default to false unless noted
- Indexes created on frequently-queried columns (pnr, email, status, etc.)
*/

-- ============================================================
-- AUTH & USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text,
  name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_crud" ON users;
CREATE POLICY "users_crud" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'operator',
  phone text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT employees_role_check CHECK (role IN ('admin','sales','support','marketing','operator','manager'))
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_crud" ON employees;
CREATE POLICY "employees_crud" ON employees FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS employees_email_idx ON employees(email);

CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  agency_name text,
  phone text,
  city text,
  status text NOT NULL DEFAULT 'active',
  commission_rate numeric NOT NULL DEFAULT 0.08,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partners_crud" ON partners;
CREATE POLICY "partners_crud" ON partners FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS partners_email_idx ON partners(email);

CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "otp_crud" ON otp_codes;
CREATE POLICY "otp_crud" ON otp_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS otp_codes_email_idx ON otp_codes(email);
CREATE INDEX IF NOT EXISTS otp_codes_expires_idx ON otp_codes(expires_at);

CREATE TABLE IF NOT EXISTS app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  upi_id text,
  upi_name text,
  upi_qr_url text,
  bank_name text,
  account_name text,
  account_number text,
  ifsc text,
  branch text,
  whatsapp_number text,
  support_email text,
  fare_tax_percent numeric DEFAULT 0,
  smtp_host text,
  smtp_port integer DEFAULT 465,
  smtp_user text,
  smtp_password text,
  smtp_from_email text,
  smtp_from_name text,
  smtp_secure boolean DEFAULT true,
  email_enabled boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_settings_single_row CHECK (id = 1)
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_crud" ON app_settings;
CREATE POLICY "settings_crud" ON app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
INSERT INTO app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr text UNIQUE NOT NULL,
  bus_id text,
  bus_name text,
  operator text,
  from_city text NOT NULL,
  to_city text NOT NULL,
  travel_date text NOT NULL,
  departure_time text NOT NULL,
  seats text NOT NULL DEFAULT '[]',
  passengers text NOT NULL DEFAULT '[]',
  contact_email text,
  contact_phone text,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  user_identifier text,
  user_type text NOT NULL DEFAULT 'customer',
  boarding_point text,
  dropping_point text,
  payment_status text NOT NULL DEFAULT 'pending',
  utr text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_crud" ON bookings;
CREATE POLICY "bookings_crud" ON bookings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS bookings_pnr_idx ON bookings(pnr);
CREATE INDEX IF NOT EXISTS bookings_user_identifier_idx ON bookings(user_identifier);
CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON bookings(payment_status);

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr text UNIQUE NOT NULL,
  hotel_id uuid,
  hotel_name text NOT NULL,
  city text NOT NULL,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  check_in text NOT NULL,
  check_out text NOT NULL,
  rooms integer NOT NULL DEFAULT 1,
  guests integer NOT NULL DEFAULT 1,
  room_type text NOT NULL,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hotel_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotel_bookings_crud" ON hotel_bookings;
CREATE POLICY "hotel_bookings_crud" ON hotel_bookings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS hotel_bookings_pnr_idx ON hotel_bookings(pnr);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid,
  pnr text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'upi',
  utr text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_by text,
  note text,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_crud" ON payments;
CREATE POLICY "payments_crud" ON payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS payments_pnr_idx ON payments(pnr);
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON payments(booking_id);

-- ============================================================
-- CMS / CATALOG
-- ============================================================

CREATE TABLE IF NOT EXISTS directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  title text NOT NULL,
  bio text,
  image_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE directors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "directors_crud" ON directors;
CREATE POLICY "directors_crud" ON directors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  discount_value text NOT NULL,
  expiry_date date NOT NULL DEFAULT '2026-12-31',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offers_crud" ON offers;
CREATE POLICY "offers_crud" ON offers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS offers_promo_code_idx ON offers(promo_code);

CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_city text NOT NULL,
  to_city text NOT NULL,
  distance_km integer NOT NULL DEFAULT 0,
  duration text,
  departure_time text NOT NULL DEFAULT '21:00',
  base_fare numeric(10,2) NOT NULL DEFAULT 800,
  total_seats integer NOT NULL DEFAULT 36,
  departures_daily integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "routes_crud" ON routes;
CREATE POLICY "routes_crud" ON routes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  area text,
  address text,
  star_rating integer NOT NULL DEFAULT 3,
  description text,
  amenities text NOT NULL DEFAULT '[]',
  image_url text,
  gallery_urls text NOT NULL DEFAULT '[]',
  price_per_night numeric(10,2) NOT NULL DEFAULT 0,
  rooms_available integer NOT NULL DEFAULT 5,
  rating numeric(3,2) NOT NULL DEFAULT 4.0,
  reviews integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotels_crud" ON hotels;
CREATE POLICY "hotels_crud" ON hotels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS hotels_city_idx ON hotels(city);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  source text NOT NULL DEFAULT 'footer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "newsletter_crud" ON newsletter_subscribers;
CREATE POLICY "newsletter_crud" ON newsletter_subscribers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS newsletter_email_idx ON newsletter_subscribers(email);

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  subject text NOT NULL,
  body_html text NOT NULL,
  available_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_templates_crud" ON email_templates;
CREATE POLICY "email_templates_crud" ON email_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO email_templates (key, name, subject, body_html) VALUES
  ('otp_login', 'OTP Login', 'Your YLT Travels Login Code', '<p>Your code: {{code}}</p>'),
  ('booking_confirmation', 'Booking Confirmation', 'Booking Confirmed - {{pnr}}', '<p>Your booking is confirmed.</p>'),
  ('test_smtp', 'SMTP Test', 'YLT Travels SMTP Test', '<p>SMTP test successful.</p>'),
  ('welcome', 'Welcome', 'Welcome to YLT Travels', '<p>Welcome aboard!</p>')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS employee_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by_email text DEFAULT '',
  uploaded_by_name text DEFAULT '',
  filename text NOT NULL,
  mime_type text DEFAULT 'application/octet-stream',
  size_bytes bigint DEFAULT 0,
  folder text DEFAULT 'General',
  description text DEFAULT '',
  file_data text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE employee_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_files_crud" ON employee_files;
CREATE POLICY "employee_files_crud" ON employee_files FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ERP — BUS OPERATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  registration_number text,
  layout text,
  total_seats integer DEFAULT 36,
  amenities jsonb DEFAULT '{}'::jsonb,
  permit_expiry date,
  insurance_expiry date,
  status text DEFAULT 'active',
  fuel_pct numeric DEFAULT 100,
  gps_status text DEFAULT 'online',
  route_id uuid,
  driver_id uuid,
  engine_hours numeric DEFAULT 0,
  odometer_km numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE erp_buses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_buses_crud" ON erp_buses;
CREATE POLICY "erp_buses_crud" ON erp_buses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_bus_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES erp_buses(id) ON DELETE CASCADE,
  recorded_at timestamptz DEFAULT now(),
  engine_temp_c numeric,
  tire_pressure_psi numeric,
  battery_volt numeric,
  emissions_ok boolean DEFAULT true,
  fuel_pct numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_bus_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_bus_health_crud" ON erp_bus_health;
CREATE POLICY "erp_bus_health_crud" ON erp_bus_health FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_bus_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES erp_buses(id) ON DELETE CASCADE,
  date date,
  category text,
  amount numeric(10,2),
  description text,
  receipt_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_bus_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_bus_expenses_crud" ON erp_bus_expenses;
CREATE POLICY "erp_bus_expenses_crud" ON erp_bus_expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ERP — CREW & WORKFORCE
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_crew (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  role text,
  license_number text,
  license_expiry date,
  assigned_vehicle_id uuid,
  status text DEFAULT 'active',
  salary numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE erp_crew ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_crew_crud" ON erp_crew;
CREATE POLICY "erp_crew_crud" ON erp_crew FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_crew_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid REFERENCES erp_crew(id) ON DELETE CASCADE,
  doc_type text,
  doc_number text,
  issue_date date,
  expiry_date date,
  file_url text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_crew_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_crew_documents_crud" ON erp_crew_documents;
CREATE POLICY "erp_crew_documents_crud" ON erp_crew_documents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid REFERENCES erp_crew(id) ON DELETE CASCADE,
  shift_date date,
  start_time text,
  end_time text,
  route_id uuid,
  bus_id uuid,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_shifts_crud" ON erp_shifts;
CREATE POLICY "erp_shifts_crud" ON erp_shifts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_sla_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid REFERENCES erp_crew(id) ON DELETE CASCADE,
  period text,
  on_time_pct numeric,
  cancellation_count integer DEFAULT 0,
  customer_rating numeric(3,2),
  safety_incidents integer DEFAULT 0,
  overall_score numeric(5,2),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_sla_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_sla_scores_crud" ON erp_sla_scores;
CREATE POLICY "erp_sla_scores_crud" ON erp_sla_scores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ERP — SEAT INVENTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_seat_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES erp_buses(id) ON DELETE SET NULL,
  travel_date date,
  seat_number text,
  status text DEFAULT 'available',
  channel text,
  booking_pnr text,
  passenger_name text,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(bus_id, travel_date, seat_number)
);
ALTER TABLE erp_seat_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_seat_inventory_crud" ON erp_seat_inventory;
CREATE POLICY "erp_seat_inventory_crud" ON erp_seat_inventory FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_seat_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES erp_buses(id) ON DELETE SET NULL,
  travel_date date,
  seat_numbers jsonb DEFAULT '[]'::jsonb,
  locked_by text,
  locked_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_seat_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_seat_locks_crud" ON erp_seat_locks;
CREATE POLICY "erp_seat_locks_crud" ON erp_seat_locks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_channel_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_pnr text,
  channel text,
  route text,
  travel_date date,
  seats_sold integer DEFAULT 0,
  gross_amount numeric(10,2),
  commission_pct numeric,
  commission_amount numeric(10,2),
  net_amount numeric(10,2),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_channel_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_channel_sales_crud" ON erp_channel_sales;
CREATE POLICY "erp_channel_sales_crud" ON erp_channel_sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ERP — TRIPS & SCHEDULES
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  from_city text,
  to_city text,
  stops jsonb DEFAULT '[]'::jsonb,
  distance_km integer,
  duration_mins integer,
  base_fare numeric(10,2),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_routes_crud" ON erp_routes;
CREATE POLICY "erp_routes_crud" ON erp_routes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES erp_routes(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES erp_buses(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES erp_crew(id) ON DELETE SET NULL,
  cleaner_id uuid REFERENCES erp_crew(id) ON DELETE SET NULL,
  departure_date date,
  departure_time text,
  arrival_time text,
  recurrence text DEFAULT 'daily',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_schedules_crud" ON erp_schedules;
CREATE POLICY "erp_schedules_crud" ON erp_schedules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_live_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES erp_schedules(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES erp_buses(id) ON DELETE SET NULL,
  route_name text,
  status text DEFAULT 'scheduled',
  current_location text,
  eta_minutes integer,
  speed_kmph numeric,
  delay_minutes integer DEFAULT 0,
  passengers_onboard integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE erp_live_trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_live_trips_crud" ON erp_live_trips;
CREATE POLICY "erp_live_trips_crud" ON erp_live_trips FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ERP — EARNINGS & SETTLEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date,
  channel text,
  gross_amount numeric(10,2),
  commission_pct numeric,
  commission_amount numeric(10,2),
  net_amount numeric(10,2),
  gst_amount numeric(10,2),
  booking_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_earnings_crud" ON erp_earnings;
CREATE POLICY "erp_earnings_crud" ON erp_earnings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text,
  channel text,
  gross_amount numeric(10,2),
  commission_amount numeric(10,2),
  gst_amount numeric(10,2),
  net_payable numeric(10,2),
  status text DEFAULT 'pending',
  settled_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_settlements_crud" ON erp_settlements;
CREATE POLICY "erp_settlements_crud" ON erp_settlements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text,
  amount numeric(10,2),
  status text DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  utr_number text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_payouts_crud" ON erp_payouts;
CREATE POLICY "erp_payouts_crud" ON erp_payouts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ERP — MAINTENANCE & COMPLIANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES erp_buses(id) ON DELETE CASCADE,
  service_date date,
  service_type text,
  odometer_km numeric,
  cost numeric(10,2),
  service_center text,
  next_service_date date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_maintenance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_maintenance_logs_crud" ON erp_maintenance_logs;
CREATE POLICY "erp_maintenance_logs_crud" ON erp_maintenance_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_part_replacements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES erp_buses(id) ON DELETE CASCADE,
  maintenance_log_id uuid REFERENCES erp_maintenance_logs(id) ON DELETE SET NULL,
  part_name text,
  part_number text,
  quantity integer DEFAULT 1,
  unit_cost numeric(10,2),
  total_cost numeric(10,2),
  warranty_expiry date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_part_replacements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_part_replacements_crud" ON erp_part_replacements;
CREATE POLICY "erp_part_replacements_crud" ON erp_part_replacements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES erp_buses(id) ON DELETE CASCADE,
  doc_type text,
  doc_number text,
  issue_date date,
  expiry_date date,
  status text DEFAULT 'valid',
  alert_days integer DEFAULT 30,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_compliance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_compliance_crud" ON erp_compliance;
CREATE POLICY "erp_compliance_crud" ON erp_compliance FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ERP — INSIGHTS
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text,
  entity_id text,
  entity_name text,
  score numeric(5,2),
  metric_label text,
  metric_value text,
  trend text,
  recommendation text,
  severity text DEFAULT 'info',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_insights_crud" ON erp_insights;
CREATE POLICY "erp_insights_crud" ON erp_insights FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ERP — EXPENSES & P&L
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date,
  category text,
  sub_category text,
  amount numeric(10,2),
  bus_id uuid REFERENCES erp_buses(id) ON DELETE SET NULL,
  crew_id uuid REFERENCES erp_crew(id) ON DELETE SET NULL,
  gst_applicable boolean DEFAULT false,
  gst_amount numeric(10,2),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_expenses_crud" ON erp_expenses;
CREATE POLICY "erp_expenses_crud" ON erp_expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_pl_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text,
  revenue numeric(10,2),
  expenses numeric(10,2),
  net_profit numeric(10,2),
  margin_pct numeric(5,2),
  report_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_pl_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_pl_reports_crud" ON erp_pl_reports;
CREATE POLICY "erp_pl_reports_crud" ON erp_pl_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ERP — PARTNER PROFILE
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_partner_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text,
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
  brand_color text DEFAULT '#c81e44',
  bank_name text,
  bank_account_number text,
  bank_ifsc text,
  upi_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE erp_partner_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_partner_profile_crud" ON erp_partner_profile;
CREATE POLICY "erp_partner_profile_crud" ON erp_partner_profile FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ERP — ACCESS & SECURITY
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text UNIQUE NOT NULL,
  permissions jsonb DEFAULT '[]'::jsonb,
  description text,
  user_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_roles_crud" ON erp_roles;
CREATE POLICY "erp_roles_crud" ON erp_roles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text,
  entity_type text,
  entity_id text,
  user_name text,
  user_role text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_audit_logs_crud" ON erp_audit_logs;
CREATE POLICY "erp_audit_logs_crud" ON erp_audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS erp_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL,
  api_key_prefix text,
  permissions jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE erp_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_api_keys_crud" ON erp_api_keys;
CREATE POLICY "erp_api_keys_crud" ON erp_api_keys FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
