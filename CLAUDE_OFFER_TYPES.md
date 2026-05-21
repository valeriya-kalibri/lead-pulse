# LeadPulse — Offer Types System
> Appends to CLAUDE.md and CLAUDE_V2_APPENDIX.md. Read both files first before reading this one.
> All V1 and V2 rules still apply. This file defines the Offer Types feature only.
> Version 3.0 | Kalibri Studios | 2026

---

## What Is the Offer Types System?

LeadPulse is used by Kalibri Studios to prospect service businesses. Kalibri sells more than one service. Previously, every list was implicitly built around a single offer: **lead capture** (chatbot, AI voice agents, lead automation). This system adds a second offer type — **business analytics** — and a framework to add more in the future.

**The core insight:** The same prospect database can be pitched different services. The scraped website data is the same. What changes is how that data is *interpreted* — which signals indicate a good fit, what the intel card focuses on, what angle the email sequence takes.

**Offer type is selected at the list level.** It cascades through scoring, intel generation, and email sequence generation for every prospect in that list.

---

## The Two Offer Types

### 1. `lead_capture` — Default

**What Kalibri sells:** Chatbots, AI voice agents, lead capture automation, agentic workflows.

**Who is a good prospect:** Service businesses with no chatbot, high-ticket services, and a lead capture gap — they're doing the hard work of running a quality business but losing leads because no one answers after hours or follows up fast enough.

**What we're hunting for:** *Gaps.* No chatbot. Contact form only (no live chat, no booking widget). High-ticket services that justify the investment. No CRM capturing and nurturing leads automatically.

**Outreach angle:** "You're running Morpheus8 and RF Microneedling with no chat widget — every visitor who doesn't call is walking away."

---

### 2. `business_analytics`

**What Kalibri sells:** Business intelligence dashboards, custom analytics, data reporting — helping service businesses understand their own numbers (revenue by service, patient retention, location performance, operator productivity).

**Who is a good prospect:** Service businesses that are complex enough to have data worth analyzing but lack the visibility to act on it. Multi-location operators, high-revenue single locations, businesses with practice management software trapping their data.

**What we're hunting for:** *Complexity without visibility.* Multiple locations. High revenue. CRM/EMR platform storing data they can't query. No analytics platform beyond basic GA. Growing fast with no reporting layer.

**Outreach angle:** "With 4 locations and no reporting layer beyond Google Analytics, you're making staffing and service mix decisions blind."

---

## How Offer Type Cascades Through the System

| System Layer | How Offer Type Affects It |
|---|---|
| **Default criteria** | Different criteria pre-selected when creating a new list |
| **Scoring logic** | HOT/WARM/COLD defined differently per offer |
| **Intel card** | Same JSON structure, AI interprets signals through the offer lens |
| **Email sequence** | Different system prompt, different agency description, different angle |
| **HubSpot sync** | **No change** — same field names, same properties, last sync wins |
| **CSV export** | **No change** — same column names |
| **Detection modules** | **No change** — always run everything regardless of offer type |

Detection modules (`detectChatbot`, `detectAnalytics`, `detectLocations`, etc.) always run comprehensively. Every signal is always collected. The offer type only controls how those signals are *interpreted* at scoring and AI generation time.

---

## Data Model Change

### `prospect_lists` table — one new column

```sql
ALTER TABLE prospect_lists
ADD COLUMN offer_type text NOT NULL DEFAULT 'lead_capture';
-- Allowed values: 'lead_capture' | 'business_analytics'
```

No other table changes for Phase 1. The `prospects` table, intel jsonb structure, email sequence columns, and HubSpot properties are unchanged.

---

## `lib/offers.ts` — Offer Config File

This is the single source of truth for all offer-specific configuration. The intel route, sequence route, and new list form all read from this file. **Never hardcode offer-specific logic anywhere else.**

