-- ============================================================
-- YLT Travels — Transit OS Complete MySQL Schema
-- Canonical copy: public/api/schema.sql  (PHP install.php)
-- Go embed:      backend/internal/migrate/schema.sql
-- Deploy copy:   deploy/schema.sql
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- PHP (Hostinger now) and Go (Azure later) share this file.
-- install.php (no query): CREATE IF NOT EXISTS, ADD columns, DROP unused tables only. Data is not wiped.
-- install.php?drop=1: nuclear — admin JWT required; drops every table then reapplies this file.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- AUTH & USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT,
  name VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX users_email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employees (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'operator',
  phone VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX employees_email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partners (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  agency_name VARCHAR(255),
  phone VARCHAR(50),
  city VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0800,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX partners_email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_codes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX otp_codes_email_idx (email),
  INDEX otp_codes_expires_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jwt_denylist (
  jti CHAR(36) NOT NULL PRIMARY KEY,
  expires_at INT NOT NULL,
  INDEX jwt_denylist_exp_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jwt_activity (
  jti VARCHAR(64) NOT NULL PRIMARY KEY,
  last_seen INT NOT NULL,
  idle_sec INT NOT NULL DEFAULT 1800,
  expires_at INT NOT NULL,
  INDEX jwt_activity_seen_idx (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_throttle (
  id CHAR(36) NOT NULL PRIMARY KEY,
  k VARCHAR(190) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX auth_throttle_k_idx (k, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  id INT NOT NULL DEFAULT 1 PRIMARY KEY,
  upi_id VARCHAR(255),
  upi_name VARCHAR(255),
  upi_qr_url TEXT,
  bank_name VARCHAR(255),
  account_name VARCHAR(255),
  account_number VARCHAR(255),
  ifsc VARCHAR(50),
  branch VARCHAR(255),
  whatsapp_number VARCHAR(50),
  support_email VARCHAR(255),
  fare_tax_percent DECIMAL(5,2) DEFAULT 0,
  smtp_host VARCHAR(255),
  smtp_port INT DEFAULT 465,
  smtp_user VARCHAR(255),
  smtp_password TEXT,
  smtp_from_email VARCHAR(255),
  smtp_from_name VARCHAR(255),
  smtp_secure TINYINT(1) DEFAULT 1,
  email_enabled TINYINT(1) DEFAULT 0,
  inventory_provider VARCHAR(50) DEFAULT 'ylt_db',
  bitla_api_url VARCHAR(500) DEFAULT '',
  bitla_api_key VARCHAR(255) DEFAULT '',
  bitla_operator_id VARCHAR(100) DEFAULT '',
  razorpay_key_id VARCHAR(255) DEFAULT '',
  razorpay_secret TEXT,
  payment_provider VARCHAR(30) DEFAULT 'razorpay',
  payments_enabled TINYINT(1) DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO app_settings (id, smtp_from_email, smtp_from_name, smtp_host, smtp_port, smtp_secure, inventory_provider, payment_provider, payments_enabled)
VALUES (1, 'noreply@ylttravels.com', 'YLT Travels', 'smtp.hostinger.com', 465, 1, 'ylt_db', 'razorpay', 1);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  pnr VARCHAR(20) NOT NULL UNIQUE,
  bus_id VARCHAR(255),
  bus_name VARCHAR(255),
  operator VARCHAR(255),
  from_city VARCHAR(100) NOT NULL,
  to_city VARCHAR(100) NOT NULL,
  travel_date VARCHAR(50) NOT NULL,
  departure_time VARCHAR(50) NOT NULL,
  seats TEXT NOT NULL,
  passengers TEXT NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
  user_identifier VARCHAR(255),
  user_type VARCHAR(30) NOT NULL DEFAULT 'customer',
  boarding_point VARCHAR(255),
  dropping_point VARCHAR(255),
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  utr VARCHAR(255),
  partner_id VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX bookings_pnr_idx (pnr),
  INDEX bookings_user_identifier_idx (user_identifier),
  INDEX bookings_payment_status_idx (payment_status),
  INDEX bookings_partner_idx (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  pnr VARCHAR(20) NOT NULL UNIQUE,
  hotel_id VARCHAR(64),
  hotel_name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(50),
  check_in VARCHAR(50) NOT NULL,
  check_out VARCHAR(50) NOT NULL,
  rooms INT NOT NULL DEFAULT 1,
  guests INT NOT NULL DEFAULT 1,
  room_type VARCHAR(100) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
  user_identifier VARCHAR(255),
  payment_status VARCHAR(30) NOT NULL DEFAULT 'paid',
  partner_id VARCHAR(64),
  customer_id VARCHAR(64),
  person_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX hotel_bookings_pnr_idx (pnr),
  INDEX hotel_bookings_user_idx (user_identifier),
  INDEX hotel_bookings_email_idx (guest_email),
  INDEX hotel_bookings_partner_idx (partner_id),
  INDEX hotel_bookings_person_idx (person_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  booking_id CHAR(36),
  pnr VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  method VARCHAR(30) NOT NULL DEFAULT 'upi',
  utr VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  submitted_by VARCHAR(255),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  INDEX payments_pnr_idx (pnr),
  INDEX payments_booking_id_idx (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CMS / CATALOG
-- ============================================================

CREATE TABLE IF NOT EXISTS directors (
  id CHAR(36) NOT NULL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  bio TEXT,
  image_url TEXT,
  linkedin_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  promo_code VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  discount_value VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL DEFAULT '2026-12-31',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  tag VARCHAR(50) NOT NULL DEFAULT 'Bus',
  tone VARCHAR(100) NOT NULL DEFAULT 'from-navy-800 to-navy-600',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX offers_promo_code_idx (promo_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO offers (id, promo_code, title, description, discount_value, expiry_date, is_active, tag, tone) VALUES
  ('a1111111-1111-4111-8111-111111111111', 'FIRST500', '₹500 off first trip', 'Use FIRST500 on AC and sleeper seats across South India.', '₹500', '2026-12-31', 1, 'Bus', 'from-navy-800 to-navy-600'),
  ('a2222222-2222-4222-8222-222222222222', 'STANDSTAY', 'Stay next to the stand', 'Verified hotels within 200m of major bus terminals.', 'Hotel combo', '2026-12-31', 1, 'Hotel', 'from-gold-600 to-gold-500'),
  ('a3333333-3333-4333-8333-333333333333', 'WOMENSAFE', 'Women-safe seats', 'Ladies quota and women-rated operators, one tap.', 'Ladies quota', '2026-12-31', 1, 'Women', 'from-navy-700 to-slate-700'),
  ('a4444444-4444-4444-8444-444444444444', 'YLTPAY', 'Pay on Razorpay', 'UPI, cards and net banking in one secure checkout.', 'Razorpay', '2026-12-31', 1, 'Pay', 'from-slate-800 to-navy-900');

CREATE TABLE IF NOT EXISTS hotels (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  area VARCHAR(255),
  address TEXT,
  star_rating INT NOT NULL DEFAULT 3,
  description TEXT,
  amenities TEXT,
  image_url TEXT,
  gallery_urls TEXT,
  price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  rooms_available INT NOT NULL DEFAULT 5,
  rating DECIMAL(3,2) NOT NULL DEFAULT 4.00,
  reviews INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX hotels_city_idx (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  source VARCHAR(50) NOT NULL DEFAULT 'footer',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX newsletter_email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_templates (
  id CHAR(36) NOT NULL PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(255) NOT NULL,
  body_html LONGTEXT NOT NULL,
  available_variables JSON,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO email_templates (id, `key`, name, subject, body_html) VALUES
  ('c1111111-1111-4111-8111-111111111111', 'otp_login', 'OTP Login', 'Your YLT Travels Login Code', '<p>Your YLT Travels login code is <strong>{{code}}</strong>. Valid for 10 minutes. No SMS is sent.</p>'),
  ('c2222222-2222-4222-8222-222222222222', 'booking_confirmation', 'Booking Confirmation', 'Booking Confirmed - {{pnr}}', '<p>Your booking is confirmed. PNR: {{pnr}}</p>'),
  ('c3333333-3333-4333-8333-333333333333', 'test_smtp', 'SMTP Test', 'YLT Travels SMTP Test', '<p>SMTP test successful.</p>'),
  ('c4444444-4444-4444-8444-444444444444', 'welcome', 'Welcome', 'Welcome to YLT Travels', '<p>Welcome aboard!</p>');

CREATE TABLE IF NOT EXISTS employee_files (
  id CHAR(36) NOT NULL PRIMARY KEY,
  uploaded_by_email VARCHAR(255) DEFAULT '',
  uploaded_by_name VARCHAR(255) DEFAULT '',
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255) DEFAULT 'application/octet-stream',
  size_bytes BIGINT DEFAULT 0,
  folder VARCHAR(100) DEFAULT 'General',
  description TEXT,
  file_data LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ERP — BUS OPERATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_buses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  layout TEXT,
  total_seats INT DEFAULT 36,
  amenities JSON,
  permit_expiry DATE,
  insurance_expiry DATE,
  status VARCHAR(30) DEFAULT 'active',
  fuel_pct DECIMAL(5,2) DEFAULT 100.00,
  gps_status VARCHAR(30) DEFAULT 'online',
  route_id CHAR(36),
  driver_id CHAR(36),
  cleaner_id CHAR(36),
  photo_url TEXT,
  next_maintenance DATE,
  last_service_date DATE,
  engine_hours DECIMAL(10,2) DEFAULT 0,
  odometer_km DECIMAL(12,2) DEFAULT 0,
  partner_id VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_bus_health (
  id CHAR(36) NOT NULL PRIMARY KEY,
  bus_id CHAR(36),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  engine_temp_c DECIMAL(5,2),
  tire_pressure_psi DECIMAL(6,2),
  battery_volt DECIMAL(5,2),
  emissions_ok TINYINT(1) DEFAULT 1,
  fuel_pct DECIMAL(5,2),
  gps_status VARCHAR(30),
  odometer_km DECIMAL(12,2),
  engine_hours DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_bus_expenses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  bus_id CHAR(36),
  date DATE,
  category VARCHAR(100),
  amount DECIMAL(10,2),
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ERP — CREW & WORKFORCE
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_crew (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50),
  license_number VARCHAR(100),
  license_expiry DATE,
  assigned_vehicle_id CHAR(36),
  status VARCHAR(30) DEFAULT 'active',
  salary DECIMAL(10,2),
  photo_url TEXT,
  address TEXT,
  emergency_contact VARCHAR(100),
  joined_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_crew_documents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  crew_id CHAR(36),
  doc_type VARCHAR(100),
  doc_number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  verified TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_shifts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  crew_id CHAR(36),
  shift_date DATE,
  start_time VARCHAR(20),
  end_time VARCHAR(20),
  route_id CHAR(36),
  bus_id CHAR(36),
  status VARCHAR(30) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_sla_scores (
  id CHAR(36) NOT NULL PRIMARY KEY,
  crew_id CHAR(36),
  period VARCHAR(30),
  on_time_pct DECIMAL(5,2),
  cancellation_count INT DEFAULT 0,
  customer_rating DECIMAL(3,2),
  safety_incidents INT DEFAULT 0,
  overall_score DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ERP — SEAT INVENTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_seat_inventory (
  id CHAR(36) NOT NULL PRIMARY KEY,
  bus_id CHAR(36),
  travel_date DATE,
  seat_number VARCHAR(20),
  status VARCHAR(30) DEFAULT 'available',
  channel VARCHAR(50),
  booking_pnr VARCHAR(20),
  passenger_name VARCHAR(255),
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_seat (bus_id, travel_date, seat_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_seat_locks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  bus_id CHAR(36),
  travel_date DATE,
  seat_numbers JSON,
  locked_by VARCHAR(255),
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_channel_sales (
  id CHAR(36) NOT NULL PRIMARY KEY,
  booking_pnr VARCHAR(20),
  channel VARCHAR(50),
  route VARCHAR(255),
  travel_date DATE,
  seats_sold INT DEFAULT 0,
  gross_amount DECIMAL(10,2),
  commission_pct DECIMAL(5,2),
  commission_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  status VARCHAR(30) DEFAULT 'posted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ERP — TRIPS & SCHEDULES
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_routes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  from_city VARCHAR(100),
  to_city VARCHAR(100),
  stops JSON,
  distance_km INT,
  duration_mins INT,
  base_fare DECIMAL(10,2),
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_schedules (
  id CHAR(36) NOT NULL PRIMARY KEY,
  route_id CHAR(36),
  bus_id CHAR(36),
  driver_id CHAR(36),
  cleaner_id CHAR(36),
  departure_date DATE,
  departure_time VARCHAR(20),
  arrival_time VARCHAR(20),
  recurrence VARCHAR(30) DEFAULT 'daily',
  status VARCHAR(30) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_live_trips (
  id CHAR(36) NOT NULL PRIMARY KEY,
  schedule_id CHAR(36),
  bus_id CHAR(36),
  route_name VARCHAR(255),
  status VARCHAR(30) DEFAULT 'scheduled',
  current_location VARCHAR(255),
  eta_minutes INT,
  speed_kmph DECIMAL(6,2),
  delay_minutes INT DEFAULT 0,
  passengers_onboard INT DEFAULT 0,
  started_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ERP — EARNINGS & SETTLEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_earnings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  date DATE,
  channel VARCHAR(50),
  gross_amount DECIMAL(10,2),
  commission_pct DECIMAL(5,2),
  commission_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  gst_amount DECIMAL(10,2),
  booking_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_settlements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  period VARCHAR(30),
  channel VARCHAR(50),
  gross_amount DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  gst_amount DECIMAL(10,2),
  net_payable DECIMAL(10,2),
  status VARCHAR(30) DEFAULT 'pending',
  settled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_payouts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  period VARCHAR(30),
  amount DECIMAL(10,2),
  status VARCHAR(30) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  utr_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ERP — MAINTENANCE & COMPLIANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_maintenance_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  bus_id CHAR(36),
  service_date DATE,
  service_type VARCHAR(100),
  odometer_km DECIMAL(12,2),
  cost DECIMAL(10,2),
  service_center VARCHAR(255),
  description TEXT,
  next_service_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_part_replacements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  bus_id CHAR(36),
  maintenance_log_id CHAR(36),
  part_name VARCHAR(255),
  part_number VARCHAR(100),
  quantity INT DEFAULT 1,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  replaced_date DATE,
  warranty_expiry DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_compliance (
  id CHAR(36) NOT NULL PRIMARY KEY,
  bus_id CHAR(36),
  doc_type VARCHAR(100),
  doc_number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(30) DEFAULT 'valid',
  alert_days INT DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ERP — INSIGHTS
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_insights (
  id CHAR(36) NOT NULL PRIMARY KEY,
  insight_type VARCHAR(100),
  entity_id VARCHAR(255),
  entity_name VARCHAR(255),
  score DECIMAL(5,2),
  metric_label VARCHAR(255),
  metric_value VARCHAR(255),
  trend VARCHAR(30),
  recommendation TEXT,
  severity VARCHAR(30) DEFAULT 'info',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ERP — EXPENSES & P&L
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_expenses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  date DATE,
  category VARCHAR(100),
  sub_category VARCHAR(100),
  amount DECIMAL(10,2),
  bus_id CHAR(36),
  crew_id CHAR(36),
  description TEXT,
  receipt_url TEXT,
  gst_applicable TINYINT(1) DEFAULT 0,
  gst_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_pl_reports (
  id CHAR(36) NOT NULL PRIMARY KEY,
  period VARCHAR(30),
  revenue DECIMAL(10,2),
  expenses DECIMAL(10,2),
  net_profit DECIMAL(10,2),
  margin_pct DECIMAL(5,2),
  report_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ERP — PARTNER PROFILE
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_partner_profile (
  id CHAR(36) NOT NULL PRIMARY KEY,
  company_name VARCHAR(255),
  legal_name VARCHAR(255),
  gst_number VARCHAR(50),
  pan_number VARCHAR(50),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  logo_url TEXT,
  brand_color VARCHAR(20) DEFAULT '#0b1f3a',
  bank_name VARCHAR(255),
  bank_account_number VARCHAR(100),
  bank_ifsc VARCHAR(50),
  bank_branch VARCHAR(255),
  upi_id VARCHAR(100),
  website_url VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ERP — ACCESS & SECURITY
-- ============================================================

CREATE TABLE IF NOT EXISTS erp_roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL UNIQUE,
  permissions JSON,
  description TEXT,
  user_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  action VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  details JSON,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_api_keys (
  id CHAR(36) NOT NULL PRIMARY KEY,
  key_name VARCHAR(255) NOT NULL,
  api_key_prefix VARCHAR(50),
  permissions JSON,
  status VARCHAR(30) DEFAULT 'active',
  last_used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id CHAR(36) NOT NULL PRIMARY KEY,
  hotel_id VARCHAR(64) NOT NULL,
  partner_id VARCHAR(64),
  room_number VARCHAR(30) NOT NULL,
  floor VARCHAR(20),
  room_type VARCHAR(100) NOT NULL DEFAULT 'Standard',
  rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'vacant',
  hk_status VARCHAR(30) NOT NULL DEFAULT 'clean',
  booking_id CHAR(36),
  guest_name VARCHAR(255),
  photo_url TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX hotel_rooms_hotel_idx (hotel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_rate_plans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  partner_id VARCHAR(64),
  hotel_id VARCHAR(64),
  name VARCHAR(120) NOT NULL,
  room_type VARCHAR(100) NOT NULL DEFAULT 'Standard',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  meal_plan VARCHAR(40) NOT NULL DEFAULT 'Room only',
  refundable TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX hotel_rates_partner_idx (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_folio_charges (
  id CHAR(36) NOT NULL PRIMARY KEY,
  partner_id VARCHAR(64),
  booking_id VARCHAR(64) NOT NULL,
  pnr VARCHAR(30),
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  charge_type VARCHAR(40) NOT NULL DEFAULT 'other',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX hotel_folio_booking_idx (booking_id),
  INDEX hotel_folio_partner_idx (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_notes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  partner_id VARCHAR(64),
  hotel_id VARCHAR(64),
  booking_id VARCHAR(64),
  guest_key VARCHAR(190),
  kind VARCHAR(30) NOT NULL DEFAULT 'note',
  title VARCHAR(255),
  body TEXT,
  due_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX hotel_notes_partner_idx (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_people (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255),
  phone VARCHAR(40),
  email_hash CHAR(64),
  phone_hash CHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY crm_people_email_hash (email_hash),
  UNIQUE KEY crm_people_phone_hash (phone_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_customers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  person_id CHAR(36),
  name VARCHAR(255) NOT NULL DEFAULT '',
  city VARCHAR(100),
  tags TEXT,
  notes TEXT,
  last_stay DATE NULL,
  last_trip DATE NULL,
  first_seen TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY partner_customers_pair (partner_id, person_id),
  INDEX partner_customers_partner_idx (partner_id),
  INDEX partner_customers_person_idx (person_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  thread_key VARCHAR(190) NOT NULL,
  channel VARCHAR(40) NOT NULL DEFAULT 'web',
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX chat_thread_idx (thread_key, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_cars (
  id CHAR(36) NOT NULL PRIMARY KEY,
  partner_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'Sedan',
  pricing_model VARCHAR(50) NOT NULL DEFAULT 'per_km',
  rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  fuel_pct INT NOT NULL DEFAULT 100,
  driver_name VARCHAR(255),
  next_maintenance DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX partner_cars_partner_idx (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feedback_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  pnr VARCHAR(20) NOT NULL,
  booking_type VARCHAR(20) NOT NULL,
  booking_id VARCHAR(64),
  email VARCHAR(255),
  score TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX feedback_pnr_idx (pnr)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS help_articles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Booking',
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  body TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY help_articles_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  partner_id VARCHAR(64),
  posted_by VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  location VARCHAR(120),
  department VARCHAR(80) NOT NULL DEFAULT 'Operations',
  employment_type VARCHAR(40) NOT NULL DEFAULT 'Full-time',
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX jobs_status_idx (status),
  INDEX jobs_partner_idx (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_applications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  cover_note TEXT,
  resume_path VARCHAR(500),
  resume_filename VARCHAR(255),
  id_proof_path VARCHAR(500),
  id_proof_filename VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX job_applications_job_idx (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_cancel_policies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  partner_id VARCHAR(64),
  name VARCHAR(120) NOT NULL,
  hours_before INT NOT NULL DEFAULT 6,
  refund_pct DECIMAL(5,2) NOT NULL DEFAULT 80.00,
  body TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX erp_cancel_partner_idx (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_campaigns (
  id CHAR(36) NOT NULL PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX partner_campaigns_partner_idx (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

