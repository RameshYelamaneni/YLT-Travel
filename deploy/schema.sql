-- ============================================================
-- YLT Travels — Transit OS Complete MySQL Schema
-- Database: global_bookings
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- Replaces all legacy PHP/MySQL tables with a clean schema for the Go backend.
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
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX otp_codes_email_idx (email),
  INDEX otp_codes_expires_idx (expires_at)
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO app_settings (id) VALUES (1);

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX bookings_pnr_idx (pnr),
  INDEX bookings_user_identifier_idx (user_identifier),
  INDEX bookings_payment_status_idx (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  pnr VARCHAR(20) NOT NULL UNIQUE,
  hotel_id CHAR(36),
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX hotel_bookings_pnr_idx (pnr)
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX offers_promo_code_idx (promo_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS routes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  from_city VARCHAR(100) NOT NULL,
  to_city VARCHAR(100) NOT NULL,
  distance_km INT NOT NULL DEFAULT 0,
  duration VARCHAR(100),
  departure_time VARCHAR(50) NOT NULL DEFAULT '21:00',
  base_fare DECIMAL(10,2) NOT NULL DEFAULT 800.00,
  total_seats INT NOT NULL DEFAULT 36,
  departures_daily INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

INSERT IGNORE INTO email_templates (`key`, name, subject, body_html) VALUES
  ('otp_login', 'OTP Login', 'Your YLT Travels Login Code', '<p>Your code: {{code}}</p>'),
  ('booking_confirmation', 'Booking Confirmation', 'Booking Confirmed - {{pnr}}', '<p>Your booking is confirmed.</p>'),
  ('test_smtp', 'SMTP Test', 'YLT Travels SMTP Test', '<p>SMTP test successful.</p>'),
  ('welcome', 'Welcome', 'Welcome to YLT Travels', '<p>Welcome aboard!</p>');

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
  engine_hours DECIMAL(10,2) DEFAULT 0,
  odometer_km DECIMAL(12,2) DEFAULT 0,
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
  warranty_expiry DATE,
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
  brand_color VARCHAR(20) DEFAULT '#c81e44',
  bank_name VARCHAR(255),
  bank_account_number VARCHAR(100),
  bank_ifsc VARCHAR(50),
  upi_id VARCHAR(100),
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

SET FOREIGN_KEY_CHECKS = 1;
