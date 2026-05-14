# LeadPulse — Claude Project Context
> Built by Kalibri Studios — Valeriya Paine | KalibriStudios.AI
> This file gives Claude full context on the LeadPulse codebase. Read this before writing any code.

---

## What Is LeadPulse?

LeadPulse is an AI-powered prospect qualification engine. It is designed for agencies, consultants, and sales teams who prospect service businesses at scale using Apollo or HubSpot.

**Core workflow:** Export a prospect list as a CSV (or pull directly from HubSpot) → upload to LeadPulse → select industry and qualification criteria → LeadPulse visits every website automatically → detects chatbots, high-ticket services, tech stacks, booking platforms, locations → scores every lead Hot, Warm, or Cold → generate AI Intel Cards for best prospects → export CSV or push to HubSpot CRM.

**LeadPulse does not replace Apollo. Apollo finds prospects. LeadPulse tells you which ones are worth calling and exactly how to open the conversation.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 — App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — email/password + magic link |
| Scraping | Cheerio + node-fetch — server-side API routes ONLY, never client-side |
| Background jobs | Next.js API routes with async queue processing |
| AI / Intel Cards | Anthropic Claude API — model: `claude-sonnet-4-20250514` |
| CRM Integration | HubSpot API v3 (Contacts, Companies, Properties, Engagements) |
| Deployment | Vercel |
| Package manager | npm |

---

## Project Structure

```
/app                        — Next.js App Router pages and API routes
/app/api/                   — All server-side API routes
/app/api/prospects/         — Prospect scraping and scoring routes
/app/api/prospects/[id]/intel/route.ts  — Intel Card generation
/app/api/hubspot/sync/route.ts          — HubSpot push (LeadPulse → HubSpot)
/app/api/hubspot/pull/route.ts          — HubSpot pull (HubSpot → LeadPulse)
/app/api/hubspot/lists/route.ts         — Fetch available HubSpot lists for pull UI
/app/api/hubspot/auth/route.ts          — OAuth authorization redirect
/app/api/hubspot/callback/route.ts      — OAuth callback, stores tokens in profiles
/app/api/hubspot/setup-properties/route.ts — Auto-create HubSpot custom properties
/app/debug                  — Debug panel page (/app/debug)
/lib/scraper/               — All detection modules (see below)
/lib/supabase/              — Supabase client helpers
```

---

## Supabase Database Schema

### Table: `profiles`
Extended user data. Auto-created on Supabase Auth signup via trigger.

| Column | Type | Notes |
|---|---|---|
| id | uuid | references auth.users — primary key |
| email | text | not null |
| full_name | text | |
| company_name | text | |
| plan | text | 'starter' or 'pro' — default 'starter' |
| role | text | 'admin' or 'user' — default 'user' |
| hubspot_access_token | text | Pro plan only — HubSpot OAuth access token, obtained via OAuth flow |
| hubspot_refresh_token | text | Pro plan only — HubSpot OAuth refresh token, used to renew access token |
| hubspot_token_expires_at | timestamptz | Pro plan only — expiry time of current access token |
| hubspot_portal_id | text | HubSpot portal ID — used to build direct record links in UI |
| created_at | timestamptz | auto-managed |
| updated_at | timestamptz | auto-managed |

### Table: `industry_templates`
Seeded on deploy. Read-only at runtime.

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| name | text | unique — display name e.g. "Med Spa / Aesthetics" |
| slug | text | unique — e.g. "med_spa" |
| default_keywords | text[] | pre-loaded keyword array |
| sort_order | int | controls display order in UI |

### Table: `prospect_lists`

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| user_id | uuid | references profiles |
| name | text | user-defined list name |
| description | text | optional |
| industry_template_id | uuid | references industry_templates |
| industry_name | text | denormalized for display |
| service_keywords | text[] | user-customized keyword set for this list |
| selected_criteria | text[] | default: all 10. e.g. ARRAY['chatbot','services','crm_emr_platform',...] |
| filter_summary | text | generated at HubSpot sync time — snapshot of list name, industry, keywords, criteria, score, scrape date |
| total_prospects | int | count of all prospects in list |
| hot_count | int | |
| warm_count | int | |
| cold_count | int | |
| status | text | 'pending' / 'processing' / 'complete' / 'error' |
| created_at | timestamptz | auto-managed |
| updated_at | timestamptz | auto-managed |