```typescript
export type OfferType = 'lead_capture' | 'business_analytics'

export interface OfferConfig {
  id: OfferType
  label: string                    // Display name in UI
  description: string              // One-line description shown in list creation form
  defaultCriteria: string[]        // Criteria pre-selected when this offer is chosen
  intelSystemPrompt: string        // System prompt passed to Claude for Intel Card generation
  sequenceSystemPrompt: string     // System prompt passed to Claude for email sequence generation
  sequenceAgencyDescription: string // One paragraph describing Kalibri's offer — injected into sequence user message
}

export const OFFERS: Record<OfferType, OfferConfig> = {
  lead_capture: {
    id: 'lead_capture',
    label: 'Lead Capture',
    description: 'Pitch chatbots, AI voice agents, and lead automation to businesses missing lead capture coverage.',
    defaultCriteria: ['chatbot', 'contact_form', 'services', 'online_booking', 'crm_emr_platform'],
    intelSystemPrompt: `You are a sales intelligence analyst specializing in AI automation and lead capture for service businesses. Based on the business data provided, generate a concise prospect intelligence briefing for a sales rep who is about to make first contact. Focus on lead capture gaps — missing chatbot, poor contact form coverage, no booking integration, high-ticket services that justify automation. The outreach hook must be specific to this exact prospect — never generic. Be actionable and grounded only in what the data shows. Return only valid JSON, no preamble, no markdown.`,
    sequenceSystemPrompt: `You are an expert cold email copywriter specializing in outbound sales for AI automation and chatbot services sold to small and mid-sized service businesses. Write personalized, conversational cold emails that do not sound like templates. Each email must reference specific details about this exact business. Never use generic phrases like "I came across your website" or "I hope this finds you well." Return only valid JSON — no preamble, no markdown.`,
    sequenceAgencyDescription: `The sender is Valeriya Paine from Kalibri Studios — an AI automation agency that builds chatbots, AI voice agents, and agentic workflows for service businesses. Kalibri helps businesses capture and convert more leads automatically — after hours, on weekends, and during busy periods when staff can't respond.`
  },

  business_analytics: {
    id: 'business_analytics',
    label: 'Business Analytics',
    description: 'Pitch BI dashboards and data analytics to multi-location or high-revenue businesses flying blind on their numbers.',
    defaultCriteria: ['analytics', 'locations', 'employee_count', 'revenue_range', 'crm_emr_platform'],
    intelSystemPrompt: `You are a business intelligence consultant. Based on the business data provided, generate a concise prospect intelligence briefing for a data analytics consultant who is about to make first contact. Focus on operational complexity and data visibility gaps — multiple locations with no unified reporting, high revenue with only basic analytics, practice management software trapping data the owner can't query, fast growth with no dashboard to track it. The outreach hook must be specific to this exact prospect's data situation — never generic. Be actionable and grounded only in what the data shows. Return only valid JSON, no preamble, no markdown.`,
    sequenceSystemPrompt: `You are an expert cold email copywriter specializing in outbound sales for business intelligence and data analytics services sold to small and mid-sized service businesses. Write personalized, conversational cold emails that do not sound like templates. Each email must reference specific details about this exact business's operational complexity and data situation. Never use generic phrases. Return only valid JSON — no preamble, no markdown.`,
    sequenceAgencyDescription: `The sender is Valeriya Paine from Kalibri Studios — a data analytics and business intelligence agency that helps service businesses understand their numbers, build custom dashboards, and make better decisions from the data they already have. Kalibri connects to existing practice management software, booking systems, and POS data to surface revenue by service, patient retention, location performance, and operator productivity.`
  }
}
```

---

## Scoring Logic Per Offer Type

Scoring is already dynamic — only selected criteria are used. Offer type adds a second layer: the *interpretation* of those signals changes based on what you're selling.

### Lead Capture Scoring (unchanged from V1/V2)

| Score | Logic |
|---|---|
| 🔥 **HOT** | No chatbot AND services found AND contact form only (no booking widget). Also HOT: no chatbot AND no contact form AND no booking — completely uncovered. |
| ⚡ **WARM** | Missing one key qualifier. Has some lead capture but gaps remain. |
| ❄️ **COLD** | Already has a chatbot or full booking + follow-up solution. |

### Business Analytics Scoring (new)

| Score | Logic |
|---|---|
| 🔥 **HOT** | Multi-location (`is_multi_location = true`) AND no advanced analytics (null or GA only). OR: Single location with revenue $1M+ AND no analytics platform beyond basic GA. |
| ⚡ **WARM** | Single location with revenue $500K–$1M and basic analytics. OR multi-location with some analytics but no unified reporting layer. OR has CRM/EMR platform with no analytics layer on top of it. |
| ❄️ **COLD** | Already has multiple BI tools (Mixpanel, Hotjar, plus GA = data-forward, hard sell). OR very small operation (1–5 employees, revenue <$500K) — not enough data complexity to warrant a dashboard build. |

**Analytics platform scoring interpretation:**
- `analytics_platform = null` → No tracking at all. Could indicate not tech-forward (harder sell) OR just hasn't gotten there yet (opportunity). Weigh with revenue and location count.
- `analytics_platform = 'Google Analytics'` → Basic. Flying blind on the metrics that matter. Strong opportunity for analytics offer.
- `analytics_platform = 'Google Analytics + Google Tag Manager'` → Slightly more intentional. Still basic. Warm signal.
- `analytics_platform = 'Hotjar'` or `'Mixpanel'` → Data-forward. They care about data. Could be receptive but harder sell — they're already trying.
- Multiple BI tools detected → Likely has internal analytics capability. Cold for this offer.

---

## Intel Card Per Offer Type

The Intel Card JSON structure is **identical** for both offer types. The same six fields are always returned. Only the content changes based on what the AI was asked to focus on.

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

### What Each Field Focuses On Per Offer

| Field | Lead Capture | Business Analytics |
|---|---|---|
| `outreach_hook` | Opens with chatbot gap, missed lead volume, high-ticket services | Opens with data blindspot, location complexity, reporting gap |
| `business_summary` | What they do, who they serve, positioning | Same — what they do, scale, locations, operational complexity |
| `owner_profile` | How to show up — clinical vs personality-driven, tech-savvy or not | Same lens — are they data-curious or gut-feel operators? |
| `social_signals` | New equipment, promotions, hiring, slow season signals | New location announcements, growth signals, capacity signals |
| `conversation_starters` | Chatbot gap, missed calls, peak hour coverage | Revenue by service visibility, location performance comparison, retention tracking |
| `pain_indicators` | Where leads are being lost — no chatbot, contact form gaps, after-hours | Where data is dark — no unified view, decisions made from booking reports only |

### Intel API Call — Route Change

The intel route (`/app/api/prospects/[id]/intel/route.ts`) must:

1. Fetch the prospect's list to get `offer_type`
2. Import `OFFERS` from `lib/offers.ts`
3. Use `OFFERS[list.offer_type].intelSystemPrompt` as the `system` field in the Claude API call

```typescript
import { OFFERS } from '@/lib/offers'

