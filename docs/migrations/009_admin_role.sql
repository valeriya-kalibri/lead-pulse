-- ============================================================
-- MIGRATION 009 — Add role column to profiles
-- Run in Supabase SQL editor, then:
--   Settings → API → Reload schema cache
-- ============================================================

alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('admin', 'user'));

-- Set your admin account (replace with your actual user ID from auth.users)
-- update public.profiles set role = 'admin' where email = 'lera.paine@gmail.com';