### Table: `prospects`

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| list_id | uuid | references prospect_lists |
| user_id | uuid | references profiles |
| website_url | text | NOT NULL — primary scrape target |
| business_name | text | from Apollo/HubSpot CSV or About page |
| contact_name | text | from CSV |
| email | text | from CSV |
| phone | text | from CSV |
| city | text | from CSV |
| state | text | from CSV |
| has_chatbot | text | **'yes' / 'no' / 'unknown'** — NOT boolean |
| chatbot_platform | text | detected platform name or null |
| has_contact_form | text | **'yes' / 'no' / 'unknown'** — NOT boolean |
| has_online_booking | text | **'yes' / 'no' / 'unknown'** — NOT boolean |
| crm_emr_platform | text | detected CRM/EMR platform name or null |
| crm_platform | text | detected CRM platform name or null |
| high_ticket_services | text[] | array of matched service keywords |
| location_count | int | number of locations detected |
| is_multi_location | boolean | |
| analytics_platform | text | detected analytics tool or null |
| employee_count | text | '1-5' / '6-15' / '16-50' / '50+' — from CSV or manual entry |
| revenue_range | text | '<$500K' / '$500K-$1M' / '$1M-$5M' / '$5M+' — from CSV or manual entry |
| score | text | **'hot' / 'warm' / 'cold'** — default 'cold' |
| score_reason | text | short explanation of score |
| outreach_hook | text | AI-generated standalone outreach opener — also stored inside intel jsonb |
| intel | jsonb | full AI Intel Card — see Intel Card JSONB Structure section below |
| intel_generated_at | timestamptz | |
| scraped_at | timestamptz | timestamp when scrape completed for this prospect |
| scrape_status | text | 'pending' / 'processing' / 'complete' / 'error' |
| scrape_error | text | raw error message if failed |
| error_type | text | 'TIMEOUT' / 'BLOCKED' / 'DNS_FAILED' / 'PARSE_ERROR' / 'SSL_ERROR' / 'EMPTY_PAGE' / 'UNKNOWN' |
| hubspot_contact_id | text | HubSpot contact record ID after sync |
| hubspot_company_id | text | HubSpot company record ID after sync |
| hubspot_synced_at | timestamptz | |
| created_at | timestamptz | auto-managed |
| updated_at | timestamptz | auto-managed |

### Table: `scrape_jobs`

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| list_id | uuid | references prospect_lists |
| user_id | uuid | references profiles |
| total_urls | int | total URLs submitted |
| processed_urls | int | completed (success + error) |
| failed_urls | int | error count |
| status | text | 'queued' / 'running' / 'complete' / 'error' |
| error_summary | jsonb | per-run breakdown by error type |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| created_at | timestamptz | auto-managed |

### Table: `usage`

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | references profiles |
| month | text | 'YYYY-MM' |
| prospects_scraped | int | monthly scrape count for plan limit enforcement |
| hubspot_synced | int | monthly HubSpot sync count |

---

## Critical Data Type Rules

> **NEVER use booleans for has_chatbot, has_contact_form, or has_online_booking.**
> These are always stored and compared as text: `'yes'` / `'no'` / `'unknown'`
> `'unknown'` means the criteria was not selected or the scrape failed for that field.
> This supports the three-state dropdown in HubSpot (Yes / No / Unknown).

---

## Scraper Architecture

All scraping runs **server-side in Next.js API routes only**. Never client-side.

Pipeline per URL:
1. Fetch HTML with node-fetch
2. Parse with Cheerio
3. Run selected detection modules
4. Score with score.ts
5. Save to Supabase

**500ms delay between URL fetches.** Failed URLs are marked as error and skipped — batch continues without stopping.

**Concurrency:** 5-10 URLs processed simultaneously.

**Deduplication:** Same URL scraped once — results applied to all matching prospect rows.

### Detection Modules — `/lib/scraper/`

