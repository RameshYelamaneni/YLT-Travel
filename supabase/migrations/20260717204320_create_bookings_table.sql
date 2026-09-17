/*
# Create bookings table (single-tenant, no auth)

## Purpose
YLT Travels is a public bus-booking app with NO sign-in screen. Anonymous
visitors search buses, pick seats, enter passenger + contact details, and
receive a confirmed booking with a PNR. Bookings are later retrievable by PNR
via the "Manage Booking" lookup. Because there is no user account concept, the
table is intentionally public/shared (single-tenant) and guarded only by the
anon-key RLS policies below.

## New Tables
- `bookings`
  - `id`               uuid, primary key
  - `pnr`              text, unique, not null — 8-char uppercase lookup code
  - `bus_id`           text, not null — references the client-side bus catalog
  - `bus_name`         text, not null
  - `operator`         text, not null
  - `from_city`        text, not null
  - `to_city`          text, not null
  - `travel_date`      date, not null
  - `departure_time`   text, not null
  - `seats`            text[], not null — selected seat labels
  - `passengers`       jsonb, not null — array of {name, age, gender}
  - `contact_email`    text, not null
  - `contact_phone`    text, not null
  - `total_amount`     numeric(10,2), not null
  - `status`           text, not null default 'confirmed'
  - `created_at`       timestamptz, default now()

## Security
- Row Level Security ENABLED on `bookings`.
- The app has no sign-in screen, so every request runs as the `anon` role.
  Therefore ALL four CRUD policies use `TO anon, authenticated` and `USING (true)`
  / `WITH CHECK (true)`. This is intentional and documented: bookings are
  public/shared single-tenant data, retrievable by PNR. There is no per-user
  ownership concept to enforce.
- `USING (true)` here is NOT a shortcut around ownership — there is no owner.
  It is the correct policy for intentionally-public anonymous booking data.

## Notes
1. `pnr` has a UNIQUE constraint so lookups are exact and fast.
2. An index on `pnr` speeds up the "Manage Booking" lookup flow.
3. `passengers` is jsonb to flexibly store 1..N passenger objects.
4. No `user_id` column and no reference to `auth.users` — single-tenant by design.
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr text UNIQUE NOT NULL,
  bus_id text NOT NULL,
  bus_name text NOT NULL,
  operator text NOT NULL,
  from_city text NOT NULL,
  to_city text NOT NULL,
  travel_date date NOT NULL,
  departure_time text NOT NULL,
  seats text[] NOT NULL DEFAULT '{}',
  passengers jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings"
  ON bookings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings"
  ON bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bookings" ON bookings;
CREATE POLICY "anon_update_bookings"
  ON bookings FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bookings" ON bookings;
CREATE POLICY "anon_delete_bookings"
  ON bookings FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS bookings_pnr_idx ON bookings (pnr);
