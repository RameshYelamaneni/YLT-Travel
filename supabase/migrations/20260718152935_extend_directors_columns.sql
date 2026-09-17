/*
# Extend directors table with admin columns + base64 guard

## Purpose
The pre-existing `directors` table uses `full_name` and `title` columns. We keep those
(existing director data must not be lost) and add the columns the admin panel needs.
We also add a CHECK constraint that blocks base64 data URIs from being stored in
`image_url` — the root cause of broken image rendering.

## 1. Modified Table: directors
- Add `role` text (nullable)
- Add `linkedin_url` text (nullable)
- Add `order_index` int NOT NULL DEFAULT 0
- Add CHECK constraint: image_url must NOT start with 'data:' (blocks base64)

## 2. Security
- No RLS policy changes — existing anon/authenticated policies remain in place.

## 3. Important Notes
- No columns dropped, no types changed — existing director row is preserved.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'directors' AND column_name = 'role') THEN
    ALTER TABLE directors ADD COLUMN role text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'directors' AND column_name = 'linkedin_url') THEN
    ALTER TABLE directors ADD COLUMN linkedin_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'directors' AND column_name = 'order_index') THEN
    ALTER TABLE directors ADD COLUMN order_index int NOT NULL DEFAULT 0;
  END IF;
END $$;

ALTER TABLE directors DROP CONSTRAINT IF EXISTS directors_no_base64_image;
ALTER TABLE directors ADD CONSTRAINT directors_no_base64_image
  CHECK (image_url IS NULL OR image_url NOT LIKE 'data:%');