| File | What it does | Returns |
|---|---|---|
| `detectChatbot.ts` | Scans script tags for Intercom (widget.intercom.io), HubSpot (js.hs-scripts.com), Drift (js.driftt.com), Tidio (code.tidio.co), LiveChat (cdn.livechatinc.com), Crisp (client.crisp.chat), Tawk (tawk.to) | `{ hasChat: string, platform: string \| null }` |
| `detectContactForm.ts` | Finds HTML forms with name/email/phone/message fields and non-booking submit buttons | `{ hasContactForm: string }` |
| `detectServices.ts` | Accepts `(html: string, keywords: string[])` — keywords from `prospect_lists.service_keywords` | `{ services: string[] }` |
| `detectPlatforms.ts` | Scans scripts/iframes/links for CRM/EMR: Vagaro, Mindbody, Boulevard, Aesthetic Record, Zenoti, Jane App, Acuity, PatientNow, Nextech, Square Appointments. Also CRM: HubSpot, Salesforce, GoHighLevel, ActiveCampaign, Zoho, Klaviyo, Keap | `{ crmEmrPlatform: string \| null, crmPlatform: string \| null }` |
| `detectLocations.ts` | Reads /locations links, footer address patterns, about page location lists | `{ locationCount: number, isMultiLocation: boolean }` |
| `detectBooking.ts` | Finds booking CTAs — book now, schedule, reserve buttons/links and booking iframes. Contact forms excluded. | `{ hasOnlineBooking: string }` |
| `detectAnalytics.ts` | Identifies GA, GTM, Hotjar, Mixpanel, and other BI tools from script patterns | `{ analyticsPlatform: string \| null }` |
| `score.ts` | Takes all detection results + selected_criteria array — returns score and reason. **Only uses selected criteria in formula.** | `{ score: 'hot' \| 'warm' \| 'cold', score_reason: string }` |

---

## Scoring Logic

Scoring is **dynamic** — only criteria selected for that list are used in the formula. Unselected criteria are excluded entirely.

| Score | Logic |
|---|---|
| 🔥 **HOT** | No chatbot + service keywords found + contact form only (no booking widget). Also Hot: no chatbot + no contact form + no booking = completely uncovered. |
| ⚡ **WARM** | Missing one key qualifier. Has some lead capture but gaps remain. |
| ❄️ **COLD** | Already has a chatbot or full booking solution. Deprioritize. |

**Contact Form Scoring Rule:** A contact form with no chatbot and no booking widget is treated as a HOTTER signal than having a booking widget. The business is trying to capture leads poorly — a chatbot closes that gap directly.

---

## Qualification Criteria (All 10)

| # | Key | What it detects |
|---|---|---|
| 1 | `chatbot` | Live chat or chatbot widget |
| 2 | `contact_form` | Lead capture forms (not booking widgets) |
| 3 | `services` | User-defined service keywords found on site |
| 4 | `crm_emr_platform` | Practice management / booking software |
| 5 | `crm_platform` | CRM platform in use |
| 6 | `locations` | Single vs multi-location |
| 7 | `online_booking` | Active booking button or scheduling integration |
| 8 | `analytics` | Analytics/BI tools — signals tech-forward operation |
| 9 | `employee_count` | From Apollo/HubSpot CSV or manual entry |
| 10 | `revenue_range` | From Apollo/HubSpot CSV or manual entry |

All 10 are checked by default. Only selected criteria appear in results, scoring, and exports.

---

## Industry Templates

Selecting an industry is required. Keywords pre-load from the template and are fully editable per list.

| Industry | Slug | Default Keywords |
|---|---|---|
| Med Spa / Aesthetics | med_spa | Morpheus8, RF Microneedling, Fillers, Botox, Laser Resurfacing, CoolSculpting, EmSculpt, Ultherapy, Kybella, PRP |
| Dental | dental | Implants, Invisalign, Veneers, Full Mouth Reconstruction, Smile Makeover, Teeth Whitening |
| Legal | legal | Personal Injury, Medical Malpractice, Immigration, Criminal Defense, Estate Planning, Mass Tort |
| HVAC / Home Services | hvac | Full System Replacement, Duct Replacement, Generator Install, Whole-Home Repiping, Roof Replacement |
| Real Estate | real_estate | Luxury Listings, Commercial Properties, Property Management, Investment Properties |
| Wellness / Chiro | wellness | Spinal Decompression, Regenerative Therapy, IV Therapy, Weight Loss Programs, Hormone Therapy |
| Other / Custom | custom | No default keywords — user defines all |

