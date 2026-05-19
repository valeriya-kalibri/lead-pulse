# LeadPulse — CLAUDE.md V2 Appendix
> Appends to existing CLAUDE.md. Read V1 CLAUDE.md first, then this file.
> All V1 rules still apply. This file adds V2 features only.
> Version 2.0 | Kalibri Studios | 2026

---

## What Changed in V2

V1 was a prospect qualification engine.
V2 adds an **outbound email campaign layer** — LeadPulse now generates complete personalized 3-step email sequences per prospect, stores them in Supabase, syncs them to HubSpot as custom contact properties, and Apollo pulls those properties as custom snippet fields for use in sequences.

**The user's only manual step is selecting which prospects to add to an Apollo sequence. Everything else is automated.**

---

## V2 Feature Summary

| Feature | Description |
|---|---|
| Email sequence generation | Claude generates 3 personalized emails per prospect using Intel Card data |
| Apollo field mapping | New HubSpot custom properties map directly to Apollo custom fields |
| Stripe billing | Starter ($49/mo) and Pro ($149/mo) plan enforcement via Stripe |
| Headless browser scraping | Playwright integration for EMPTY_PAGE sites (SPA/React sites) |
| Apollo CSV export format | Export includes all email sequence fields pre-formatted for Apollo import |

---

## V2 Email Sequence Architecture

### Concept

After an Intel Card is generated for a Hot or Warm prospect, the user can click **Generate Email Sequence**. LeadPulse calls the Claude API and generates a complete 3-step cold email sequence — subject line and body for each step — personalized from the prospect's Intel Card data.

All 3 emails are stored in Supabase on the `prospects` table and synced to HubSpot as custom contact properties. Apollo pulls those properties via its HubSpot field mapping and injects them as custom snippet variables in sequence steps.

### The 3-Email Structure

| Step | Timing | Angle | Key Field |
|---|---|---|---|
| Email 1 | Day 1 | Cold opener — lead with the specific pain gap found | `outreach_email_subject_1`, `outreach_email_body_1` |
| Email 2 | Day 3–4 | Follow-up — add value, different angle, reference no reply | `outreach_email_subject_2`, `outreach_email_body_2` |
| Email 3 | Day 7–8 | Breakup email — short, low pressure, closes the loop | `outreach_email_subject_3`, `outreach_email_body_3` |

The `outreach_hook` (V1) remains as the standalone opening line field. It is the first sentence of Email 1 body. Email 1 body expands on it with a full pitch. Emails 2 and 3 take different angles derived from the same Intel Card data.

### New Fields on `prospects` Table (V2)

Add these columns to the existing `prospects` table:

| Column | Type | Notes |
|---|---|---|
| `outreach_email_subject_1` | text | Subject line for Email 1 |
| `outreach_email_body_1` | text | Full body for Email 1 — opens with outreach_hook, expands into pitch |
| `outreach_email_subject_2` | text | Subject line for Email 2 — follow-up angle |
| `outreach_email_body_2` | text | Full body for Email 2 — value-add, different angle |
| `outreach_email_subject_3` | text | Subject line for Email 3 — breakup email |
| `outreach_email_body_3` | text | Full body for Email 3 — short, low pressure |
| `sequence_generated_at` | timestamptz | Timestamp when email sequence was generated |
| `apollo_sequence_status` | text | 'not_enrolled' / 'enrolled' / 'replied' / 'bounced' / 'completed' — default 'not_enrolled' |
| `apollo_enrolled_at` | timestamptz | Timestamp when manually enrolled in Apollo sequence — set by user action in LeadPulse UI |

**Important:** `apollo_sequence_status` and `apollo_enrolled_at` are manually updated by the user inside LeadPulse. Apollo does not write back to LeadPulse automatically. The user marks a prospect as enrolled after adding them to an Apollo sequence. Apollo logs the sent email activity to HubSpot but does not update LeadPulse directly.

---

## Email Sequence Generation — Claude API Call

### Route
`/app/api/prospects/[id]/sequence/route.ts`

### Prerequisites
- Prospect must have `intel` not null (Intel Card must exist first)
- Prospect must be `score = 'hot'` or `score = 'warm'`
- Cold prospects do not get a Generate Email Sequence button

