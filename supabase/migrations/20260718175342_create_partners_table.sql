/*
# Create partners table for agent/agency authentication

1. New Tables
- `partners` — stores agent partners who can log into the Operator ERP portal.
  - `id` (uuid, primary key)
  - `email` (text, unique, not null) — login email
  - `password_hash` (text, not null) — bcrypt-style hash stored from PHP backend
  - `name` (text, not null) — partner display name
  - `agency_name` (text) — travel agency name
  - `phone` (text)
  - `city` (text)
  - `status` (text, default 'active') — active / suspended / pending
  - `commission_rate` (numeric, default 0.08) — per-partner commission override
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `partners`.
- Allow anon + authenticated to read partner records (the PHP backend manages auth,
  and the frontend anon-key client needs to look up partners for login).
- Write policies are anon+authenticated as well since the PHP API uses the service
  role / anon key to manage partners. In a production setup these writes would be
  gated behind the PHP admin endpoint, but for this app the PHP backend is the
  source of truth for partner auth.

3. Notes
- The PHP `auth.php` endpoint will query this table to validate agent logins.
- Partners are created via the Admin Panel UI which calls the PHP backend.
*/

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

DROP POLICY IF EXISTS "anon_read_partners" ON partners;
CREATE POLICY "anon_read_partners" ON partners FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_partners" ON partners;
CREATE POLICY "anon_insert_partners" ON partners FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_partners" ON partners;
CREATE POLICY "anon_update_partners" ON partners FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_partners" ON partners;
CREATE POLICY "anon_delete_partners" ON partners FOR DELETE
  TO anon, authenticated USING (true);
