/*
# Create directors and app_settings tables

## Purpose
Stores the Board of Directors and app configuration for the YLT Transit OS admin panel.

## 1. New Tables

### directors
- `id` (uuid, primary key)
- `name` (text, not null) — director's full name
- `role` (text, not null) — job title / role
- `bio` (text) — short biography
- `image_url` (text) — hosted image URL only. NEVER base64. A CHECK constraint rejects data: URIs so bloated base64 strings can never be stored again.
- `linkedin_url` (text) — optional LinkedIn profile link
- `order_index` (int, default 0) — display ordering
- `created_at` (timestamptz)

### app_settings
- `id` (uuid, primary key)
- `upi_id` (text)
- `whatsapp_number` (text)
- `support_email` (text)
- `fare_tax_percent` (numeric, default 5)

## 2. Security (RLS)
- This is a single-tenant admin/content app with NO sign-in screen.
- RLS enabled on both tables with full CRUD for `anon, authenticated` since the content is intentionally public/shared.
- The `image_url` CHECK constraint enforces URL-only storage at the database level — the original bug (base64 strings bloating the DB and breaking image rendering) is now impossible.

## 3. Important Notes
- The CHECK constraint `image_url NOT LIKE 'data:%'` blocks base64 data URIs at the DB boundary.
- NULL image_url is allowed (director with no photo yet).
*/

CREATE TABLE IF NOT EXISTS directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  bio text DEFAULT '',
  image_url text,
  linkedin_url text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_base64_image CHECK (image_url IS NULL OR image_url NOT LIKE 'data:%')
);

ALTER TABLE directors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_directors" ON directors;
CREATE POLICY "anon_select_directors" ON directors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_directors" ON directors;
CREATE POLICY "anon_insert_directors" ON directors FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_directors" ON directors;
CREATE POLICY "anon_update_directors" ON directors FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_directors" ON directors;
CREATE POLICY "anon_delete_directors" ON directors FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text DEFAULT 'ylt@upi',
  whatsapp_number text DEFAULT '919999999999',
  support_email text DEFAULT 'support@ylt.in',
  fare_tax_percent numeric DEFAULT 5
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON app_settings;
CREATE POLICY "anon_select_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON app_settings;
CREATE POLICY "anon_insert_settings" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON app_settings;
CREATE POLICY "anon_update_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