### Generation Logic
Email sequence is generated **after** the Intel Card exists. The API call uses the full Intel Card data plus the raw scrape data as input. It does NOT re-scrape the website — all data comes from what is already stored in Supabase.

### System Prompt
```
You are an expert cold email copywriter specializing in outbound sales for AI automation and chatbot services sold to small and mid-sized service businesses. Write personalized, conversational cold emails that do not sound like templates. Each email must reference specific details about this exact business. Never use generic phrases like "I came across your website" or "I hope this finds you well." Return only valid JSON — no preamble, no markdown.
```

### User Message Structure
```typescript
`Generate a 3-step cold email sequence for the following prospect. The sender is Valeriya Paine from Kalibri Studios — an AI automation agency that builds chatbots, AI voice agents, and agentic workflows for service businesses.

PROSPECT DATA:
Business: ${prospect.business_name}
Contact: ${prospect.contact_name}
Website: ${prospect.website_url}
Location: ${prospect.city}, ${prospect.state}
Industry: ${list.industry_name}
Score: ${prospect.score}
Score Reason: ${prospect.score_reason}

QUALIFICATION SIGNALS:
- Has Chatbot: ${prospect.has_chatbot}
- Has Contact Form: ${prospect.has_contact_form}
- Has Online Booking: ${prospect.has_online_booking}
- Services Detected: ${prospect.high_ticket_services?.join(', ') || 'none'}
- CRM/EMR Platform: ${prospect.crm_emr_platform || 'none'}
- CRM Platform: ${prospect.crm_platform || 'none'}
- Location Count: ${prospect.location_count}
- Employee Count: ${prospect.employee_count || 'unknown'}
- Revenue Range: ${prospect.revenue_range || 'unknown'}

INTEL CARD:
Outreach Hook: ${prospect.outreach_hook}
Business Summary: ${intel.business_summary}
Owner Profile: ${intel.owner_profile}
Social Signals: ${intel.social_signals}
Pain Indicators: ${intel.pain_indicators}
Conversation Starters: ${intel.conversation_starters?.join(' | ')}

EMAIL GUIDELINES:
- Email 1: Cold opener. Lead with the outreach hook. 3-4 short paragraphs. End with a soft CTA — ask one question or suggest a quick call.
- Email 2: Follow-up 3-4 days later. Reference that you reached out before. Take a different angle — lead with a value point or specific insight from the pain indicators. Short — 2-3 paragraphs.
- Email 3: Breakup email 7-8 days after Email 1. Very short — 2-3 sentences max. Low pressure. Leave the door open.
- All emails: Use first name only in greeting. Conversational tone. No buzzwords. No "synergy." No "leverage." Short sentences. Short paragraphs. Mobile-friendly length.
- Subject lines: Specific, curiosity-driven, not salesy. No exclamation marks. Under 50 characters preferred.

Return only valid JSON matching this exact structure:
{
  "outreach_email_subject_1": "...",
  "outreach_email_body_1": "...",
  "outreach_email_subject_2": "...",
  "outreach_email_body_2": "...",
  "outreach_email_subject_3": "...",
  "outreach_email_body_3": "..."
}`
```

### API Call Configuration
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,  // Increased from Intel Card — 3 full emails need more tokens
    system: '...system prompt above...',
    messages: [{ role: 'user', content: '...user message above...' }]
  })
})
```

### Save to Supabase After Generation
```typescript
const data = await response.json()
const sequenceJson = JSON.parse(data.content[0].text)

await supabase
  .from('prospects')
  .update({
    outreach_email_subject_1: sequenceJson.outreach_email_subject_1,
    outreach_email_body_1:    sequenceJson.outreach_email_body_1,
    outreach_email_subject_2: sequenceJson.outreach_email_subject_2,
    outreach_email_body_2:    sequenceJson.outreach_email_body_2,
    outreach_email_subject_3: sequenceJson.outreach_email_subject_3,
    outreach_email_body_3:    sequenceJson.outreach_email_body_3,
    sequence_generated_at:    new Date().toISOString()
  })
  .eq('id', prospectId)