---

## AI Intel Cards

Generated on demand for **Hot and Warm prospects only**. Cold prospects do not get a Generate Intel button.

- Model: `claude-sonnet-4-20250514`
- Max tokens: 1000
- Response format: **structured JSON only — no preamble, no markdown**
- Generated once, saved permanently to `prospects.intel` (jsonb). Never regenerated unless manually requested.
- API route: `/api/prospects/[id]/intel/route.ts`

### System Prompt
```
You are a sales intelligence analyst. Based on the business data provided, generate a concise prospect intelligence briefing for a sales rep about to make first contact. The outreach hook must be specific to this exact prospect — never generic. Return only valid JSON.
```

### Intel JSON Structure
```json
{
  "outreach_hook": "...",
  "business_summary": "...",
  "owner_profile": "...",
  "social_signals": "...",
  "conversation_starters": ["...", "...", "..."],
  "pain_indicators": "..."
}
```

### Intel Card Dual-Write Rule — IMPORTANT

When the Claude API returns the Intel Card JSON, two writes must happen simultaneously:

1. **Write the entire JSON object** to `prospects.intel` (jsonb column) — stores the complete Intel Card permanently
2. **Write `outreach_hook` alone** to `prospects.outreach_hook` (standalone text column) — this is what appears in the results table outreach hook column and what gets pushed to HubSpot Contact property `outreach_hook`

The `outreach_hook` lives in TWO places — inside `prospects.intel` as part of the full JSON, and also in `prospects.outreach_hook` as a standalone text field. Both must be written on every Intel Card generation. Never write one without the other.

**Reading Intel Card fields from the jsonb in code:**
```typescript
// Accessing individual fields from the intel jsonb
const intel = prospect.intel as {
  outreach_hook: string
  business_summary: string
  owner_profile: string
  social_signals: string
  conversation_starters: string[]
  pain_indicators: string
}

// outreach_hook is ALSO available directly as prospect.outreach_hook
```

### Data gathered before API call
- Full prospect record from Supabase (score, services, chatbot, CRM/EMR, contact form, locations, booking)
- Full website content — homepage, about page, team page, blog posts scraped server-side
- Social media — Instagram, Facebook, or TikTok URL from site header/footer links. Public profile fetched and recent post captions extracted.

### Full API Call Structure

The Intel Card is generated at `/api/prospects/[id]/intel/route.ts`. Here is the exact structure of the API call:

```typescript
// 1. Fetch prospect from Supabase by ID
// 2. Scrape full website content server-side (homepage + about + team + blog)
// 3. Detect social media URLs from site, fetch public profile captions
// 4. Build user message and call Claude API

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: 'You are a sales intelligence analyst. Based on the business data provided, generate a concise prospect intelligence briefing for a sales rep about to make first contact. The outreach hook must be specific to this exact prospect — never generic. Return only valid JSON.',
    messages: [
      {
        role: 'user',
        content: `Generate a prospect intelligence briefing for the following business:

BUSINESS NAME: ${prospect.business_name}
WEBSITE: ${prospect.website_url}
LOCATION: ${prospect.city}, ${prospect.state}
INDUSTRY: ${list.industry_name}
SCORE: ${prospect.score}
SCORE REASON: ${prospect.score_reason}

QUALIFICATION DATA:
- Has Chatbot: ${prospect.has_chatbot}
- Chatbot Platform: ${prospect.chatbot_platform || 'none'}
- Has Contact Form: ${prospect.has_contact_form}
- Has Online Booking: ${prospect.has_online_booking}
- CRM/EMR Platform: ${prospect.crm_emr_platform || 'none'}
- CRM Platform: ${prospect.crm_platform || 'none'}
- Services Detected: ${prospect.high_ticket_services?.join(', ') || 'none'}
- Location Count: ${prospect.location_count}
- Is Multi-Location: ${prospect.is_multi_location}
- Analytics Platform: ${prospect.analytics_platform || 'none'}
- Employee Count: ${prospect.employee_count || 'unknown'}
- Revenue Range: ${prospect.revenue_range || 'unknown'}

WEBSITE CONTENT:
${websiteContent}

