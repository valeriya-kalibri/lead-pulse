-- ============================================================
-- MIGRATION 002 — HubSpot extra fields
-- Run this in the Supabase SQL editor
-- ============================================================

-- prospects: company and note IDs from HubSpot sync
alter table public.prospects
  add column if not exists hubspot_company_id text,
  add column if not exists hubspot_note_id text;

-- prospect_lists: store the filter summary generated at sync time
alter table public.prospect_lists
  add column if not exists filter_summary text,
  add column if not exists selected_criteria text[];

-- profiles: cache the HubSpot portal ID so badge links work
alter table public.profiles
  add column if not exists hubspot_portal_id text;
