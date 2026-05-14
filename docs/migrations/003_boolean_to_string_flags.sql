-- ============================================================
-- MIGRATION 003 — Convert boolean flags to 'yes' / 'no' / 'unknown'
-- Run this in the Supabase SQL editor
-- ============================================================

-- Ensure has_contact_form exists before we alter it
-- (it was added in a post-v1 migration, not in the original schema)
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS has_contact_form boolean;

-- Convert all three columns: preserve existing boolean data
ALTER TABLE public.prospects
  ALTER COLUMN has_chatbot TYPE text
    USING CASE
      WHEN has_chatbot IS TRUE  THEN 'yes'
      WHEN has_chatbot IS FALSE THEN 'no'
      ELSE 'unknown'
    END;

ALTER TABLE public.prospects
  ALTER COLUMN has_online_booking TYPE text
    USING CASE
      WHEN has_online_booking IS TRUE  THEN 'yes'
      WHEN has_online_booking IS FALSE THEN 'no'
      ELSE 'unknown'
    END;

ALTER TABLE public.prospects
  ALTER COLUMN has_contact_form TYPE text
    USING CASE
      WHEN has_contact_form IS TRUE  THEN 'yes'
      WHEN has_contact_form IS FALSE THEN 'no'
      ELSE 'unknown'
    END;