SOCIAL MEDIA:
${socialContent || 'No social media found'}

Return only valid JSON matching this exact structure — no preamble, no markdown, no explanation:
{
  "outreach_hook": "one specific sentence to open the conversation — never generic, based on exact data above",
  "business_summary": "3-4 sentences on what they do, who they serve, positioning, differentiators",
  "owner_profile": "what kind of person runs this business — clinical vs personality-driven, how to show up",
  "social_signals": "what they have been posting about lately and what it signals about focus or pain",
  "conversation_starters": ["specific thing 1", "specific thing 2", "specific thing 3"],
  "pain_indicators": "where they are likely feeling friction right now based on gaps, tech stack, social activity"
}`
      }
    ]
  })
})
```

### After API Response — Save to Supabase

```typescript
const data = await response.json()
const intelJson = JSON.parse(data.content[0].text)

// Dual-write — both fields must be updated in the same Supabase call
await supabase
  .from('prospects')
  .update({
    intel: intelJson,                          // full JSON to jsonb column
    outreach_hook: intelJson.outreach_hook,    // standalone text column
    intel_generated_at: new Date().toISOString()
  })
  .eq('id', prospectId)
```

### What Each Intel Field Should Contain

| Field | Description | Type |
|---|---|---|
| `outreach_hook` | One prospect-specific sentence to open first contact. Never generic. Based on exact scrape data — chatbot gap, service gap, platform, location count. | string |
| `business_summary` | 3-4 sentences: what they do, who they serve, positioning, differentiators. From website copy. | string |
| `owner_profile` | What kind of person runs this — clinical vs personality-driven, new vs veteran, tech-savvy vs not. How to show up in the conversation. | string |
| `social_signals` | What they have been posting about lately — new equipment, promotions, hiring, slow season. What it signals about current focus or pain. | string |
| `conversation_starters` | 3 specific, genuine things to reference in outreach. Each one copyable individually. | string[] |
| `pain_indicators` | Where they are likely feeling friction right now — synthesized from website gaps, review sentiment, social activity, tech stack. | string |

### Intel Fields in CSV Export

When exporting a prospect list as CSV, the intel jsonb is flattened into separate columns. The exact column names used in the export are:

| JSON Field | CSV Export Column | Notes |
|---|---|---|
| `outreach_hook` | `outreach_hook` | Already a top-level column on prospects table — exported directly. Intel route also overwrites `prospect.outreach_hook` with this value on every generation. |
| `business_summary` | `intel_business_summary` | Prefixed with `intel_` |
| `owner_profile` | `intel_owner_profile` | Prefixed with `intel_` |
| `social_signals` | `intel_social_signals` | Prefixed with `intel_` |
| `conversation_starters` | `intel_conversation_starters` | Array joined with ` | ` pipe separator before export |
| `pain_indicators` | `intel_pain_indicators` | Prefixed with `intel_` |

**Rules:**
- `outreach_hook` is exported as a top-level column — no `intel_` prefix — because it exists as a standalone field on the prospects table
- All other intel fields are prefixed with `intel_` in the CSV
- `conversation_starters` is a `string[]` — join with ` | ` before writing to CSV so it fits in one cell
- If `prospects.intel` is null (Intel Card not generated), all `intel_` columns export as empty strings — never null

### Cost
$0.01–$0.03 per Intel Card. 50 cards ≈ $0.50–$1.50 total.

---

## Error Types

| Code | Meaning |
|---|---|
| TIMEOUT | Request exceeded time limit |
| BLOCKED | 403 or 429 — site detected bot traffic |
| DNS_FAILED | URL does not resolve — dead site or wrong URL |
| PARSE_ERROR | Page loaded but content could not be read |
| SSL_ERROR | Certificate error preventing connection |
| EMPTY_PAGE | Page loaded but is a client-side SPA — no readable HTML. Requires Playwright (V2). |
| UNKNOWN | Any other error — raw message stored in scrape_error |

Debug panel available at `/app/debug` — shows all scrape jobs, error counts, timestamps, per-error-type breakdown. EMPTY_PAGE errors show note: "This site may require headless browser rendering."

---

## CSV Auto-Import (Apollo & HubSpot)

LeadPulse performs case-insensitive fuzzy matching on column headers. Extra columns are ignored.

