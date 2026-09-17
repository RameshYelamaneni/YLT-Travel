/*
# Allow nullable contact fields on bookings

## Purpose
The bus booking UI generates a PNR and records the booking, but does not
collect phone/passenger details inline. The existing `bookings` table marks
`contact_email` and `contact_phone` as NOT NULL, which blocks inserts from
the frontend. Email is the only field required to send the booking
confirmation email.

## Changes (additive, no data loss)
- `contact_phone`: drop NOT NULL → nullable. UI may omit it.
- `passengers`: already jsonb with a default; keep as is.
- `contact_email` stays NOT NULL — it is required to send the confirmation email.

## Security
No policy changes. RLS stays ENABLED with the existing anon+authenticated
CRUD policies (USING true / WITH CHECK true), intentionally public/shared
single-tenant data scoped in-app by user_identifier.
*/

ALTER TABLE bookings
  ALTER COLUMN contact_phone DROP NOT NULL;
