-- ============================================================
-- MIGRATION 010 — Remove hubspot_note_id from prospects
--                 Intel is now written to the LeadPulse Intel
--                 custom property on Contact and Company records,
--                 not to a HubSpot Note engagement.
-- Run in Supabase SQL editor, then:
--   Settings → API → Reload schema cache
-- ============================================================

alter table public.prospects
  drop column if exists hubspot_note_id;