| Source Column Name | LeadPulse Field | Notes |
|---|---|---|
| Website / Company Website URL / Domain | website_url | **Required** — primary scrape target |
| Company / Account Name | business_name | Fuzzy matched |
| First Name + Last Name | contact_name | Concatenated |
| Email | email | |
| Phone | phone | |
| City | city | |
| State | state | |
| # Employees / Employee Count | employee_count | Fuzzy matched |
| Annual Revenue / Revenue Range | revenue_range | Fuzzy matched |

URLs are deduplicated before scraping begins.

---

## HubSpot Integration

HubSpot sync is a **Pro plan feature**. LeadPulse connects to HubSpot via a **Public App OAuth flow** — users click "Connect HubSpot" in Settings, authorize via HubSpot's OAuth consent screen, and LeadPulse stores the resulting tokens in their profile.

**Environment variables (server-side only — never expose to client):**
- `HUBSPOT_CLIENT_ID` — from the HubSpot Public App settings
- `HUBSPOT_CLIENT_SECRET` — from the HubSpot Public App settings

**OAuth token storage per user (in `profiles` table):**
- `hubspot_access_token` — current Bearer token used in all API calls
- `hubspot_refresh_token` — used to renew the access token when it expires
- `hubspot_token_expires_at` — expiry timestamp; refresh before making API calls if past this value

All HubSpot API calls use `Authorization: Bearer {hubspot_access_token}`. Always check expiry and refresh the token before any sync operation.

### Sync Flow Per Prospect (in order)

**Step A — Upsert Company**
Search HubSpot by `website` domain using Search API (`POST /crm/v3/objects/companies/search`). Update if found, create if not. Save ID to `prospects.hubspot_company_id`.

**Step B — Upsert Contact**
Search HubSpot by `email` first, then `phone` if no email. Update if found, create if not. Save ID to `prospects.hubspot_contact_id`.

**Step C — Associate**
Associate Contact to Company using HubSpot Associations API v4:
`PUT /crm/v4/objects/contacts/{contactId}/associations/default/companies/{companyId}`

**Step D — LeadPulse Intel Property**
If `prospects.intel` is not null, format the Intel Card as structured text and write it to the `leadpulse_intel` custom property on both the Contact and Company records.

**Step E — Update Supabase**
Save `hubspot_contact_id`, `hubspot_company_id`, and `hubspot_synced_at` back to `prospects` table.

**Rate limit:** 200ms delay between each prospect. HubSpot free plans allow 100 requests per 10 seconds. Sync accepts array of prospect IDs, processes sequentially.

### HubSpot Contact & Company Properties

Contact and company records receive **identical** LeadPulse custom properties. Both are auto-created by `ensureCustomProperties()` in `lib/hubspot.ts` at the start of each sync run (idempotent — checks before creating).

**LeadPulse custom properties (same on both Contact and Company):**

| Label | Internal Name | Type | Contact Group | Company Group |
|---|---|---|---|---|
| Outreach Hook | outreach_hook | Single line text | contactinformation | companyinformation |
| LeadPulse Score | leadpulse_score | Single line text | contactinformation | companyinformation |
| LeadPulse List Name | leadpulse_list_name | Single line text | contactinformation | companyinformation |
| LeadPulse Filter Summary | leadpulse_filter_summary | Multi-line text | contactinformation | companyinformation |
| Practice Platform | practice_platform | Single line text | contactinformation | companyinformation |
| CRM Platform | crm_platform | Single line text | contactinformation | companyinformation |
| Has Chatbot | has_chatbot | Dropdown: Unknown / Yes / No | contactinformation | companyinformation |
| Has Contact Form | has_contact_form | Dropdown: Unknown / Yes / No | contactinformation | companyinformation |
| Has Online Booking | has_online_booking | Dropdown: Unknown / Yes / No | contactinformation | companyinformation |
| Services Detected | services_detected | Single line text | contactinformation | companyinformation |
| Location Count | location_count | Number | contactinformation | companyinformation |
| LeadPulse Intel | leadpulse_intel | Multi-line text | contactinformation | companyinformation |

**Default HubSpot Contact properties — already exist, just populate, never create:**