```

### Generation Rules
- Email sequence is generated once and saved permanently. Never regenerate unless the user explicitly clicks Regenerate.
- Intel Card must exist before sequence can be generated. If `prospects.intel` is null, return 400 error.
- Sequence generation is available for Hot and Warm prospects only. Cold prospects show neither Generate Intel nor Generate Email Sequence.
- `max_tokens: 2000` — three full emails require more tokens than a single Intel Card.

---

## Apollo Field Mapping via HubSpot

### How It Works

LeadPulse pushes email sequence fields to HubSpot as custom contact properties (same sync flow as V1 Intel Card push). Apollo's native HubSpot integration pulls those custom properties into Apollo custom fields. The user maps them once in Apollo settings. After that, Apollo automatically has the personalized email copy for every synced contact.

**The user never copies and pastes email copy manually.**

### New HubSpot Custom Properties (V2)

Add these to the existing `ensureCustomProperties()` function in `lib/hubspot.ts`. Applied to **Contact records only** — email sequence fields are contact-level, not company-level.

| Label | Internal Name | Type | Notes |
|---|---|---|---|
| Email 1 Subject | `outreach_email_subject_1` | Single line text | Apollo maps to sequence step 1 subject |
| Email 1 Body | `outreach_email_body_1` | Multi-line text | Apollo maps to sequence step 1 body |
| Email 2 Subject | `outreach_email_subject_2` | Single line text | Apollo maps to sequence step 2 subject |
| Email 2 Body | `outreach_email_body_2` | Multi-line text | Apollo maps to sequence step 2 body |
| Email 3 Subject | `outreach_email_subject_3` | Single line text | Apollo maps to sequence step 3 subject |
| Email 3 Body | `outreach_email_body_3` | Multi-line text | Apollo maps to sequence step 3 body |
| Pain Indicators | `pain_indicators` | Multi-line text | From Intel Card — useful as Apollo custom snippet |
| Conversation Starters | `conversation_starters` | Multi-line text | From Intel Card — pipe-separated — useful reference in Apollo |
| Apollo Sequence Status | `apollo_sequence_status` | Single line text | Not enrolled / Enrolled / Replied / Bounced / Completed |

**Contact group:** `contactinformation` for all new V2 properties.

### Push Rules for V2 Fields

- Email sequence fields are pushed to HubSpot during the standard HubSpot sync (same route: `/api/hubspot/sync/route.ts`)
- Only push email sequence fields if `sequence_generated_at` is not null
- `pain_indicators` and `conversation_starters` are already stored in `prospects.intel` jsonb — extract them at sync time and push as standalone properties
- `conversation_starters` is a `string[]` — join with ` | ` pipe separator before pushing to HubSpot (same as CSV export rule)
- `apollo_sequence_status` is pushed as-is — capitalized: `Not Enrolled / Enrolled / Replied / Bounced / Completed`

### Apollo Setup Instructions (for documentation — not code)

In Apollo → Settings → Integrations → HubSpot → Field Mapping, the user creates these mappings:

| HubSpot Contact Property | Apollo Custom Field |
|---|---|
| `outreach_hook` | Custom Variable: `{{custom_opener}}` |
| `outreach_email_subject_1` | Sequence Step 1 Subject |
| `outreach_email_body_1` | Sequence Step 1 Body |
| `outreach_email_subject_2` | Sequence Step 2 Subject |
| `outreach_email_body_2` | Sequence Step 2 Body |
| `outreach_email_subject_3` | Sequence Step 3 Subject |
| `outreach_email_body_3` | Sequence Step 3 Body |
| `pain_indicators` | Custom Variable: `{{pain_indicators}}` |
| `leadpulse_score` | Custom Field: LeadPulse Score |

---

## Apollo CSV Export Format (V2)

The existing CSV export is updated in V2 to include all email sequence columns. This allows bulk import into Apollo as an alternative to the HubSpot sync path.

### New Columns Added to CSV Export

| Column Name | Source | Notes |
|---|---|---|
| `outreach_email_subject_1` | `prospects.outreach_email_subject_1` | Empty string if sequence not generated |
| `outreach_email_body_1` | `prospects.outreach_email_body_1` | Empty string if sequence not generated |
| `outreach_email_subject_2` | `prospects.outreach_email_subject_2` | Empty string if sequence not generated |
| `outreach_email_body_2` | `prospects.outreach_email_body_2` | Empty string if sequence not generated |
| `outreach_email_subject_3` | `prospects.outreach_email_subject_3` | Empty string if sequence not generated |
| `outreach_email_body_3` | `prospects.outreach_email_body_3` | Empty string if sequence not generated |
| `apollo_sequence_status` | `prospects.apollo_sequence_status` | Empty string if null |
| `pain_indicators` | `prospects.intel->>'pain_indicators'` | Extracted from jsonb at export time |
| `conversation_starters` | `prospects.intel->'conversation_starters'` | Array joined with ` | ` at export time |

---

## V2 UI Changes

### List Detail Page — Prospect Table

New columns visible when sequence has been generated:
- **Seq** — badge showing sequence generation status: `Generated` (green) / `Not Generated` (grey)
- **Apollo Status** — badge: `Not Enrolled` / `Enrolled` / `Replied` / `Bounced` / `Completed`

### Prospect Detail / Intel Card Panel

After Intel Card is generated, a new **Generate Email Sequence** button appears below the Intel Card. Button state:
- Disabled with tooltip "Generate Intel Card first" if `intel` is null
- Active if `intel` exists and `score` is hot or warm
- Shows "Regenerate Sequence" if `sequence_generated_at` is not null

After sequence is generated, the panel shows all 3 emails in collapsible sections — each with a **Copy** button per email for manual use if needed.

### Apollo Enrollment Tracking

On the prospect row or detail panel, a dropdown allows the user to manually update `apollo_sequence_status`:
- Not Enrolled (default)
- Enrolled
- Replied
- Bounced
- Completed

This is the only manual data entry in the V2 campaign flow. All other fields are generated or synced automatically.

---

## V2 Project Structure Additions

```
/app/api/prospects/[id]/sequence/route.ts   — Email sequence generation (new)
/app/api/stripe/webhook/route.ts            — Stripe webhook handler (new)
/app/api/stripe/checkout/route.ts           — Stripe checkout session (new)
/app/api/stripe/portal/route.ts             — Stripe billing portal redirect (new)
/app/(dashboard)/settings/billing/page.tsx  — Billing management page (new)
/lib/stripe.ts                              — Stripe client + plan helpers (new)
/lib/playwright/                            — Headless browser scraping (new)
/lib/playwright/fetchWithPlaywright.ts      — Playwright page fetch — used when node-fetch returns EMPTY_PAGE
```

---

## Stripe Billing (V2)

### Plans

| Plan | Price | Stripe Price ID Env Var |
|---|---|---|
| Starter | $49/month | `STRIPE_PRICE_STARTER` |
| Pro | $149/month | `STRIPE_PRICE_PRO` |

### Environment Variables (server-side only)
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_STARTER` — Stripe Price ID for Starter plan
- `STRIPE_PRICE_PRO` — Stripe Price ID for Pro plan

