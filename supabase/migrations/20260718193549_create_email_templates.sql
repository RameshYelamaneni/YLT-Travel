/*
# Create email_templates table

1. New Table: email_templates
- id (uuid, pk)
- key (text, unique) — stable identifier e.g. 'otp_login', 'booking_confirmation'
- name (text) — human-friendly display name
- description (text) — what this template is used for
- subject (text) — email subject line, supports {{variable}} placeholders
- body_html (text) — full HTML email body, supports {{variable}} placeholders
- available_variables (jsonb, default '[]') — list of variable names available for substitution
- is_active (boolean, default true)
- created_at, updated_at (timestamptz)

2. Security
- RLS enabled. Full CRUD for anon, authenticated (single-tenant admin app, PHP backend is source of truth).

3. Seed data
- otp_login, booking_confirmation, test_smtp, welcome
*/

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  subject text NOT NULL,
  body_html text NOT NULL,
  available_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_email_templates" ON email_templates;
CREATE POLICY "anon_select_email_templates" ON email_templates FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_email_templates" ON email_templates;
CREATE POLICY "anon_insert_email_templates" ON email_templates FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_email_templates" ON email_templates;
CREATE POLICY "anon_update_email_templates" ON email_templates FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_email_templates" ON email_templates;
CREATE POLICY "anon_delete_email_templates" ON email_templates FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO email_templates (key, name, description, subject, body_html, available_variables) VALUES
(
  'otp_login',
  'OTP Login Code',
  'Sent to customers when they request an email OTP login code.',
  'Your YLT Travels Login Code',
  '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f0f12;font-family:Inter,Segoe UI,Arial,sans-serif"><div style="max-width:480px;margin:0 auto;padding:32px 24px"><div style="text-align:center;margin-bottom:24px"><h1 style="color:#fff;font-size:22px;margin:0;letter-spacing:0.5px">YLT Travels</h1><p style="color:#c81e44;font-size:12px;margin:4px 0 0">Premium Bus Services</p></div><div style="background:#1a1a20;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.06)"><h2 style="color:#fff;font-size:18px;margin:0 0 8px">Your Login Code</h2><p style="color:#a8a8b0;font-size:14px;line-height:1.6;margin:0 0 24px">Use this 6-digit code to log in to your YLT Travels account. The code expires in 10 minutes.</p><div style="text-align:center;background:#0f0f12;border-radius:12px;padding:24px;margin:0 0 24px"><span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#c81e44">{{code}}</span></div><p style="color:#6b6b75;font-size:12px;margin:0;line-height:1.5">If you did not request this code, you can safely ignore this email. Never share this code with anyone.</p></div><p style="color:#4a4a52;font-size:11px;text-align:center;margin:24px 0 0">© YLT Travels · Tirupati, Andhra Pradesh</p></div></body></html>',
  '["code","email"]'::jsonb
),
(
  'booking_confirmation',
  'Booking Confirmation Ticket',
  'Sent to customers when a bus booking is confirmed, with the PDF ticket attached.',
  'Your YLT Travels Ticket — {{pnr}}',
  '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f0f12;font-family:Inter,Segoe UI,Arial,sans-serif"><div style="max-width:520px;margin:0 auto;padding:32px 24px"><div style="text-align:center;margin-bottom:24px"><h1 style="color:#fff;font-size:22px;margin:0;letter-spacing:0.5px">YLT Travels</h1><p style="color:#c81e44;font-size:12px;margin:4px 0 0">Premium Bus Services</p></div><div style="background:#1a1a20;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.06)"><h2 style="color:#fff;font-size:18px;margin:0 0 4px">Booking Confirmed</h2><p style="color:#a8a8b0;font-size:14px;margin:0 0 24px">Your ticket is attached to this email. Show it to the operator at boarding.</p><table style="width:100%;font-size:14px;color:#a8a8b0"><tr><td style="padding:6px 0;color:#6b6b75">PNR</td><td style="padding:6px 0;color:#fff;text-align:right;font-weight:700">{{pnr}}</td></tr><tr><td style="padding:6px 0;color:#6b6b75">Operator</td><td style="padding:6px 0;color:#fff;text-align:right">{{operator}}</td></tr><tr><td style="padding:6px 0;color:#6b6b75">Route</td><td style="padding:6px 0;color:#fff;text-align:right">{{from_city}} → {{to_city}}</td></tr><tr><td style="padding:6px 0;color:#6b6b75">Date</td><td style="padding:6px 0;color:#fff;text-align:right">{{travel_date}}</td></tr><tr><td style="padding:6px 0;color:#6b6b75">Departure</td><td style="padding:6px 0;color:#fff;text-align:right">{{departure_time}}</td></tr><tr><td style="padding:6px 0;color:#6b6b75">Seats</td><td style="padding:6px 0;color:#fff;text-align:right">{{seats}}</td></tr><tr><td style="padding:6px 0;color:#6b6b75">Amount</td><td style="padding:6px 0;color:#c81e44;text-align:right;font-weight:700">₹{{amount}}</td></tr><tr><td style="padding:6px 0;color:#6b6b75">Contact</td><td style="padding:6px 0;color:#fff;text-align:right">{{email}} · {{phone}}</td></tr></table><p style="color:#6b6b75;font-size:12px;margin:24px 0 0;line-height:1.5">Please arrive at the boarding point 15 minutes before departure. Safe travels!</p></div><p style="color:#4a4a52;font-size:11px;text-align:center;margin:24px 0 0">© YLT Travels · Tirupati, Andhra Pradesh</p></div></body></html>',
  '["pnr","operator","from_city","to_city","travel_date","departure_time","seats","amount","email","phone"]'::jsonb
),
(
  'test_smtp',
  'SMTP Test Email',
  'Sent when an admin tests the SMTP configuration from the Email & OTP settings tab.',
  'YLT Travels SMTP Test',
  '<div style="font-family:Inter,Arial,sans-serif;background:#0f0f12;padding:32px"><div style="max-width:480px;margin:0 auto;background:#1a1a20;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.06)"><h2 style="color:#fff">SMTP Test Successful</h2><p style="color:#a8a8b0">Your YLT Travels email configuration is working correctly. OTP login emails will be sent from this address.</p></div></div>',
  '[]'::jsonb
),
(
  'welcome',
  'Welcome Email',
  'Sent to new customers when they create an account.',
  'Welcome to YLT Travels',
  '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f0f12;font-family:Inter,Segoe UI,Arial,sans-serif"><div style="max-width:480px;margin:0 auto;padding:32px 24px"><div style="text-align:center;margin-bottom:24px"><h1 style="color:#fff;font-size:22px;margin:0;letter-spacing:0.5px">YLT Travels</h1><p style="color:#c81e44;font-size:12px;margin:4px 0 0">Premium Bus Services</p></div><div style="background:#1a1a20;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.06)"><h2 style="color:#fff;font-size:18px;margin:0 0 8px">Welcome aboard, {{name}}!</h2><p style="color:#a8a8b0;font-size:14px;line-height:1.6;margin:0 0 16px">Thank you for joining YLT Travels. You can now book buses, rent cars, and join car pools across South India.</p><p style="color:#a8a8b0;font-size:14px;line-height:1.6;margin:0 0 16px">Your account email is <strong style="color:#fff">{{email}}</strong>.</p><p style="color:#6b6b75;font-size:12px;margin:0;line-height:1.5">Start exploring at ylttravels.com</p></div><p style="color:#4a4a52;font-size:11px;text-align:center;margin:24px 0 0">© YLT Travels · Tirupati, Andhra Pradesh</p></div></body></html>',
  '["name","email"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;
