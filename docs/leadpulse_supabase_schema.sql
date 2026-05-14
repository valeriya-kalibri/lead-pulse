-- ============================================================
-- LEADPULSE — Supabase Schema
-- Kalibri Studios — KalibriStudios.AI
-- Last updated: 2026-05-14
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase Auth users)
-- Auto-created on signup via trigger
-- ============================================================
create table public.profiles (
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

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- INDUSTRY TEMPLATES (seeded on deploy — read-only at runtime)
-- ============================================================
create table public.industry_templates (
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
  ('Other / Custom',       'custom',       ARRAY[]::text[], 7);

-- ============================================================
-- PROSPECT LISTS (one per qualification run)
-- ============================================================
create table public.prospect_lists (
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
create table public.prospects (
  id           uuid primary key default uuid_generate_v4(),
  list_id      uuid references public.prospect_lists(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,

  -- Input / contact data (from CSV import or HubSpot pull)
  website_url   text not null,
  business_name text,
  contact_name  text,
  email         text,
  phone         text,
  city          text,
  state         text,
  employee_count text,   -- '1-5' | '6-15' | '16-50' | '50+' — from CSV or manual edit
  revenue_range  text,   -- '<$500K' | '$500K-$1M' | '$1M-$5M' | '$5M+' — from CSV or manual edit

  -- Scraped qualification signals
  has_chatbot         text,     -- 'yes' | 'no' | 'unknown' — NEVER boolean
  chatbot_platform    text,
  has_contact_form    text,     -- 'yes' | 'no' | 'unknown' — NEVER boolean
  has_online_booking  text,     -- 'yes' | 'no' | 'unknown' — NEVER boolean
  crm_emr_platform    text,     -- detected CRM/EMR (Vagaro, Mindbody, Jane App, etc.)
  crm_platform        text,     -- detected CRM (HubSpot, Salesforce, GoHighLevel, etc.)
  high_ticket_services text[],  -- matched service keywords
  location_count      int,
  is_multi_location   boolean,
  analytics_platform  text,

  -- Scoring
  score         text not null default 'cold',  -- 'hot' | 'warm' | 'cold'
  score_reason  text,
  outreach_hook text,  -- AI-generated opener — standalone column AND inside intel jsonb

  -- AI Intel Card
  intel              jsonb,       -- { outreach_hook, business_summary, owner_profile, social_signals, conversation_starters[], pain_indicators }
  intel_generated_at timestamptz,

  -- Scrape status
  scrape_status  text not null default 'pending',  -- 'pending' | 'processing' | 'complete' | 'error' | 'skipped'
  scrape_error   text,
  error_type     text,  -- 'TIMEOUT' | 'BLOCKED' | 'DNS_FAILED' | 'PARSE_ERROR' | 'SSL_ERROR' | 'EMPTY_PAGE' | 'UNKNOWN'
  scraped_at     timestamptz,

  -- HubSpot sync / pull
  hubspot_contact_id  text,        -- HubSpot Contact record ID
  hubspot_company_id  text,        -- HubSpot Company record ID
  hubspot_synced_at   timestamptz, -- last push to HubSpot

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- SCRAPE JOBS (one per list run)
-- ============================================================
create table public.scrape_jobs (
  id              uuid primary key default uuid_generate_v4(),
  list_id         uuid references public.prospect_lists(id) on delete cascade not null,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  total_urls      int not null default 0,
  processed_urls  int not null default 0,
  failed_urls     int not null default 0,
  status          text not null default 'queued',  -- 'queued' | 'running' | 'complete' | 'error'
  error_summary   jsonb,  -- { succeeded, failed, skipped, by_error_type{}, avg_scrape_ms }
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- USAGE TRACKING (plan limit enforcement)
-- ============================================================
create table public.usage (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references public.profiles(id) on delete cascade not null,
  month             text not null,  -- 'YYYY-MM'
  prospects_scraped int not null default 0,
  hubspot_synced    int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(user_id, month)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_prospects_list_id          on public.prospects(list_id);
create index idx_prospects_user_id          on public.prospects(user_id);
create index idx_prospects_score            on public.prospects(score);
create index idx_prospects_scrape_status    on public.prospects(scrape_status);
create index idx_prospects_hubspot_company  on public.prospects(hubspot_company_id);
create index idx_prospects_email            on public.prospects(email);
create index idx_prospect_lists_user_id     on public.prospect_lists(user_id);
create index idx_scrape_jobs_list_id        on public.scrape_jobs(list_id);
create index idx_usage_user_month           on public.usage(user_id, month);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.prospect_lists    enable row level security;
alter table public.prospects         enable row level security;
alter table public.scrape_jobs       enable row level security;
alter table public.usage             enable row level security;

create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can CRUD own lists"     on public.prospect_lists for all using (auth.uid() = user_id);
create policy "Users can CRUD own prospects" on public.prospects       for all using (auth.uid() = user_id);

create policy "Users can view own scrape jobs" on public.scrape_jobs for select using (auth.uid() = user_id);
create policy "Users can view own usage"       on public.usage        for select using (auth.uid() = user_id);

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- USAGE RPC FUNCTIONS (called via service role from API routes)
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
