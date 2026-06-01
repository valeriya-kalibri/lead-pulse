'use client'

import { useState } from 'react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      {children}
    </div>
  )
}

function FileTag({ path }: { path: string }) {
  return (
    <code className="font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">{path}</code>
  )
}

function Row({ label, same, lc, ba }: { label: string; same?: string; lc?: string; ba?: string }) {
  return (
    <tr>
      <td className="px-3 py-2 text-xs font-medium text-gray-700 whitespace-nowrap">{label}</td>
      {same !== undefined ? (
        <td className="px-3 py-2 text-xs text-gray-500" colSpan={2}>{same}</td>
      ) : (
        <>
          <td className="px-3 py-2 text-xs text-gray-500">{lc}</td>
          <td className="px-3 py-2 text-xs text-gray-500">{ba}</td>
        </>
      )}
    </tr>
  )
}

export default function DevNotes() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-[#2E3A59]">Dev Notes — Offer Types System</p>
          <p className="text-xs text-gray-400 mt-0.5">What changes per offer, what stays the same, and where each piece lives in code</p>
        </div>
        <span className="text-gray-400 text-xs ml-4">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {open && (
        <div className="px-5 pb-6 space-y-7 border-t border-gray-100 pt-5">

          <Section title="Overview">
            <p className="text-xs text-gray-600">
              LeadPulse supports two offer types: <strong>Lead Capture</strong> and <strong>Business Analytics</strong>. Offer type is set at the list level and never on individual prospects. Every prospect in a list inherits the list&apos;s offer type. All offer config lives in a single file — <FileTag path="lib/offers.ts" /> — nothing offer-specific is hardcoded in route files.
            </p>
            <p className="text-xs text-gray-600">
              The core insight: the same scraped website data can support two completely different pitches. Detection always runs comprehensively. Offer type only controls how that data is <em>interpreted</em> at scoring and AI generation time.
            </p>
          </Section>

          <Section title="What Is the Same for Both Offers">
            <p className="text-xs text-gray-600">These pieces of the system run identically regardless of offer type.</p>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Layer</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Behavior</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['Detection modules', 'All 7 detectors always run — chatbot, contact form, booking, services, platforms, locations, analytics. Every signal collected every time.', 'lib/scraper/'],
                    ['Data passed to Claude', 'The user message (prospect fields, website content, social content) is identical for both offers. Only the system prompt changes.', 'app/api/prospects/[id]/intel/route.ts'],
                    ['Intel card JSON structure', 'Same 6 fields returned: outreach_hook, business_summary, owner_profile, social_signals, conversation_starters, pain_indicators.', 'app/api/prospects/[id]/intel/route.ts'],
                    ['Email sequence JSON structure', 'Same 6 fields: subject + body for emails 1, 2, 3. Same 3-email timing and tone guidelines.', 'app/api/prospects/[id]/sequence/route.ts'],
                    ['HubSpot sync', 'Same property names, same field mapping, no offer-prefixed fields. Last sync wins.', 'app/api/hubspot/sync/route.ts'],
                    ['CSV export', 'Same column names regardless of offer type.', 'lib/csv.ts'],
                    ['Database schema (prospects)', 'No new columns on prospects table for Phase 1. Only prospect_lists gains offer_type.', 'docs/migrations/012_offer_types.sql'],
                  ].map(([layer, behavior, file], i) => (
                    <tr key={i} className={i % 2 === 1 ? 'bg-gray-50/30' : ''}>
                      <td className="px-3 py-2 text-xs font-medium text-gray-700 whitespace-nowrap">{layer}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{behavior}</td>
                      <td className="px-3 py-2 text-xs"><FileTag path={file} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="What Is Different Per Offer">
            <p className="text-xs text-gray-600">These pieces change based on the list&apos;s offer type. All values are defined in <FileTag path="lib/offers.ts" /> — never hardcoded in routes.</p>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">What changes</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Lead Capture</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Business Analytics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <Row
                    label="Default criteria"
                    lc="chatbot, contact_form, services, online_booking, crm_emr_platform"
                    ba="analytics, locations, employee_count, revenue_range, crm_emr_platform"
                  />
                  <Row
                    label="HOT score logic"
                    lc="No chatbot + services found + contact form only. Or: no chatbot, no form, no booking — completely uncovered."
                    ba="Multi-location + no advanced analytics. Or: single location $1M+ revenue + only basic GA."
                  />
                  <Row
                    label="WARM score logic"
                    lc="Missing one key qualifier — some coverage but gaps remain."
                    ba="Single location $500K–$1M + basic analytics. Or multi-location with some analytics but no unified layer. Or CRM/EMR with no analytics on top."
                  />
                  <Row
                    label="COLD score logic"
                    lc="Already has chatbot or full booking + follow-up solution."
                    ba="Multiple BI tools already. Or very small operation (1–5 employees, <$500K revenue)."
                  />
                  <Row
                    label="Intel system prompt"
                    lc="Focus on lead capture gaps — chatbot missing, poor contact form, no booking, high-ticket services."
                    ba="Focus on operational complexity and data visibility gaps — locations, revenue, trapped data, no reporting layer."
                  />
                  <Row
                    label="Email system prompt"
                    lc="Cold email copywriter for AI automation and chatbot services."
                    ba="Cold email copywriter for business intelligence and data analytics services."
                  />
                  <Row
                    label="Agency description in emails"
                    lc="Kalibri Studios — AI automation, chatbots, voice agents, agentic workflows."
                    ba="Kalibri Studios — BI dashboards, custom analytics, revenue by service, location performance."
                  />
                  <Row
                    label="Outreach angle"
                    lc="'You're running Morpheus8 with no chat widget — every visitor who doesn't call is walking away.'"
                    ba="'With 4 locations and no reporting layer beyond GA, you're making decisions blind.'"
                  />
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Where Each Piece Lives in Code">
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-3 text-xs text-gray-600 space-y-2">
                <p><FileTag path="lib/offers.ts" /> — <strong>Single source of truth.</strong> Defines both offer configs: defaultCriteria, intelSystemPrompt, sequenceSystemPrompt, sequenceAgencyDescription. Nothing offer-specific should be hardcoded anywhere else.</p>
                <p><FileTag path="lib/scraper/score.ts" /> — Scoring logic. Reads offerType param, applies offer-specific HOT/WARM/COLD formula. Called by processJob.</p>
                <p><FileTag path="lib/scraper/processJob.ts" /> — Shared scrape job runner. Fetches offer_type from the list, passes it through to score.ts.</p>
                <p><FileTag path="app/api/prospects/[id]/intel/route.ts" /> — Intel Card generation. Fetches list to get offer_type, uses OFFERS[offer_type].intelSystemPrompt as the Claude system prompt.</p>
                <p><FileTag path="app/api/prospects/[id]/sequence/route.ts" /> — Email sequence generation. Uses OFFERS[offer_type].sequenceSystemPrompt and OFFERS[offer_type].sequenceAgencyDescription.</p>
                <p><FileTag path="app/api/lists/[id]/clone/route.ts" /> — Clone for New Offer. Copies all scraped prospect data to a new list with a different offer type, then re-scores every prospect through the new offer lens. Never re-scrapes.</p>
                <p><FileTag path="app/(dashboard)/dashboard/new/NewListForm.tsx" /> — New list form. Shows offer type selector (two-card toggle) above the industry template step. Pre-selects defaultCriteria when offer type is chosen.</p>
                <p><FileTag path="CLAUDE_OFFER_TYPES.md" /> — Full design spec and rules for this system.</p>
                <p><FileTag path="docs/migrations/012_offer_types.sql" /> — DB migration that adds offer_type to prospect_lists.</p>
              </div>
            </div>
          </Section>

          <Section title="Key Rules">
            <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 pl-1">
              <li>Offer type lives on the <strong>list</strong>, never on a prospect row. Always look it up via <code className="font-mono bg-gray-100 px-1 rounded">prospect.list_id</code>.</li>
              <li>Always default to <code className="font-mono bg-gray-100 px-1 rounded">lead_capture</code> if offer_type is null — backward compatible with all existing lists.</li>
              <li>Score must be recalculated on clone — never carry the original list&apos;s score to a cloned list.</li>
              <li>Detection modules never change — always run the full pipeline regardless of offer type.</li>
              <li>HubSpot sync is unchanged — no offer-prefixed properties. Last sync wins by design.</li>
              <li>Phase 2 (prospect_offers table) is not built yet — only build when both offers need to run simultaneously on the same contact.</li>
            </ul>
          </Section>

        </div>
      )}
    </div>
  )
}
