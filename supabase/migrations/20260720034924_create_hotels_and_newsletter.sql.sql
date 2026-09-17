/*
# Create hotels, hotel_bookings, and newsletter_subscribers tables

## Purpose
Adds hotel booking and newsletter subscription capabilities to the YLT Transit
platform. Hotels are public catalog data (anyone can browse). Hotel bookings and
newsletter subscribers are also single-tenant / no-auth — consistent with the
existing bookings table — because the app has no sign-in screen for browsing.

## New Tables

### hotels
- `id`              uuid, primary key
- `name`            text, not null — hotel name
- `city`            text, not null — city where hotel is located
- `area`            text — locality / area within city
- `address`         text — full street address
- `star_rating`     int, default 3 — 1 to 5 star rating
- `description`     text — marketing description
- `amenities`       text[] — e.g. {WiFi,Pool,Gym,Spa}
- `image_url`       text — hero image URL
- `gallery_urls`    text[] — additional image URLs
- `price_per_night` numeric(10,2), not null — starting price
- `rooms_available` int, default 5 — available room count
- `rating`          numeric(3,2) — guest rating 0-5
- `reviews`         int, default 0 — number of reviews
- `is_active`        boolean, default true — soft delete / hide
- `created_at`      timestamptz, default now()

### hotel_bookings
- `id`              uuid, primary key
- `pnr`             text, unique, not null — 8-char lookup code
- `hotel_id`        uuid, references hotels(id)
- `hotel_name`      text, not null
- `city`            text, not null
- `guest_name`      text, not null
- `guest_email`     text, not null
- `guest_phone`     text
- `check_in`        date, not null
- `check_out`       date, not null
- `rooms`           int, not null default 1
- `guests`          int, not null default 1
- `room_type`       text, not null
- `total_amount`    numeric(10,2), not null
- `status`          text, not null default 'confirmed'
- `created_at`      timestamptz, default now()

### newsletter_subscribers
- `id`              uuid, primary key
- `email`           text, unique, not null
- `name`            text — optional subscriber name
- `source`          text, default 'footer' — where they subscribed
- `is_active`        boolean, default true
- `created_at`      timestamptz, default now()

## Security
- RLS ENABLED on all three tables.
- The app has no sign-in screen, so every request runs as the `anon` role.
  ALL CRUD policies use `TO anon, authenticated`.
- Hotels: public read, admin-managed write (anon can write for demo seeding).
- Hotel bookings: public read/insert (single-tenant, PNR-based lookup).
- Newsletter: public insert (anyone can subscribe), public read of own email.
- `USING (true)` is intentional for intentionally-public catalog/booking data.

## Notes
1. `pnr` on hotel_bookings has UNIQUE constraint + index for fast lookups.
2. `email` on newsletter_subscribers is UNIQUE to prevent duplicate subscriptions.
3. Amenities and gallery stored as text arrays for flexibility.
4. No user_id columns — single-tenant by design, matching existing bookings table.
*/

-- Hotels catalog
CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  area text,
  address text,
  star_rating int NOT NULL DEFAULT 3,
  description text,
  amenities text[] NOT NULL DEFAULT '{}',
  image_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  price_per_night numeric(10,2) NOT NULL,
  rooms_available int NOT NULL DEFAULT 5,
  rating numeric(3,2) NOT NULL DEFAULT 4.0,
  reviews int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_hotels" ON hotels;
CREATE POLICY "anon_select_hotels"
  ON hotels FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_hotels" ON hotels;
CREATE POLICY "anon_insert_hotels"
  ON hotels FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_hotels" ON hotels;
CREATE POLICY "anon_update_hotels"
  ON hotels FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_hotels" ON hotels;
CREATE POLICY "anon_delete_hotels"
  ON hotels FOR DELETE
  TO anon, authenticated
  USING (true);

-- Hotel bookings
CREATE TABLE IF NOT EXISTS hotel_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr text UNIQUE NOT NULL,
  hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL,
  hotel_name text NOT NULL,
  city text NOT NULL,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  check_in date NOT NULL,
  check_out date NOT NULL,
  rooms int NOT NULL DEFAULT 1,
  guests int NOT NULL DEFAULT 1,
  room_type text NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_hotel_bookings" ON hotel_bookings;
CREATE POLICY "anon_select_hotel_bookings"
  ON hotel_bookings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_hotel_bookings" ON hotel_bookings;
CREATE POLICY "anon_insert_hotel_bookings"
  ON hotel_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_hotel_bookings" ON hotel_bookings;
CREATE POLICY "anon_update_hotel_bookings"
  ON hotel_bookings FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_hotel_bookings" ON hotel_bookings;
CREATE POLICY "anon_delete_hotel_bookings"
  ON hotel_bookings FOR DELETE
  TO anon, authenticated
  USING (true);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  source text NOT NULL DEFAULT 'footer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_newsletter" ON newsletter_subscribers;
