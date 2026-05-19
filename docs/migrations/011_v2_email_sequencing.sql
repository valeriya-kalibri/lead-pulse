-- ============================================================
-- MIGRATION 011 — V2 Email Sequencing
-- Run this on an existing V1 database. Safe to re-run (IF NOT EXISTS / OR REPLACE).
-- DO NOT run the full leadpulse_supabase_schema_V2.sql on an existing database —
-- use this file instead.
-- ============================================================

-- ── profiles: Stripe billing columns ────────────────────────
alter table public.profiles
  add column if not exists stripe_customer_id         text,
  add column if not exists stripe_subscription_id     text,
  add column if not exists stripe_subscription_status text,
  add column if not exists plan_expires_at            timestamptz;

-- ── prospects: email sequence columns ───────────────────────
alter table public.prospects
  add column if not exists outreach_email_subject_1  text,
  add column if not exists outreach_email_body_1     text,
  add column if not exists outreach_email_subject_2  text,
  add column if not exists outreach_email_body_2     text,
  add column if not exists outreach_email_subject_3  text,
  add column if not exists outreach_email_body_3     text,
  add column if not exists sequence_generated_at     timestamptz,
  add column if not exists apollo_sequence_status    text not null default 'not_enrolled',
  add column if not exists apollo_enrolled_at        timestamptz,
  add column if not exists scrape_source             text;

-- ── usage: new counters ──────────────────────────────────────
alter table public.usage
  add column if not exists intel_generated     int not null default 0,
  add column if not exists sequences_generated int not null default 0;

-- ── new indexes ──────────────────────────────────────────────
create index if not exists idx_prospects_apollo_status
  on public.prospects(apollo_sequence_status);

create index if not exists idx_prospects_sequence
  on public.prospects(sequence_generated_at)
  where sequence_generated_at is not null;

create index if not exists idx_profiles_stripe_customer
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

-- ── new RPC functions ────────────────────────────────────────

create or replace function public.increment_sequence_usage(
  p_user_id uuid,
  p_month   text,
  p_count   int
)
returns void as $$
begin
  insert into public.usage (user_id, month, sequences_generated)
  values (p_user_id, p_month, p_count)
  on conflict (user_id, month)
  do update set
    sequences_generated = public.usage.sequences_generated + p_count,
    updated_at          = now();
end;
$$ language plpgsql security definer;

create or replace function public.update_stripe_subscription(
  p_user_id              uuid,
  p_stripe_customer_id   text,
  p_subscription_id      text,
  p_subscription_status  text,
  p_plan                 text,
  p_plan_expires_at      timestamptz
)
returns void as $$
begin
  update public.profiles
  set
    stripe_customer_id         = p_stripe_customer_id,
    stripe_subscription_id     = p_subscription_id,
    stripe_subscription_status = p_subscription_status,
    plan                       = p_plan,
    plan_expires_at            = p_plan_expires_at,
    updated_at                 = now()
  where id = p_user_id;
end;
$$ language plpgsql security definer;
