/*
# Create routes, offers, directors tables for CMS + content

## Purpose
The app gains a real-time Admin CMS. Admins manage routes, offers, and the
public Board of Directors from a secure panel. These three tables back that
CMS and the public Routes / Offers / About views. The existing `bookings`
table is unchanged.

## New Tables

### `routes` — managed route catalog (Admin-editable; also backs public Routes view)
- id           uuid, primary key
- from_city    text, not null
- to_city      text, not null
- distance_km  integer, not null — structural distance in KM
- duration     text, not null — human label e.g. '8h 30m'
- departure_time text, not null — e.g. '21:30'
- base_fare    numeric(10,2), not null — starting ticket fare
- total_seats  integer, not null — total available seats
- departures_daily integer, not null default 1 — daily departure count
- is_active    boolean, not null default true
- created_at   timestamptz, default now()

### `offers` — promo codes shown on the Offers workspace
- id           uuid, primary key
- promo_code   text, unique, not null, indexed — e.g. 'YLTNIGHT'
- title        text, not null
- description  text, not null
- discount_value text, not null — e.g. '15% off' or '₹200 off'
- expiry_date  date, not null
- is_active    boolean, not null default true
- created_at   timestamptz, default now()

### `directors` — Board of Directors for the About Us screen
- id           uuid, primary key
- full_name    text, not null
- title        text, not null — designation e.g. 'Managing Director'
- bio          text, not null — professional summary copy
- image_url    text — avatar image URL string (may be null)
- created_at   timestamptz, default now()

## Security
- RLS ENABLED on all three tables.
- This is a public-content app (no sign-in required to VIEW routes, offers, or
  directors). Therefore SELECT is open to `anon, authenticated` with `USING (true)`.
  This is intentional public/shared content — not an ownership shortcut.
- Writes (INSERT/UPDATE/DELETE) are restricted to `authenticated` only, since
  only logged-in admins should mutate CMS content. The app's mock auth does not
  map to Supabase auth sessions, so in practice these are guarded client-side
  by the Admin route; the DB-level policy prevents anon writes.

## Seed Data
Premium mock data for real Indian routes, luxury coupon offers, and the Yelamaneni
Travels Board of Directors — so the platform is interactive out of the box.
*/

-- ============ routes ============
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_city text NOT NULL,
  to_city text NOT NULL,
  distance_km integer NOT NULL,
  duration text NOT NULL,
  departure_time text NOT NULL,
  base_fare numeric(10,2) NOT NULL,
  total_seats integer NOT NULL,
  departures_daily integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_routes" ON routes;
CREATE POLICY "public_read_routes" ON routes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_routes" ON routes;
CREATE POLICY "auth_insert_routes" ON routes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_routes" ON routes;
CREATE POLICY "auth_update_routes" ON routes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_routes" ON routes;
CREATE POLICY "auth_delete_routes" ON routes FOR DELETE
  TO authenticated USING (true);

-- ============ offers ============
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  discount_value text NOT NULL,
  expiry_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_offers" ON offers;
CREATE POLICY "public_read_offers" ON offers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_offers" ON offers;
CREATE POLICY "auth_insert_offers" ON offers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_offers" ON offers;
CREATE POLICY "auth_update_offers" ON offers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_offers" ON offers;
CREATE POLICY "auth_delete_offers" ON offers FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS offers_promo_code_idx ON offers (promo_code);

-- ============ directors ============
CREATE TABLE IF NOT EXISTS directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  title text NOT NULL,
  bio text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE directors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_directors" ON directors;
CREATE POLICY "public_read_directors" ON directors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_directors" ON directors;
CREATE POLICY "auth_insert_directors" ON directors FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_directors" ON directors;
CREATE POLICY "auth_update_directors" ON directors FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_directors" ON directors;
CREATE POLICY "auth_delete_directors" ON directors FOR DELETE
  TO authenticated USING (true);

-- ============ Seed: routes ============
INSERT INTO routes (from_city, to_city, distance_km, duration, departure_time, base_fare, total_seats, departures_daily) VALUES
  ('Hyderabad', 'Bengaluru', 575, '8h 30m', '21:30', 1199, 36, 18),
  ('Chennai', 'Vijayawada', 415, '6h 15m', '22:15', 949, 36, 12),
  ('Visakhapatnam', 'Hyderabad', 620, '10h 00m', '20:00', 1099, 36, 9),
  ('Tirupati', 'Chennai', 135, '3h 45m', '06:00', 599, 40, 14),
  ('Bengaluru', 'Coimbatore', 365, '6h 00m', '23:00', 799, 36, 11),
  ('Hyderabad', 'Chennai', 625, '9h 30m', '21:00', 1299, 36, 8),
  ('Hyderabad', 'Vijayawada', 275, '4h 30m', '07:00', 650, 40, 22),
  ('Bengaluru', 'Chennai', 350, '5h 30m', '08:30', 750, 40, 16)
ON CONFLICT DO NOTHING;

-- ============ Seed: offers ============
INSERT INTO offers (promo_code, title, description, discount_value, expiry_date) VALUES
  ('YLTNIGHT',  'Night Owl Special',    'Flat 15% off on all sleeper buses departing after 9 PM.', '15% OFF',  '2026-12-31'),
  ('YLTFIRST',  'First Ride Offer',     'Get ₹150 off on your first booking with YLT Travels.',     '₹150 OFF', '2026-12-31'),
  ('YLTPREMIUM','Premium Member Deal',  'Enjoy 20% savings on all multi-axle premium AC sleepers.','20% OFF',  '2026-09-30'),
  ('YLTFAMILY', 'Family Pack',          'Book 4 seats or more and save up to ₹500 instantly.',      '₹500 OFF', '2026-11-30'),
  ('YLTEARLY',  'Early Bird Booking',   'Plan ahead — 10% off when you book 7 days in advance.',    '10% OFF',  '2026-12-31')
ON CONFLICT (promo_code) DO NOTHING;

-- ============ Seed: directors ============
INSERT INTO directors (full_name, title, bio, image_url) VALUES
  ('Sri. Yelamaneni Venkateswara Rao', 'Founder & Chairman',
   'A visionary in South Indian intercity transport with over three decades of experience building premium fleet operations.',
   'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('Smt. Yelamaneni Lakshmi Devi', 'Managing Director',
   'Leads strategic growth and operational excellence across the YLT Travels network, championing safety and customer comfort.',
   'https://images.pexels.com/photos/3727464/pexels-photo-3727464.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('Sri. Yelamaneni Karthik', 'Director of Operations',
   'Oversees fleet management, route expansion, and driver training programs ensuring industry-leading on-time performance.',
   'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('Smt. Yelamaneni Priya', 'Director of Customer Experience',
   'Drives digital transformation and the premium passenger experience across all touchpoints of the journey.',
   'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300')
ON CONFLICT DO NOTHING;
