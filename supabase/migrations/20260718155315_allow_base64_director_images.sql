/*
# Allow base64 image storage in directors

## Purpose
The user cannot host images externally and needs to upload photo files that are
stored directly in the database as base64 data URIs and rendered in the UI.

## 1. Changes
- Drop the `directors_no_base64_image` CHECK constraint that blocked `data:` URIs.
- The `image_url` text column now accepts both hosted URLs (https://...) and
  base64 data URIs (data:image/jpeg;base64,...).

## 2. Security
- No RLS policy changes.

## 3. Important Notes
- base64 strings can be large; the column is `text` (unbounded) so it holds them.
- The frontend AdminPanel converts uploaded files to base64 via FileReader before upsert.
*/

ALTER TABLE directors DROP CONSTRAINT IF EXISTS directors_no_base64_image;