// After fetching prospect, fetch its list:
const { data: list } = await supabase
  .from('prospect_lists')
  .select('offer_type, industry_name')
  .eq('id', prospect.list_id)
  .single()

const offerConfig = OFFERS[list.offer_type ?? 'lead_capture']

// Use offerConfig.intelSystemPrompt as the system prompt
```

The user message (the full data block passed to Claude) is **identical** for both offer types — all the same prospect fields, website content, and social content. The system prompt change is all that's needed. The AI reframes its analysis based on what it was asked to focus on.

---

## Email Sequence Per Offer Type

The sequence route (`/app/api/prospects/[id]/sequence/route.ts`) must:

1. Fetch the prospect's list to get `offer_type`
2. Import `OFFERS` from `lib/offers.ts`
3. Use `OFFERS[list.offer_type].sequenceSystemPrompt` as the `system` field
4. Inject `OFFERS[list.offer_type].sequenceAgencyDescription` into the user message in place of the hardcoded agency description

```typescript
const offerConfig = OFFERS[list.offer_type ?? 'lead_capture']

// system: offerConfig.sequenceSystemPrompt
// In user message, replace hardcoded agency description with:
// offerConfig.sequenceAgencyDescription
```

### Email Guidelines Block (same for both offers)

The EMAIL GUIDELINES section of the sequence user message does not change between offer types. Same 3-email structure, same timing, same tone rules, same length guidelines:

```
- Email 1: Cold opener. Lead with the outreach hook. 3-4 short paragraphs. End with a soft CTA — ask one question or suggest a quick call.
- Email 2: Follow-up 3-4 days later. Reference that you reached out before. Take a different angle — lead with a value point or specific insight from the pain indicators. Short — 2-3 paragraphs.
- Email 3: Breakup email 7-8 days after Email 1. Very short — 2-3 sentences max. Low pressure. Leave the door open.
- All emails: Use first name only in greeting. Conversational tone. No buzzwords. Short sentences. Short paragraphs. Mobile-friendly length.
- Subject lines: Specific, curiosity-driven, not salesy. No exclamation marks. Under 50 characters preferred.
```

### Output JSON Structure (same for both offers)

```json
{
  "outreach_email_subject_1": "...",
  "outreach_email_body_1": "...",
  "outreach_email_subject_2": "...",
  "outreach_email_body_2": "...",
  "outreach_email_subject_3": "...",
  "outreach_email_body_3": "..."
}
```

---

## New List Form — Offer Type Selector

When creating a new list, the user selects an offer type before selecting an industry template. Offer type appears as a two-card toggle above the industry template selector.

**UI placement:** Between the list name field and the industry template selector.

**Display:**

| Card | Label | Description |
|---|---|---|
| Left (default) | Lead Capture | Pitch chatbots and AI automation to businesses missing lead capture coverage |
| Right | Business Analytics | Pitch BI dashboards to multi-location or high-revenue businesses flying blind on their numbers |

**Behavior on selection:**
- Selecting an offer type pre-selects the corresponding default criteria (from `OFFERS[offerType].defaultCriteria`) in the criteria step
- The user can still edit criteria freely — the offer type only sets the defaults
- `offer_type` is stored on the `prospect_list` record at creation time and never changed

---

## Clone List for New Offer (Phase 1 — Reusing Prospects)

When a user wants to run a second offer pitch on the same contacts from an existing list, they use **Clone for New Offer**.

### UI

A **"Clone for New Offer"** button on the list detail page. Only shown if there are scraped (`scrape_status = 'complete'`) prospects in the list.

### What It Does

1. Creates a new `prospect_lists` record — same `industry_name`, `service_keywords`, `selected_criteria`, `user_id`. New `offer_type` (the user picks the new offer type in a modal). New `name` (pre-filled as `"[Original Name] — Business Analytics"` or similar, editable).
2. Copies all `prospects` rows from the original list into the new list — **including all scraped data** (score signals, services, chatbot, analytics, locations, etc.). Sets `scrape_status = 'complete'` and `scraped_at` carried over.
3. Clears AI-generated fields on copied rows: `intel = null`, `outreach_hook = null`, `sequence_generated_at = null`, all 6 email fields = null, `intel_generated_at = null`.
4. Recalculates `score` and `score_reason` for every prospect using the new offer's scoring logic.
5. Sets the new list's `status = 'complete'`, updates `hot_count`, `warm_count`, `cold_count`.
6. Returns the new list ID — UI navigates to the new list detail page.

**No re-scraping.** The website data is already collected. Only scoring and AI generation run fresh.

### Score Recalculation on Clone

When cloning, the existing scrape data is re-scored through the new offer's lens. A prospect that was HOT for lead capture (no chatbot, services found) may become WARM or COLD for business analytics (single location, basic GA, low revenue). The score must be recalculated — never carry over the score from the original list.

---

## HubSpot Sync Behavior (Phase 1)

**No changes to HubSpot sync.** Same properties, same field names, same logic.

When a cloned list syncs to HubSpot, the same contact/company record is updated with the new offer's data. `outreach_hook`, `leadpulse_intel`, and email sequence fields are overwritten with the analytics-framed content.

**This is intentional and expected.** The user decides when to run each offer and syncs only when they are actively running that pitch. The two offers do not run simultaneously. Last sync wins — whichever offer was synced most recently is what HubSpot reflects.

**`leadpulse_list_name` and `leadpulse_filter_summary`** will reflect the cloned list name and the new offer's filter summary after sync. This is correct — it shows which offer is currently active for that contact in HubSpot.

---

## Phase 2 — Future: `prospect_offers` Table

Phase 1 uses a "clone list" approach — the same contact appears as two separate prospect rows in two separate lists. This works cleanly as long as both offers are never run simultaneously on the same contact.

Phase 2 introduces a `prospect_offers` table to decouple AI-generated content from the prospect record. This allows one prospect row to carry intel and sequences for multiple offer types simultaneously, and enables HubSpot sync to write to offer-prefixed properties without collision.

**Trigger for building Phase 2:** When both offers are actively being pitched to the same contacts at the same time and HubSpot needs to reflect both simultaneously.

**Do not build Phase 2 prematurely.** Phase 1 covers all current use cases.

---

## Criteria Default Mapping Per Offer

| Criteria Key | Lead Capture Default | Business Analytics Default |
|---|---|---|
| `chatbot` | ✅ | — |
| `contact_form` | ✅ | — |
| `services` | ✅ | — |
| `online_booking` | ✅ | — |
| `crm_emr_platform` | ✅ | ✅ |
| `crm_platform` | — | — |
| `locations` | — | ✅ |
| `analytics` | — | ✅ |
| `employee_count` | — | ✅ |
| `revenue_range` | — | ✅ |

The user can change any criteria freely after the defaults are applied. Defaults are just a starting point.

---

## Implementation Checklist

### Database
- [ ] Add `offer_type text NOT NULL DEFAULT 'lead_capture'` to `prospect_lists`
- [ ] Migration file: `docs/migrations/012_offer_types.sql`

### New Files
- [ ] `lib/offers.ts` — offer config with both offer definitions

### Modified Files
- [ ] `app/api/prospects/[id]/intel/route.ts` — fetch list `offer_type`, use `offerConfig.intelSystemPrompt`
- [ ] `app/api/prospects/[id]/sequence/route.ts` — fetch list `offer_type`, use `offerConfig.sequenceSystemPrompt` and `offerConfig.sequenceAgencyDescription`
- [ ] `app/(dashboard)/dashboard/new/NewListForm.tsx` — add offer type selector step
- [ ] `lib/scraper/score.ts` — accept `offerType` param, apply offer-specific scoring logic
- [ ] `lib/scraper/processJob.ts` — pass `offer_type` through to score function
- [ ] `app/(dashboard)/lists/[id]/page.tsx` — show Clone for New Offer button
- [ ] `app/(dashboard)/lists/[id]/ListActions.tsx` — Clone for New Offer button + modal
- [ ] New API route: `app/api/lists/[id]/clone/route.ts` — handles clone + re-score logic

### No Changes Needed
- [ ] ~~`app/api/hubspot/sync/route.ts`~~ — HubSpot sync unchanged
- [ ] ~~`lib/csv.ts`~~ — CSV export unchanged
- [ ] ~~`types/index.ts`~~ — `ProspectList` type needs `offer_type` field added
- [ ] ~~Detection modules~~ — always run everything

> **Note on types:** Add `offer_type: 'lead_capture' | 'business_analytics'` to the `ProspectList` type in `types/index.ts` and import `OfferType` from `lib/offers.ts` where needed.

---

## Rules for Claude — Offer Types

1. **Offer type lives on the list, not the prospect.** Never store offer type on a prospect row. Always look it up via the prospect's `list_id`.
2. **Always default to `lead_capture`** if `offer_type` is null or missing. This ensures backward compatibility with all existing lists.
3. **All offer config lives in `lib/offers.ts`.** Never hardcode system prompts, criteria defaults, or agency descriptions in route files.
4. **Detection modules never change.** Always run the full detection pipeline regardless of offer type. Offer type only affects scoring and AI generation.
5. **Score must be recalculated on clone.** Never carry the original list's score to a cloned list. Re-score every prospect through the new offer's lens using the existing scrape data.
6. **Phase 1 clone = new list + new prospect rows.** The original list and its prospects are never modified by a clone operation.
7. **HubSpot sync is unchanged.** Do not add offer-type-prefixed properties or conditional sync logic. Same fields, same names. Last sync wins by design.
8. **Intel and sequence prompts are the only AI change.** The data passed to Claude (prospect fields, website content, social content) is identical for both offers. Only the system prompt and agency description differ.
