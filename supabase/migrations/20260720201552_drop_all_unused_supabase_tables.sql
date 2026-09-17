-- Remove all unused Supabase tables.
-- The app uses the Hostinger PHP/MySQL API exclusively; the Supabase client
-- (src/lib/supabase.ts) is never imported anywhere. These tables were created
-- by earlier migrations but are orphaned and unused.

DROP TABLE IF EXISTS public.erp_api_keys CASCADE;
DROP TABLE IF EXISTS public.erp_audit_logs CASCADE;
DROP TABLE IF EXISTS public.erp_bus_expenses CASCADE;
DROP TABLE IF EXISTS public.erp_bus_health CASCADE;
DROP TABLE IF EXISTS public.erp_buses CASCADE;
DROP TABLE IF EXISTS public.erp_channel_sales CASCADE;
DROP TABLE IF EXISTS public.erp_compliance CASCADE;
DROP TABLE IF EXISTS public.erp_crew_documents CASCADE;
DROP TABLE IF EXISTS public.erp_crew CASCADE;
DROP TABLE IF EXISTS public.erp_earnings CASCADE;
DROP TABLE IF EXISTS public.erp_expenses CASCADE;
DROP TABLE IF EXISTS public.erp_insights CASCADE;
DROP TABLE IF EXISTS public.erp_live_trips CASCADE;
DROP TABLE IF EXISTS public.erp_maintenance_logs CASCADE;
DROP TABLE IF EXISTS public.erp_part_replacements CASCADE;
DROP TABLE IF EXISTS public.erp_partner_profile CASCADE;
DROP TABLE IF EXISTS public.erp_payouts CASCADE;
DROP TABLE IF EXISTS public.erp_pl_reports CASCADE;
DROP TABLE IF EXISTS public.erp_roles CASCADE;
DROP TABLE IF EXISTS public.erp_routes CASCADE;
DROP TABLE IF EXISTS public.erp_schedules CASCADE;
DROP TABLE IF EXISTS public.erp_seat_inventory CASCADE;
DROP TABLE IF EXISTS public.erp_seat_locks CASCADE;
DROP TABLE IF EXISTS public.erp_settlements CASCADE;
DROP TABLE IF EXISTS public.erp_shifts CASCADE;
DROP TABLE IF EXISTS public.erp_sla_scores CASCADE;
DROP TABLE IF EXISTS public.hotel_bookings CASCADE;
DROP TABLE IF EXISTS public.hotels CASCADE;
DROP TABLE IF EXISTS public.newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS public.offers CASCADE;
DROP TABLE IF EXISTS public.otp_codes CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.routes CASCADE;
DROP TABLE IF EXISTS public.employee_files CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.directors CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
