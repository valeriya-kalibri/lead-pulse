# LeadPulse

LeadPulse is an AI-powered prospect qualification engine for agencies, consultants, and sales teams who prospect service businesses at scale. It takes a raw list of company websites and turns it into a ranked, sales-ready list — automatically.

Apollo and HubSpot are great at finding prospects. They can't tell you which ones are actually worth calling, or what to say when you do. That's the gap LeadPulse closes.

## What it does

1. **Import** — upload a CSV export from Apollo/HubSpot, or pull a list directly from a connected HubSpot account.
2. **Configure** — pick an industry template (med spa, dental, legal, HVAC, real estate, wellness, or custom) and choose which of 10 qualification criteria to check.
3. **Scan** — LeadPulse visits every website in the list server-side and detects, per site: chatbot/live-chat widgets, contact forms, online booking, CRM/EMR platform, analytics tooling, service keywords, and number of locations.
4. **Score** — every prospect is scored Hot, Warm, or Cold based on which lead-capture gaps it has (a business with no chatbot and no booking widget scores hotter than one that already has both covered).
5. **Brief** — for Hot and Warm prospects, generate an AI Intel Card: a business summary, owner profile, social signals, conversation starters, and a specific, non-generic outreach hook — plus an optional 3-email outreach sequence.
6. **Act** — export the enriched list as CSV, or sync it straight into HubSpot as Contacts and Companies with all of the above written to custom properties.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript, React 19 |
| Styling | Tailwind CSS |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) |
| Scraping | Cheerio + server-side fetch, with Playwright (`playwright-core` + `@sparticuz/chromium-min`) as a headless-browser fallback for JS-rendered SPAs |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) — Intel Cards and email sequences |
| CRM integration | HubSpot API v3/v4 (Contacts, Companies, Lists, Associations) via OAuth |
| CSV parsing | Papa Parse |
| Deployment | Vercel |

## How it's built

**Scraping pipeline.** All scraping happens server-side in Next.js API routes — never in the browser. For each URL: fetch HTML → parse with Cheerio → run the selected detection modules (`lib/scraper/detect*.ts`) → score the result (`lib/scraper/score.ts`) → persist to Supabase. URLs are deduplicated before queueing, requests run with 5–10x concurrency and a 500ms delay between fetches, and failures are tagged by type (timeout, blocked, DNS failure, SSL error, parse error, or empty page) rather than stopping the batch. Sites that return an empty page (client-side-rendered SPAs) are automatically retried through a headless Chromium fallback via Playwright.

**Scoring.** Scoring is dynamic — only the criteria a user actually selected for that list feed into the formula, so unselected checks never penalize or reward a prospect. The logic favors businesses that are actively trying (and failing) to capture leads — e.g., a contact form with no chatbot and no booking system scores hotter than a fully-covered site, because that's the clearest signal of an unmet need.

**AI Intel Cards.** Generated on demand for Hot/Warm prospects only, once per prospect, and cached permanently — never silently regenerated. The generation call gathers the full prospect record, the scraped website content (homepage, about, team, blog), and any detected social profile activity, then sends it to Claude with a structured-JSON-only prompt. The response is dual-written: the full card to a `jsonb` column, and the outreach hook alone to its own text column (since it's surfaced independently in the UI, exports, and HubSpot).

**HubSpot integration.** Two-directional, OAuth-based, and designed so the two systems never clobber each other's data:
- **Pull** (HubSpot → LeadPulse): HubSpot is the source of truth for contact/company info (name, email, phone, employee count, revenue). LeadPulse-owned fields — score, detected signals, Intel Cards, outreach hooks — are never overwritten by a pull.
- **Push** (LeadPulse → HubSpot): LeadPulse is the source of truth for everything it generates. Custom properties are auto-created idempotently before each sync, contacts/companies are upserted (search-then-create, never blind-create), and Contact/Company records are associated via the v4 Associations API.
- Rate-limited to stay under HubSpot API limits (200ms between requests), with a three-tier fallback for fetching HubSpot list memberships across differing token scopes and list types.

**Multi-tenancy.** Supabase Auth handles signup/login; a `profiles` table extends each user with plan tier, role, and (Pro-only) HubSpot OAuth tokens. Every list, prospect, and export is scoped to its owning user via row-level access patterns — nothing crosses between accounts.

## Plans

| | Starter | Pro |
|---|---|---|
| Prospects/month | 250 | Unlimited |
| Scraping, scoring, industry templates, CSV import/export | ✅ | ✅ |
| AI Intel Cards | Pay per use | 100/month included |
| HubSpot two-way sync | ❌ | ✅ |

## Getting started

```bash
npm install
npm run dev
```

Requires a Supabase project (schema in `docs/leadpulse_supabase_schema_V2.1.sql`) and API keys for Anthropic and HubSpot — see `.env.local` for the full list of required environment variables.

## Project docs

Full technical reference, database schema, scoring rules, and integration contracts live in [`CLAUDE.md`](./CLAUDE.md), with feature-specific detail in `CLAUDE_V2_APPENDIX.md` (email sequencing, Apollo, Playwright) and `CLAUDE_OFFER_TYPES.md` (multi-offer system).
