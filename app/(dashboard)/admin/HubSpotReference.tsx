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

function PropTable({
  rows,
  cols,
}: {
  rows: string[][]
  cols: string[]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-medium text-gray-500">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-gray-50/30' : ''}>
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                  {j === 1 || j === 2 ? <code className="font-mono">{cell}</code> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function HubSpotReference() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-[#2E3A59]">HubSpot Integration Reference</p>
          <p className="text-xs text-gray-400 mt-0.5">OAuth setup, property map, sync flow, rate limits</p>
        </div>
        <span className="text-gray-400 text-xs ml-4">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {open && (
        <div className="px-5 pb-6 space-y-7 border-t border-gray-100 pt-5">

          {/* OAuth */}
          <Section title="OAuth Flow — How it works">
            <p className="text-xs text-gray-600">LeadPulse uses a HubSpot <strong>Public App</strong> with OAuth. Kalibri Studios owns the app — clients never touch it. Each Pro client connects their own HubSpot portal via the Connect button in Settings.</p>
            <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1 pl-1">
              <li>Client clicks <strong>Connect HubSpot</strong> → hits <code className="font-mono bg-gray-100 px-1 rounded">/api/hubspot/auth</code></li>
              <li>Auth route generates a CSRF state token, sets it as an httpOnly cookie, redirects to HubSpot OAuth consent screen</li>
              <li>Client authorizes → HubSpot redirects to <code className="font-mono bg-gray-100 px-1 rounded">/api/auth/hubspot/callback</code> with a one-time code</li>
              <li>Callback verifies the state cookie, exchanges the code for <code className="font-mono bg-gray-100 px-1 rounded">access_token</code> + <code className="font-mono bg-gray-100 px-1 rounded">refresh_token</code></li>
              <li>Callback fetches portal ID from HubSpot account-info API, saves all tokens to <code className="font-mono bg-gray-100 px-1 rounded">profiles</code> table</li>
              <li>Client redirected back to Settings with <code className="font-mono bg-gray-100 px-1 rounded">?hs_connected=1</code></li>
            </ol>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-500 space-y-1">
              <p><span className="font-medium text-gray-700">Env vars (server only):</span></p>
              <p><code className="font-mono">HUBSPOT_CLIENT_ID</code> — from HubSpot Public App settings</p>
              <p><code className="font-mono">HUBSPOT_CLIENT_SECRET</code> — from HubSpot Public App settings</p>
              <p><code className="font-mono">NEXT_PUBLIC_APP_URL</code> — base URL used to build the callback redirect URI</p>
            </div>
          </Section>

          {/* Scopes */}
          <Section title="OAuth Scopes">
            <p className="text-xs text-gray-600">Configured on the HubSpot Public App. Clients see and approve these on the consent screen.</p>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 font-mono text-xs text-gray-500 space-y-0.5">
              <p>crm.objects.contacts.read</p>
              <p>crm.objects.contacts.write</p>
              <p>crm.objects.companies.read</p>
              <p>crm.objects.companies.write</p>
              <p>crm.schemas.contacts.read</p>
              <p>crm.schemas.contacts.write</p>
              <p>crm.schemas.companies.read</p>
              <p>crm.schemas.companies.write</p>
            </div>
            <p className="text-xs text-gray-400 italic">Intel is delivered via a custom <code className="font-mono bg-gray-100 px-1 rounded">leadpulse_intel</code> property on Contact and Company — no Notes/Engagements scope is needed.</p>
          </Section>

          {/* Token management */}
          <Section title="Token Management">
            <p className="text-xs text-gray-600">HubSpot access tokens expire every 30 minutes. The <code className="font-mono bg-gray-100 px-1 rounded">getValidToken()</code> helper in <code className="font-mono bg-gray-100 px-1 rounded">lib/hubspot.ts</code> is called at the start of every sync.</p>
            <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 pl-1">
              <li>If <code className="font-mono bg-gray-100 px-1 rounded">hubspot_token_expires_at</code> is more than 5 minutes away — use current token</li>
              <li>If within 5 minutes or past — refresh via <code className="font-mono bg-gray-100 px-1 rounded">POST /oauth/v1/token</code> with the refresh token</li>
              <li>New tokens saved back to <code className="font-mono bg-gray-100 px-1 rounded">profiles</code> automatically</li>
              <li>If refresh fails (revoked, expired) — sync returns an error telling the client to reconnect</li>
            </ul>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs font-mono text-gray-500 space-y-0.5">
              <p>profiles.hubspot_access_token</p>
              <p>profiles.hubspot_refresh_token</p>
              <p>profiles.hubspot_token_expires_at</p>
              <p>profiles.hubspot_portal_id</p>
            </div>
          </Section>

          {/* Sync flow */}
          <Section title="Sync Flow — Per Prospect">
            <p className="text-xs text-gray-600">Route: <code className="font-mono bg-gray-100 px-1 rounded">/api/hubspot/sync</code>. Accepts an array of prospect IDs. Processes sequentially with 200ms delay between each.</p>
            <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1 pl-1">
              <li><strong>Step A — Upsert Company</strong>: search by website domain (<code className="font-mono bg-gray-100 px-1 rounded">POST /crm/v3/objects/companies/search</code>). Update if found, create if not. Save <code className="font-mono bg-gray-100 px-1 rounded">hubspot_company_id</code>.</li>
              <li><strong>Step B — Upsert Contact</strong>: search by email, then phone if no email. Update if found, create if not. Save <code className="font-mono bg-gray-100 px-1 rounded">hubspot_contact_id</code>.</li>
              <li><strong>Step C — Associate</strong>: link Contact to Company via Associations API v4.</li>
              <li><strong>Step D — LeadPulse Intel property</strong>: if <code className="font-mono bg-gray-100 px-1 rounded">prospects.intel</code> is not null, format it as structured text and write it to the <code className="font-mono bg-gray-100 px-1 rounded">leadpulse_intel</code> property on <em>both</em> the Contact and Company records.</li>
              <li><strong>Step E — Update Supabase</strong>: write <code className="font-mono bg-gray-100 px-1 rounded">hubspot_contact_id</code>, <code className="font-mono bg-gray-100 px-1 rounded">hubspot_company_id</code>, and <code className="font-mono bg-gray-100 px-1 rounded">hubspot_synced_at</code> back to the prospect row.</li>
            </ol>
          </Section>

          {/* Custom properties */}
          <Section title="Custom Properties — Identical on Contact &amp; Company">
            <p className="text-xs text-gray-600">Created via <code className="font-mono bg-gray-100 px-1 rounded">ensureCustomProperties()</code> in <code className="font-mono bg-gray-100 px-1 rounded">lib/hubspot.ts</code>. Idempotent — checks existence before creating. Contact and Company receive the exact same 12 custom fields.</p>
            <PropTable
              cols={['Label', 'Internal Name', 'Type']}
              rows={[
                ['Outreach Hook', 'outreach_hook', 'Single-line text'],
                ['LeadPulse Score', 'leadpulse_score', 'Single-line text'],
                ['LeadPulse List Name', 'leadpulse_list_name', 'Single-line text'],
                ['LeadPulse Filter Summary', 'leadpulse_filter_summary', 'Multi-line text'],
                ['Practice Platform', 'practice_platform', 'Single-line text'],
                ['CRM Platform', 'crm_platform', 'Single-line text'],
                ['Has Chatbot', 'has_chatbot', 'Dropdown: Unknown / Yes / No'],
                ['Has Contact Form', 'has_contact_form', 'Dropdown: Unknown / Yes / No'],
                ['Has Online Booking', 'has_online_booking', 'Dropdown: Unknown / Yes / No'],
                ['Services Detected', 'services_detected', 'Single-line text'],
                ['Location Count', 'location_count', 'Number'],
                ['LeadPulse Intel', 'leadpulse_intel', 'Multi-line text'],
              ]}
            />
            <p className="text-xs text-gray-400 italic">Contact standard fields: firstname, lastname, email, phone, numemployees, annualrevenue. Company standard fields: name, website, city, state, numberofemployees, annualrevenue. Values pushed capitalized: Yes/No/Unknown, Hot/Warm/Cold.</p>
          </Section>

          {/* Intel property format */}
          <Section title="LeadPulse Intel Property Format">
            <p className="text-xs text-gray-600">When a prospect has an Intel Card, it is formatted as structured text and written to the <code className="font-mono bg-gray-100 px-1 rounded">leadpulse_intel</code> property on both Contact and Company. No HubSpot Note/Engagement is created.</p>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 font-mono text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">
{`LeadPulse Intel — Generated [date]

OUTREACH HOOK: [outreach_hook]

BUSINESS SUMMARY: [business_summary]

OWNER PROFILE: [owner_profile]

SOCIAL SIGNALS: [social_signals]

CONVERSATION STARTERS:
- [starter 1]
- [starter 2]
- [starter 3]

PAIN INDICATORS: [pain_indicators]`}
            </div>
          </Section>

          {/* Rate limits */}
          <Section title="Rate Limits">
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600 space-y-1">
              <p><span className="font-medium text-gray-700">Between sync requests:</span> 200ms delay per prospect</p>
              <p><span className="font-medium text-gray-700">HubSpot free plan limit:</span> 100 requests per 10 seconds</p>
              <p><span className="font-medium text-gray-700">Access token lifetime:</span> 30 minutes — auto-refreshed</p>
              <p><span className="font-medium text-gray-700">Callback URL (local):</span> <code className="font-mono bg-gray-100 px-1 rounded">http://localhost:3000/api/auth/hubspot/callback</code></p>
            </div>
          </Section>

        </div>
      )}
    </div>
  )
}