### profiles Table Additions (V2)

Add these columns to the existing `profiles` table:

| Column | Type | Notes |
|---|---|---|
| `stripe_customer_id` | text | Stripe Customer ID — created on first checkout |
| `stripe_subscription_id` | text | Active Stripe Subscription ID |
| `stripe_subscription_status` | text | 'active' / 'past_due' / 'canceled' / 'trialing' — synced via webhook |
| `plan_expires_at` | timestamptz | Set on cancellation — access continues until period end |

### Plan Enforcement Rules

- `profiles.plan` remains the authoritative field for feature gating — `'starter'` or `'pro'`
- Stripe webhook updates `stripe_subscription_status` and `profiles.plan` on subscription events
- On `customer.subscription.updated` or `customer.subscription.deleted` → update `profiles.plan` accordingly
- Starter plan: enforce 250 prospects/month cap via existing `usage` table check
- Pro plan: no prospect cap

### Webhook Events to Handle

| Event | Action |
|---|---|
| `checkout.session.completed` | Save `stripe_customer_id`, `stripe_subscription_id`, update `profiles.plan` |
| `customer.subscription.updated` | Sync `stripe_subscription_status`, update `profiles.plan` if plan changed |
| `customer.subscription.deleted` | Set `profiles.plan = 'starter'`, set `plan_expires_at` |
| `invoice.payment_failed` | Set `stripe_subscription_status = 'past_due'` — do not downgrade immediately |

---

## Playwright Headless Scraping (V2)

### When It Is Used