| Label | Internal Name | Notes |
|---|---|---|
| First Name | firstname | First word of contact_name |
| Last Name | lastname | Remainder of contact_name after first space |
| Email | email | |
| Phone | phone | |
| Number of Employees | numemployees | |
| Annual Revenue | annualrevenue | |

**Default HubSpot Company properties — already exist, just populate, never create:**

| Label | Internal Name | Notes |
|---|---|---|
| Company Name | name | |
| Website URL | website | Used for domain matching / deduplication |
| City | city | |
| State | state | |
| Number of Employees | numberofemployees | |
| Annual Revenue | annualrevenue | |

**Pre-existing HubSpot properties — DO NOT create, DO NOT overwrite:**
LinkedIn URL, Lead Source, Last Contacted, Intent Signals active, Has been enriched. LeadPulse never touches these fields.

### HubSpot Value Mapping

- `has_chatbot`, `has_contact_form`, `has_online_booking`: stored in Supabase as lowercase `yes/no/unknown` — push to HubSpot capitalized: `Yes / No / Unknown`
- `score`: stored in Supabase as lowercase `hot/warm/cold` — push to HubSpot capitalized: `Hot / Warm / Cold`
- `high_ticket_services`: stored as `text[]` — push to HubSpot as comma-separated string

### LeadPulse Filter Summary Format
```
LeadPulse List: [list name]
Industry: [industry_name]
Keywords: [service_keywords joined by comma]
Criteria: [selected_criteria joined by comma]
Score: [prospect score]
Scraped: [scraped_at date — Month DD YYYY]
```

### LeadPulse Intel Property Format

When `prospects.intel` is not null, the Intel Card is formatted as structured text and written to the `leadpulse_intel` property on **both** the Contact and Company records. No HubSpot Note/Engagement is created.

```
LeadPulse Intel — Generated [intel_generated_at]

OUTREACH HOOK: [outreach_hook]

BUSINESS SUMMARY: [business_summary]

OWNER PROFILE: [owner_profile]

SOCIAL SIGNALS: [social_signals]

CONVERSATION STARTERS:
- [starter 1]
- [starter 2]
- [starter 3]

PAIN INDICATORS: [pain_indicators]
```

---

### HubSpot Pull (Import from HubSpot)

Pull is the reverse of sync — it imports records FROM HubSpot INTO LeadPulse. Pro plan only.

#### Pull Source (dropdown)

| Option | Description |
|---|---|
| **HubSpot List** | Pulls from a native HubSpot Company List. Fetches companies + their primary associated Contact via Associations API v4. Creates a new LeadPulse list. |
| **LeadPulse List** | Queries HubSpot for contacts/companies where `leadpulse_list_name = X`. Distinct list names are fetched live. Merges into the **existing** LeadPulse list of that name. |

#### Pull Flow — HubSpot List

1. Fetch all HubSpot Company Lists via `GET /crm/v3/lists?objectType=COMPANY`
2. User selects a list — fetch its members via `GET /crm/v3/lists/{listId}/memberships`
3. For each company, fetch primary associated Contact via `GET /crm/v4/objects/companies/{id}/associations/contacts`
4. Map to LeadPulse prospect rows (see field mapping below)
5. Create a new LeadPulse list named after the HubSpot list
6. Insert all prospects — match on `hubspot_company_id`, then `email`, then root domain

#### Pull Flow — LeadPulse List

1. Query HubSpot for distinct `leadpulse_list_name` values via Search API
2. User selects a list name — fetch all contacts/companies with that property value
3. Match each record to an existing prospect in the LeadPulse list (by `hubspot_contact_id`, then `email`, then domain)
4. Apply conditional upsert (see field ownership rules below)
5. New records not yet in the list are added as new prospect rows

#### Field Ownership — Pull vs Push

**On Pull (HubSpot → LeadPulse):** HubSpot is source of truth for contact/company data only.

| Field | Action |
|---|---|
| `contact_name`, `email`, `phone` | Always update from HubSpot |
| `business_name`, `city`, `state` | Always update from HubSpot |
| `employee_count`, `revenue_range` | Always update from HubSpot |
| `website` / domain | Update only if prospect not yet scraped (`scraped_at IS NULL`) |
| `score`, `scraped_at`, `intel` | Never overwrite — LeadPulse owns these |
| `has_chatbot`, `has_online_booking`, `has_contact_form` | Never overwrite |
| `outreach_hook`, all detected signals | Never overwrite |

