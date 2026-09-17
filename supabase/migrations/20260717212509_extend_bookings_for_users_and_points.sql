/*
# Extend bookings for user association and boarding points

## Purpose
The app now has a mock dual-auth system (Customer via mobile+OTP, Agent via
agent ID + password). Bookings must be associated with the logged-in user so
the "My Bookings" dashboard can filter by owner. The inline seat-selection
flow also needs to persist the chosen boarding and dropping points.

## Changes to existing table `bookings` (additive only — no data loss)
- ADD `user_identifier` text — '9999999999' (mobile) for customers, 'AGENT-001'
  for agents. Null for legacy anonymous bookings. Used by the dashboard filter.
- ADD `user_type` text — 'customer' | 'agent'. Null for legacy rows.
- ADD `boarding_point` text — chosen pickup point name.
- ADD `dropping_point` text — chosen drop-off point name.

All new columns are NULLABLE so existing rows remain valid. New inserts from
the authenticated UI populate them; the RLS policies remain intentionally
public (single-tenant shared data) — see the prior migration's rationale.

## Security
No policy changes. RLS stays ENABLED with the existing anon+authenticated
CRUD policies (USING true / WITH CHECK true). This is intentional: bookings
are public/shared single-tenant data scoped in-app by user_identifier, not by
database-level ownership. The app filters in the client by the current user's
identifier.

## Notes
1. user_identifier is NOT unique (a user has many bookings).
2. An index on user_identifier speeds up the "My Bookings" dashboard query.
3. No destructive operations — columns are only added.
*/

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS user_identifier text,
  ADD COLUMN IF NOT EXISTS user_type text,
  ADD COLUMN IF NOT EXISTS boarding_point text,
  ADD COLUMN IF NOT EXISTS dropping_point text;

CREATE INDEX IF NOT EXISTS bookings_user_identifier_idx
  ON bookings (user_identifier);
