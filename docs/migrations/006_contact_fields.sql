-- ============================================================
-- MIGRATION 006 — Add contact / enrichment fields to prospects
-- Run this in the Supabase SQL editor
-- ============================================================

alter table public.prospects
  add column if not exists contact_name text,
  add column if not exists phone        text,
  add column if not exists email        text,
  add column if not exists city         text,
  add column if not exists state        text;
