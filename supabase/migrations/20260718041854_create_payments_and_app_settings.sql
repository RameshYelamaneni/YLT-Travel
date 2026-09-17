/*
# Create app_settings + payments tables; extend bookings with payment tracking

## Purpose
YLT Travels needs a manual UPI/bank payment flow (no paid gateway). Admins
configure the business PhonePe UPI ID + bank account once (stored in
app_settings). At checkout the customer pays externally, then submits a UTR
(transaction reference) which is recorded in `payments` and linked to their
booking. Admins verify the UTR in the CMS and mark the booking paid.

## New Tables

### `app_settings` — single-row key/value config store (admin-editable)
- id           integer, primary key (locked to 1)
- upi_id       text — e.g. 'ylttravels@ybl' (PhonePe / UPI)
- upi_name     text — display name for the UPI ID
- upi_qr_url   text — optional QR code image URL
- bank_name    text — e.g. 'HDFC Bank'
- account_name text — account holder name
- account_number text — bank account number
- ifsc         text — IFSC code
- branch       text — branch name
- updated_at   timestamptz

### `payments` — UTR submission tracking per booking
- id           uuid, primary key
- booking_id   uuid, references bookings(id) ON DELETE CASCADE
- pnr          text — denormalized for quick lookup
- amount       numeric(10,2) — amount the customer claims to have paid
- method       text — 'upi' | 'bank'
- utr          text — transaction reference entered by customer
- status       text — 'pending' | 'verified' | 'rejected' (default 'pending')
- submitted_by text — contact phone/email of the customer
- note         text — optional customer note
- created_at   timestamptz default now()
- verified_at  timestamptz — set when admin verifies/rejects

## Changes to existing table `bookings` (additive only)
- ADD `payment_status` text — 'pending' | 'paid' | 'verified' (default 'pending')
- ADD `utr` text — convenience copy of the latest submitted UTR (nullable)

## Security
- RLS ENABLED on app_settings and payments.
- This app uses Supabase email-OTP auth for CUSTOMERS, but agent/admin are
  client-gated mock roles. Because the anon-key frontend must read payment
  config (app_settings) and submit UTR (payments insert) AND look up payment
  status, SELECT/INSERT are open to `anon, authenticated`.
- UPDATE/DELETE on app_settings (admin config) and payments (admin verify) are
  also opened to `anon, authenticated` because the admin panel runs with the
  anon key (mock auth). This matches the existing CMS pattern in the codebase.
- USING(true) is intentional here: payment config is public/shared (customers
  must see UPI details to pay), and UTR submissions are intentionally
  world-writable so anonymous checkout can record them.

## Notes
1. app_settings is enforced single-row via a CHECK constraint (id = 1) and
   seeded with an empty default row so the admin UI has something to edit.
2. payments.booking_id FK cascades on booking delete.
3. Index on payments.pnr for the AI chat / admin lookup-by-PNR flow.
4. No destructive operations on bookings — columns are only added.
*/

-- ============ app_settings ============
CREATE TABLE IF NOT EXISTS app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  upi_id text NOT NULL DEFAULT '',
  upi_name text NOT NULL DEFAULT 'YLT Travels',
  upi_qr_url text,
  bank_name text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  ifsc text NOT NULL DEFAULT '',
  branch text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_settings_single_row CHECK (id = 1)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_app_settings" ON app_settings;
CREATE POLICY "anon_read_app_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_write_app_settings" ON app_settings;
CREATE POLICY "anon_write_app_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============ payments ============
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  pnr text NOT NULL,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL DEFAULT 'upi',
  utr text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_by text,
  note text,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments" ON payments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "anon_update_payments" ON payments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "anon_delete_payments" ON payments FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS payments_pnr_idx ON payments (pnr);
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON payments (booking_id);

-- ============ extend bookings ============
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS utr text;

CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON bookings (payment_status);