Playwright is used only when `node-fetch` returns an `EMPTY_PAGE` error — meaning the site is a client-side SPA (React, Vue, Angular) that renders no readable HTML without JavaScript execution.

Standard `node-fetch` + Cheerio scraping is always attempted first. Playwright is the fallback, not the default. This is because Playwright is significantly slower and more resource-intensive.

### Architecture

```
/lib/playwright/fetchWithPlaywright.ts
```

Accepts a URL, launches a headless Chromium browser, waits for the page to load, returns the rendered HTML. The returned HTML is then passed through the same detection modules as a standard scrape — no changes to detection logic.

### Fallback Logic in processJob.ts

```typescript
let html = await fetchWithNodeFetch(url)

if (html === null || isEmptyPage(html)) {
  // Attempt Playwright fallback
  html = await fetchWithPlaywright(url)
  
  if (html === null) {
    // Mark as EMPTY_PAGE error — Playwright also failed
    prospect.error_type = 'EMPTY_PAGE'
    prospect.scrape_status = 'error'
    continue
  }
  
  // Playwright succeeded — proceed with normal detection
  prospect.scrape_source = 'playwright'
}
```

### Important Rules
- Never use Playwright client-side — server-side API routes only, same rule as node-fetch
- Playwright adds significant latency — expect 5-15 seconds per page vs 1-3 seconds for node-fetch
- Playwright is not used for Intel Card social media fetching — only for the primary website scrape
- Log `scrape_source = 'playwright'` on the prospect record so debug panel can show which sites required headless rendering

---

## V2 Important Rules for Claude (Additions to V1 Rules)

15. **Email sequence requires Intel Card first** — never call the sequence generation route if `prospects.intel` is null. Return 400 with message: "Intel Card must be generated before Email Sequence."
16. **Sequence fields are contact-level only** — email sequence HubSpot properties are pushed to Contact records only, not Company records.
17. **Never regenerate sequence automatically** — same rule as Intel Cards. Generate once, save permanently. Only regenerate on explicit user action.
18. **max_tokens is 2000 for sequence generation** — not 1000. Three full emails require more tokens. Never reduce this.
19. **Apollo sequence status is manually set** — LeadPulse does not receive callbacks from Apollo. `apollo_sequence_status` is updated only by the user in the LeadPulse UI.
20. **Stripe plan is the billing source of truth** — `profiles.plan` is always updated by the Stripe webhook, never by user input directly. Never let a user manually set their own plan field.
21. **Playwright is fallback only** — always attempt node-fetch first. Only use Playwright when `EMPTY_PAGE` error is returned. Never default to Playwright for all scraping.
22. **pain_indicators and conversation_starters get their own HubSpot properties in V2** — extract from `prospects.intel` jsonb at sync time and push as standalone Contact properties so Apollo can map them as custom variables.
23. **Email body fields are plain text** — no HTML, no markdown. Apollo injects them into email editors. Plain text only, line breaks using `\n`.
24. **Sequence generation is Hot and Warm only** — same restriction as Intel Cards. Cold prospects get neither button.

---

## V2 Full Workflow (End to End)

```
1. Apollo — find and verify prospects, export CSV
        ↓
2. LeadPulse — upload CSV, select industry + criteria, start scrape
        ↓
3. LeadPulse — review scores, filter to Hot + Warm
        ↓
4. LeadPulse — Generate Intel Card (per prospect or bulk)
        ↓
5. LeadPulse — Generate Email Sequence (per prospect or bulk)
        ↓
6. LeadPulse — HubSpot Sync (pushes all fields including email sequences)
        ↓
7. Apollo — pulls updated contact fields from HubSpot via native sync
        ↓
8. Apollo — user selects Hot/Warm contacts → adds to sequence
           (Apollo auto-fills subject + body from HubSpot custom fields)
        ↓
9. Apollo — sends emails automatically on schedule
        ↓
10. Apollo — logs sent email activity to HubSpot contact timeline
        ↓
11. LeadPulse — user manually updates apollo_sequence_status when reply received
        ↓
12. HubSpot — complete record: enrichment + outreach copy + sent activity
```

**The only manual steps are:**
- Step 8: Selecting contacts in Apollo and adding to sequence
- Step 11: Marking a prospect as Replied/Bounced/Completed in LeadPulse after checking Apollo

Everything else is automated.
