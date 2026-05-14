-- ============================================================
-- MIGRATION 008 — Replace hubspot_api_key with OAuth token fields
-- Run in Supabase SQL editor, then:
--   Settings → API → Reload schema cache
-- ============================================================

alter table public.profiles
  add column if not exists hubspot_access_token     text,
  add column if not exists hubspot_refresh_token    text,
  add column if not exists hubspot_token_expires_at timestamptz;

-- Remove the old private app key column
alter table public.profiles
  drop column if exists hubspot_api_key;