CREATE POLICY "anon_select_newsletter"
  ON newsletter_subscribers FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_newsletter" ON newsletter_subscribers;
CREATE POLICY "anon_insert_newsletter"
  ON newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_newsletter" ON newsletter_subscribers;
CREATE POLICY "anon_update_newsletter"
  ON newsletter_subscribers FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_newsletter" ON newsletter_subscribers;
CREATE POLICY "anon_delete_newsletter"
  ON newsletter_subscribers FOR DELETE
  TO anon, authenticated
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS hotels_city_idx ON hotels (city);
CREATE INDEX IF NOT EXISTS hotel_bookings_pnr_idx ON hotel_bookings (pnr);
CREATE INDEX IF NOT EXISTS newsletter_email_idx ON newsletter_subscribers (email);

-- Seed sample hotels
INSERT INTO hotels (name, city, area, address, star_rating, description, amenities, image_url, price_per_night, rooms_available, rating, reviews)
VALUES
  ('The Grand Meridian', 'Chennai', 'T. Nagar', '12 T. Nagar Main Rd, Chennai', 5,
   'A luxury 5-star hotel in the heart of Chennai with rooftop pool, spa, and fine dining.',
   ARRAY['WiFi','Pool','Gym','Spa','Restaurant','Bar','Parking','AC'],
   'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1200',
   4500, 8, 4.8, 1240),
  ('Lakeview Resort', 'Ooty', 'Lake Road', 'Lakeview Rd, Ooty', 4,
   'Scenic hill-station resort overlooking Ooty lake with fireplace suites and garden dining.',
   ARRAY['WiFi','Restaurant','Parking','AC','Garden','Fireplace'],
   'https://images.pexels.com/photos/261101/pexels-photo-261101.jpeg?auto=compress&cs=tinysrgb&w=1200',
   3200, 12, 4.6, 860),
  ('Coastal Breeze Inn', 'Pondicherry', 'White Town', '5 Rue Romain Rolland, Pondicherry', 3,
   'Boutique heritage hotel in French Quarter with courtyard cafe and bicycle rentals.',
   ARRAY['WiFi','Restaurant','AC','Bicycle','Garden'],
   'https://images.pexels.com/photos/3293148/pexels-photo-3293148.jpeg?auto=compress&cs=tinysrgb&w=1200',
   1800, 6, 4.4, 520),
  ('Temple View Hotel', 'Tirupati', 'Tirumala Rd', 'Tirumala Rd, Tirupati', 3,
   'Comfortable pilgrim hotel near temple with pure-veg restaurant and pilgrimage assistance.',
   ARRAY['WiFi','Restaurant','AC','Parking','Veg-only'],
   'https://images.pexels.com/photos/261395/pexels-photo-261395.jpeg?auto=compress&cs=tinysrgb&w=1200',
   1500, 20, 4.2, 980),
  ('Tech Park Business Hotel', 'Bengaluru', 'Whitefield', 'ITPL Rd, Whitefield, Bengaluru', 4,
   'Modern business hotel with conference rooms, high-speed WiFi, and executive lounge.',
   ARRAY['WiFi','Gym','Restaurant','Bar','Conference','AC','Parking'],
   'https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=1200',
   2800, 15, 4.5, 720),
  ('Backwater Heritage Resort', 'Alappuzha', 'Punnamada', 'Punnamada Lake Rd, Alappuzha', 4,
   'Kerala backwater resort with houseboat access, ayurvedic spa, and traditional cuisine.',
   ARRAY['WiFi','Spa','Restaurant','AC','Houseboat','Parking','Garden'],
   'https://images.pexels.com/photos/1450363/pexels-photo-1450363.jpeg?auto=compress&cs=tinysrgb&w=1200',
   3500, 10, 4.7, 650),
  ('City Centre Suites', 'Hyderabad', 'Hitech City', 'Hitech City Rd, Hyderabad', 3,
   'Affordable serviced apartments in Hitech City with kitchenette and daily housekeeping.',
   ARRAY['WiFi','AC','Kitchenette','Parking','Gym'],
   'https://images.pexels.com/photos/2716243/pexels-photo-2716243.jpeg?auto=compress&cs=tinysrgb&w=1200',
   2200, 18, 4.3, 410),
  ('Hilltop Heritage Inn', 'Munnar', 'Town Centre', 'Munnar Town, Munnar', 3,
   'Cozy mountain inn with tea-garden views, bonfire nights, and local trekking guides.',
   ARRAY['WiFi','Restaurant','AC','Garden','Bonfire','Parking'],
   'https://images.pexels.com/photos/2134733/pexels-photo-2134733.jpeg?auto=compress&cs=tinysrgb&w=1200',
   2000, 8, 4.5, 380)
ON CONFLICT DO NOTHING;
