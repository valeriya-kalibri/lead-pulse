-- ============================================================
-- LEADPULSE — Supabase Schema V2
-- Kalibri Studios — KalibriStudios.AI
-- Last updated: 2026-05-19
--
-- Safe to run on both a fresh database and an existing V1 database.
-- All statements use IF NOT EXISTS / OR REPLACE / ON CONFLICT guards.
--
-- V2 CHANGES FROM V1:
--   profiles        — added: stripe_customer_id, stripe_subscription_id,
--                            stripe_subscription_status, plan_expires_at
--   prospects       — added: outreach_email_subject_1, outreach_email_body_1,
--                            outreach_email_subject_2, outreach_email_body_2,
--                            outreach_email_subject_3, outreach_email_body_3,
--                            sequence_generated_at, apollo_sequence_status,
--                            apollo_enrolled_at, scrape_source
--   usage           — added: intel_generated, sequences_generated
--   NEW: increment_sequence_usage RPC function
--   NEW: update_stripe_subscription RPC function
--   NEW: idx_prospects_apollo_status index
--   NEW: idx_prospects_sequence index
--   NEW: idx_profiles_stripe_customer index
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase Auth users)
-- Auto-created on signup via trigger
-- ============================================================
create table if not exists public.profiles (
  id                        uuid references auth.users on delete cascade primary key,
  email                     text not null,
  full_name                 text,
  company_name              text,
  plan                      text not null default 'starter',  -- 'starter' | 'pro'
  role                      text not null default 'user',     -- 'admin' | 'user'

  -- HubSpot OAuth (Pro plan only)
  hubspot_access_token      text,        -- Bearer token for all HubSpot API calls
  hubspot_refresh_token     text,        -- used to renew access token
  hubspot_token_expires_at  timestamptz, -- refresh before any sync if past this value
  hubspot_portal_id         text,        -- used to build direct HubSpot record links

  -- Stripe Billing (V2)
  stripe_customer_id         text,        -- Stripe Customer ID — created on first checkout
  stripe_subscription_id     text,        -- active Stripe Subscription ID
  stripe_subscription_status text,        -- 'active' | 'past_due' | 'canceled' | 'trialing'
  plan_expires_at            timestamptz, -- set on cancellation — access continues until this date

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- V2 columns — no-op if already present (existing database)
alter table public.profiles
  add column if not exists stripe_customer_id         text,
  add column if not exists stripe_subscription_id     text,
  add column if not exists stripe_subscription_status text,
  add column if not exists plan_expires_at            timestamptz;

-- ============================================================
-- INDUSTRY TEMPLATES (seeded on deploy — read-only at runtime)
-- ============================================================
create table if not exists public.industry_templates (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null unique,   -- 'Med Spa / Aesthetics', 'Dental', etc.
  slug             text not null unique,   -- 'med_spa', 'dental', etc.
  default_keywords text[] not null,        -- pre-loaded keyword array
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

insert into public.industry_templates (name, slug, default_keywords, sort_order) values
  ('Med Spa / Aesthetics', 'med_spa',      ARRAY['Morpheus8','RF Microneedling','Fillers','Botox','Laser Resurfacing','CoolSculpting','EmSculpt','Ultherapy','Kybella','PRP'], 1),
  ('Dental',               'dental',       ARRAY['Implants','Invisalign','Veneers','Full Mouth Reconstruction','Smile Makeover','Teeth Whitening'], 2),
  ('Legal',                'legal',        ARRAY['Personal Injury','Medical Malpractice','Immigration','Criminal Defense','Estate Planning','Mass Tort'], 3),
  ('HVAC / Home Services', 'hvac',         ARRAY['Full System Replacement','Duct Replacement','Generator Install','Whole-Home Repiping','Roof Replacement'], 4),
  ('Real Estate',          'real_estate',  ARRAY['Luxury Listings','Commercial Properties','Property Management','Investment Properties'], 5),
  ('Wellness / Chiro',     'wellness',     ARRAY['Spinal Decompression','Regenerative Therapy','IV Therapy','Weight Loss Programs','Hormone Therapy'], 6),
  ('Restoration / Remediation', 'restoration', ARRAY['Water Damage Restoration','Fire Damage Restoration','Mold Remediation','Smoke Damage Restoration','Flood Restoration','Storm Damage Restoration','Disaster Restoration','Structural Drying','Contents Restoration','Biohazard Cleanup'], 8),
  ('Other / Custom',       'custom',       ARRAY[]::text[], 9)
on conflict (slug) do nothing;

-- ============================================================
-- PROSPECT LISTS (one per qualification run)
-- ============================================================
create table if not exists public.prospect_lists (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid references public.profiles(id) on delete cascade not null,
  name                 text not null,
  description          text,
  industry_template_id uuid references public.industry_templates(id),
  industry_name        text,          -- denormalized for display
  service_keywords     text[] not null default ARRAY[]::text[],
  selected_criteria    text[],        -- subset of the 10 criteria; null = all selected
  filter_summary       text,          -- snapshot written at HubSpot sync time
  total_prospects      int not null default 0,
  hot_count            int not null default 0,
  warm_count           int not null default 0,
  cold_count           int not null default 0,
  status               text not null default 'pending',  -- 'pending' | 'processing' | 'complete' | 'error'
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ============================================================
-- PROSPECTS (individual scraped / imported records)
-- ============================================================
create table if not exists public.prospects (
  id           uuid primary key default uuid_generate_v4(),
  list_id      uuid references public.prospect_lists(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,

  -- ── Input / contact data (from CSV import or HubSpot pull) ──────────────
  website_url    text not null,
  business_name  text,
  contact_name   text,
  email          text,
  phone          text,
  city           text,
  state          text,
  employee_count text,  -- '1-5' | '6-15' | '16-50' | '50+' — from CSV or manual edit
  revenue_range  text,  -- '<$500K' | '$500K-$1M' | '$1M-$5M' | '$5M+' — from CSV or manual edit

  -- ── Scraped qualification signals ────────────────────────────────────────
  has_chatbot          text,     -- 'yes' | 'no' | 'unknown' — NEVER boolean
  chatbot_platform     text,
  has_contact_form     text,     -- 'yes' | 'no' | 'unknown' — NEVER boolean
  has_online_booking   text,     -- 'yes' | 'no' | 'unknown' — NEVER boolean
  crm_emr_platform     text,     -- detected CRM/EMR (Vagaro, Mindbody, Jane App, etc.)
  crm_platform         text,     -- detected CRM (HubSpot, Salesforce, GoHighLevel, etc.)
  high_ticket_services text[],   -- matched service keywords
  location_count       int,
  is_multi_location    boolean,
  analytics_platform   text,

  -- ── Scoring ──────────────────────────────────────────────────────────────
  score         text not null default 'cold',  -- 'hot' | 'warm' | 'cold'
  score_reason  text,
  outreach_hook text,  -- AI-generated opener — standalone column AND inside intel jsonb

  -- ── AI Intel Card ─────────────────────────────────────────────────────────
  -- { outreach_hook, business_summary, owner_profile,
  --   social_signals, conversation_starters[], pain_indicators }
  intel              jsonb,
  intel_generated_at timestamptz,

  -- ── AI Email Sequence (V2) ────────────────────────────────────────────────
  -- Email 1 — cold opener, day 1
  outreach_email_subject_1  text,
  outreach_email_body_1     text,

  -- Email 2 — follow-up, day 3-4
  outreach_email_subject_2  text,
  outreach_email_body_2     text,

  -- Email 3 — breakup email, day 7-8
  outreach_email_subject_3  text,
  outreach_email_body_3     text,

  sequence_generated_at  timestamptz,  -- when email sequence was generated

  -- ── Apollo Campaign Tracking (V2) ────────────────────────────────────────
  -- Values: 'not_enrolled' | 'enrolled' | 'replied' | 'bounced' | 'completed'
  -- Manually updated by user — Apollo does not write back to LeadPulse
  apollo_sequence_status  text not null default 'not_enrolled',
  apollo_enrolled_at      timestamptz,  -- set manually when user adds to Apollo sequence

  -- ── Scrape status ─────────────────────────────────────────────────────────
  scrape_status  text not null default 'pending',
  -- 'pending' | 'processing' | 'complete' | 'error' | 'skipped'
  scrape_error   text,
  error_type     text,
  -- 'TIMEOUT' | 'BLOCKED' | 'DNS_FAILED' | 'PARSE_ERROR' |
  -- 'SSL_ERROR' | 'EMPTY_PAGE' | 'UNKNOWN'
  scrape_source  text,
  -- 'node_fetch' (default) | 'playwright' (V2 — used when node-fetch returns EMPTY_PAGE)
  scraped_at     timestamptz,

  -- ── HubSpot sync / pull ───────────────────────────────────────────────────
  hubspot_contact_id  text,        -- HubSpot Contact record ID
  hubspot_company_id  text,        -- HubSpot Company record ID
  hubspot_synced_at   timestamptz, -- last push to HubSpot

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- V2 columns — no-op if already present (existing database)
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

-- ============================================================
-- SCRAPE JOBS (one per list run)
-- ============================================================
create table if not exists public.scrape_jobs (
  id              uuid primary key default uuid_generate_v4(),
  list_id         uuid references public.prospect_lists(id) on delete cascade not null,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  total_urls      int not null default 0,
  processed_urls  int not null default 0,
  failed_urls     int not null default 0,
  status          text not null default 'queued',  -- 'queued' | 'running' | 'complete' | 'error'
  error_summary   jsonb,
  -- { succeeded, failed, skipped, by_error_type{}, avg_scrape_ms,
  --   playwright_fallback_count }  ← V2: tracks how many sites needed Playwright
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- USAGE TRACKING (plan limit enforcement)
-- ============================================================
create table if not exists public.usage (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid references public.profiles(id) on delete cascade not null,
  month                text not null,           -- 'YYYY-MM'
  prospects_scraped    int not null default 0,  -- monthly scrape count
  hubspot_synced       int not null default 0,  -- monthly HubSpot sync count
  intel_generated      int not null default 0,  -- monthly Intel Card generation count
  sequences_generated  int not null default 0,  -- monthly email sequence generation count (V2)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(user_id, month)
);

-- V2 columns — no-op if already present (existing database)
alter table public.usage
  add column if not exists intel_generated     int not null default 0,
  add column if not exists sequences_generated int not null default 0;

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_prospects_list_id          on public.prospects(list_id);
create index if not exists idx_prospects_user_id          on public.prospects(user_id);
create index if not exists idx_prospects_score            on public.prospects(score);
create index if not exists idx_prospects_scrape_status    on public.prospects(scrape_status);
create index if not exists idx_prospects_hubspot_company  on public.prospects(hubspot_company_id);
create index if not exists idx_prospects_email            on public.prospects(email);
create index if not exists idx_prospect_lists_user_id     on public.prospect_lists(user_id);
create index if not exists idx_scrape_jobs_list_id        on public.scrape_jobs(list_id);
create index if not exists idx_usage_user_month           on public.usage(user_id, month);

-- V2 indexes
create index if not exists idx_prospects_apollo_status  on public.prospects(apollo_sequence_status);
create index if not exists idx_prospects_sequence       on public.prospects(sequence_generated_at)
  where sequence_generated_at is not null;
create index if not exists idx_profiles_stripe_customer on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.prospect_lists    enable row level security;
alter table public.prospects         enable row level security;
alter table public.scrape_jobs       enable row level security;
alter table public.usage             enable row level security;

-- profiles
drop policy if exists "Users can view own profile"   on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- prospect_lists
drop policy if exists "Users can CRUD own lists" on public.prospect_lists;
create policy "Users can CRUD own lists"
  on public.prospect_lists for all
  using (auth.uid() = user_id);

-- prospects
drop policy if exists "Users can CRUD own prospects" on public.prospects;
create policy "Users can CRUD own prospects"
  on public.prospects for all
  using (auth.uid() = user_id);

-- scrape_jobs
drop policy if exists "Users can view own scrape jobs" on public.scrape_jobs;
create policy "Users can view own scrape jobs"
  on public.scrape_jobs for select
  using (auth.uid() = user_id);

-- usage
drop policy if exists "Users can view own usage" on public.usage;
create policy "Users can view own usage"
  on public.usage for select
  using (auth.uid() = user_id);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_updated_at on public.profiles;
drop trigger if exists handle_updated_at on public.prospect_lists;
drop trigger if exists handle_updated_at on public.prospects;
drop trigger if exists handle_updated_at on public.usage;

create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.prospect_lists
  for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.prospects
  for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.usage
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- USAGE RPC FUNCTIONS (called via service role from API routes)
-- All functions use ON CONFLICT upsert — safe to call multiple times
-- ============================================================

create or replace function public.increment_usage(
  p_user_id uuid,
  p_month   text,
  p_count   int
)
returns void as $$
begin
  insert into public.usage (user_id, month, prospects_scraped)
  values (p_user_id, p_month, p_count)
  on conflict (user_id, month)
  do update set
    prospects_scraped = public.usage.prospects_scraped + p_count,
    updated_at        = now();
end;
$$ language plpgsql security definer;

create or replace function public.increment_hubspot_usage(
  p_user_id uuid,
  p_month   text,
  p_count   int
)
returns void as $$
begin
  insert into public.usage (user_id, month, hubspot_synced)
  values (p_user_id, p_month, p_count)
  on conflict (user_id, month)
  do update set
    hubspot_synced = public.usage.hubspot_synced + p_count,
    updated_at     = now();
end;
$$ language plpgsql security definer;

create or replace function public.increment_intel_usage(
  p_user_id uuid,
  p_month   text,
  p_count   int
)
returns void as $$
begin
  insert into public.usage (user_id, month, intel_generated)
  values (p_user_id, p_month, p_count)
  on conflict (user_id, month)
  do update set
    intel_generated = public.usage.intel_generated + p_count,
    updated_at      = now();
end;
$$ language plpgsql security definer;

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

-- ============================================================
-- STRIPE WEBHOOK HELPER (V2)
-- Called from /api/stripe/webhook/route.ts via service role
-- ============================================================
create or replace function public.update_stripe_subscription(
  p_user_id              uuid,
  p_stripe_customer_id   text,
  p_subscription_id      text,
  p_subscription_status  text,
  p_plan                 text,        -- 'starter' | 'pro'
  p_plan_expires_at      timestamptz  -- null unless canceled
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