**On Push (LeadPulse → HubSpot):** LeadPulse is always source of truth — overwrite all LeadPulse fields unconditionally on both Contact and Company records.

#### HubSpot → LeadPulse Field Mapping (Pull)

| HubSpot Property | LeadPulse Field |
|---|---|
| `domain` (Company) | `website` |
| `name` (Company) | `business_name` |
| `city` (Company) | `city` |
| `state` (Company) | `state` |
| `numberofemployees` (Company) | `employee_count` |
| `annualrevenue` (Company) | `revenue_range` |
| `firstname` + `lastname` (Contact) | `contact_name` |
| `email` (Contact) | `email` |
| `phone` (Contact) | `phone` |
| `hs_object_id` (Company) | `hubspot_company_id` |
| `hs_object_id` (Contact) | `hubspot_contact_id` |

#### Rate Limits

Same 200ms delay between requests as push sync.

---

## Plans

| | Starter — $49/mo | Pro — $149/mo |
|---|---|---|
| Prospects/month | 250 | Unlimited |
| CSV upload & batch scraping | ✅ | ✅ |
| All 10 qualification criteria | ✅ | ✅ |
| Industry templates + custom keywords | ✅ | ✅ |
| Apollo/HubSpot CSV auto-import | ✅ | ✅ |
| Filter, sort, export to CSV | ✅ | ✅ |
| Saved prospect lists | ✅ | ✅ |
| AI Intel Cards | Pay per use | 100 included/month |
| Error tracking & debug panel | ✅ | ✅ |
| HubSpot Contact + Company sync | ❌ | ✅ |
| LeadPulse Intel property sync | ❌ | ✅ |
| LeadPulse Filter Summary in HubSpot | ❌ | ✅ |
| Multi-filter scoring dashboard | ❌ | ✅ |
| Priority scraping | ❌ | ✅ |
| Bulk field editing | ❌ | ✅ |

---

## Processing Limits

| | Value |
|---|---|
| Recommended list size | 250 per run |
| Maximum list size | 500 per run |
| Processing time (250) | ~12–20 minutes |
| Processing time (500) | ~25–40 minutes |
| Concurrency | 5–10 simultaneous |
| Delay between requests | 500ms |

---

## V2 Roadmap (not yet built)

- **Headless browser scraping** — Playwright for SPA/React sites (EMPTY_PAGE errors)
- **Pain signal detection** — review sentiment, job listings, social posting frequency
- **Billing & subscriptions** — Stripe integration
- **Multi-tenant SaaS** — public product with user registration and plan enforcement
- **Outreach hook export** — as HubSpot sequence trigger
- **Franchisor-level features** — aggregate scoring across franchise groups

---

## Important Rules for Claude

1. **Never use booleans** for `has_chatbot`, `has_contact_form`, `has_online_booking` — always `'yes' / 'no' / 'unknown'` as text strings.
2. **Never scrape client-side** — all scraping in Next.js API routes only.
3. **Always deduplicate URLs** before adding to the scrape queue.
4. **Scoring only uses selected_criteria** — never include unselected criteria in the score formula.
5. **Intel Cards are generated once** and saved permanently. Do not regenerate unless explicitly triggered.
6. **HubSpot sync is upsert logic** — always search before create. Never blindly create duplicates.
7. **Always capitalize values pushed to HubSpot** — `Hot / Warm / Cold`, `Yes / No / Unknown`.
8. **Rate limits matter** — 500ms delay between scrape requests, 200ms delay between HubSpot sync requests.
9. **Keywords are stored as `text[]`** on `prospect_lists.service_keywords` — one array field, not individual columns.
10. **Every list is isolated** — results, exports, and HubSpot sync always scope to the current list only.
11. **Pull never overwrites enrichment** — on HubSpot pull, never touch `score`, `scraped_at`, `intel`, `outreach_hook`, or any detected signal field. HubSpot owns contact info; LeadPulse owns enrichment.
12. **Push always overwrites** — on HubSpot push, LeadPulse fields overwrite HubSpot unconditionally. LeadPulse is the source of truth for all enrichment data.
