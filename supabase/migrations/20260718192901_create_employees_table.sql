/*
# Create employees table for YLT internal staff

1. New Tables
- `employees` — stores YLT Travels internal staff (admin, operator roles).
  - `id` (uuid, primary key)
  - `email` (text, unique, not null) — login email
  - `password_hash` (text, not null) — bcrypt hash from PHP backend
  - `name` (text, not null) — employee display name
  - `role` (text, not null, default 'operator') — 'admin' | 'operator' | 'manager'
  - `phone` (text)
  - `status` (text, default 'active') — active / suspended / pending
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `employees`.
- Allow anon + authenticated CRUD since the PHP backend is the source of truth
  for employee auth (same pattern as the partners table).

3. Notes
- The PHP `auth.php` endpoint will query this table to validate staff logins.
- Employees are created via the install.php admin console.
- This is separate from `partners` (agent partners who list buses/cars).
*/

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'operator',
  phone text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_employees" ON employees;
CREATE POLICY "anon_read_employees" ON employees FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_employees" ON employees;
CREATE POLICY "anon_insert_employees" ON employees FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_employees" ON employees;
CREATE POLICY "anon_update_employees" ON employees FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_employees" ON employees;
CREATE POLICY "anon_delete_employees" ON employees FOR DELETE
  TO anon, authenticated USING (true);
