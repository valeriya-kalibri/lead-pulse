-- ============================================================
-- MIGRATION 007 — Add columns that exist in TypeScript types
--                 but are absent from the database schema
-- Run in Supabase SQL editor, then:
--   Settings → API → Reload schema cache
-- ============================================================

-- prospects: rename emr_platform → crm_emr_platform and add crm_platform
alter table public.prospects
  add column if not exists crm_emr_platform    text,
  add column if not exists crm_platform        text,
  add column if not exists has_contact_form    text,
  add column if not exists error_type          text,
  add column if not exists intel               jsonb,
  add column if not exists intel_generated_at  timestamptz,
  add column if not exists hubspot_synced_at   timestamptz;

-- Carry over any data already in the old emr_platform column
update public.prospects
  set crm_emr_platform = emr_platform
  where emr_platform is not null
    and crm_emr_platform is null;

-- scrape_jobs: error summary is written at job completion
alter table public.scrape_jobs
  add column if not exists error_summary jsonb;
