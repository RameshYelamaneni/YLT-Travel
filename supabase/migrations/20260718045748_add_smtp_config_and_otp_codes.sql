/*
# Add SMTP email config to app_settings + create otp_codes table

## Purpose
YLT Travels needs OTP-based customer login with emails sent through their own
Hostinger SMTP server (no-reply@ylttravels.com) instead of Supabase's default
email provider (which is unreliable and filtered by Gmail). The admin can
configure all SMTP settings from the admin center. OTP codes are stored in a
dedicated table and verified by an edge function that also establishes a real
Supabase session via magic-link token generation.

## Changes to existing table `app_settings` (additive only)
- ADD `smtp_host` text — e.g. 'smtp.hostinger.com'
- ADD `smtp_port` integer — e.g. 465 (SSL) or 587 (STARTTLS)
- ADD `smtp_user` text — login username, e.g. 'no-reply@ylttravels.com'
- ADD `smtp_password` text — SMTP login password (admin-set)
- ADD `smtp_from_email` text — sender address shown in emails
- ADD `smtp_from_name` text — sender display name
- ADD `smtp_secure` boolean — true = direct TLS (port 465), false = STARTTLS (587)
- ADD `email_enabled` boolean — master toggle for OTP email login

## New Table: `otp_codes`
- id          uuid, primary key
- email       text — lowercase email the OTP was sent to
- code        text — 6-digit code
- expires_at  timestamptz — 10-minute expiry
- used        boolean, default false
- created_at  timestamptz, default now()

## Security
- RLS ENABLED on otp_codes with NO policies — table is locked to all anon/authenticated
  access. The edge function reads/writes via the service role key which bypasses RLS.
- app_settings RLS already open to anon/authenticated (existing pattern). SMTP password
  is stored alongside other config. This matches the existing mock-auth security model.
*/

-- ============ extend app_settings with SMTP columns ============
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS smtp_host text NOT NULL DEFAULT 'smtp.hostinger.com',
  ADD COLUMN IF NOT EXISTS smtp_port integer NOT NULL DEFAULT 465,
  ADD COLUMN IF NOT EXISTS smtp_user text NOT NULL DEFAULT 'no-reply@ylttravels.com',
  ADD COLUMN IF NOT EXISTS smtp_password text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_from_email text NOT NULL DEFAULT 'no-reply@ylttravels.com',
  ADD COLUMN IF NOT EXISTS smtp_from_name text NOT NULL DEFAULT 'YLT Travels',
  ADD COLUMN IF NOT EXISTS smtp_secure boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT false;

-- ============ otp_codes table ============
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS otp_codes_email_idx ON otp_codes (email);
CREATE INDEX IF NOT EXISTS otp_codes_expires_idx ON otp_codes (expires_at);
