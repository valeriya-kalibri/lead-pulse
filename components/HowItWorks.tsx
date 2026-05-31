'use client'

import { useState } from 'react'

const STEPS = [
  {
    n: '01',
    title: 'Add your prospects — two ways',
    body: 'Upload a CSV exported from Apollo or HubSpot, or import a list directly from HubSpot (Pro plan). Both paths end up in the same place: a LeadPulse list ready to qualify.',
    sub: [
      {
        label: 'CSV upload',
        desc: 'Export your prospects from Apollo or HubSpot as a CSV. LeadPulse auto-reads standard Apollo and HubSpot export columns — company name, website, contact name, email, phone, city, state, employee count, and revenue. No column renaming needed. If multiple contacts share the same website, LeadPulse scrapes it once and applies the results to all of them.',
      },
      {
        label: 'Import New from HubSpot (Pro)',
        desc: 'Click "Import New from HubSpot" on this page. Select any contact or company list from your HubSpot account, give it a name in LeadPulse, and pick an industry. LeadPulse pulls the companies and their associated contacts directly — no CSV export required. A new LeadPulse list is created and linked to that HubSpot segment so future updates stay in sync.',
      },
    ],
    note: 'Exporting from HubSpot as CSV? Use Export View → CSV. Under Properties, select "Properties and associations in your view." Include: Company Name, Website Domain, Associated Contact name, email, phone, City, State, Number of Employees, Annual Revenue. Check "Include associated record name" and "Include up to 1,000 associated records per column." Do not select All Properties.',
  },
  {
    n: '02',
    title: 'Configure keywords and qualification criteria',
    body: 'Tell LeadPulse what to look for on each website. This step works slightly differently depending on how you added your prospects:',
    sub: [
      {
        label: 'CSV upload',
        desc: 'Criteria and keywords are set when you create the list — pick your industry to pre-load keywords, add or remove your own, then choose which of the 10 qualification criteria to run. Only selected criteria are analyzed, scored, and shown in results.',
      },
      {
        label: 'HubSpot import',
        desc: 'After import, open the list and click "Start Scraping." A configuration panel opens pre-filled with the keywords and criteria from the industry you selected at import. Review and adjust before confirming — this is your chance to narrow down what LeadPulse checks before it runs.',
      },
    ],
  },
  {
    n: '03',
    title: 'LeadPulse qualifies every prospect automatically',
    body: 'Once started, LeadPulse visits every website on your list and checks it against your selected criteria — chatbot presence, contact forms, online booking, CRM/EMR platform, high-ticket service keywords, number of locations, analytics tools, employee count, and revenue range. 10 prospects or 500 — it runs the same way, automatically, in the background. Results populate in real time as each site completes.',
  },
  {
    n: '04',
    title: 'Review your scored results',
    body: 'Every prospect receives a score based on what was found on their site.',
    sub: [
      { label: '🔥 Hot', desc: 'High priority. Clear gap. Worth calling today.' },
      { label: '⚡ Warm', desc: 'Missing one key qualifier. Still worth outreach.' },
      { label: '❄️ Cold', desc: 'Already covered. Deprioritize.' },
    ],
    footer: 'Use the filter bar to narrow by score, service detected, platform, city, state, employee count, revenue, or any combination.',
  },
  {
    n: '05',
    title: 'Generate Intel (optional)',
    body: 'For your best prospects, click Generate Intel to produce a full AI briefing — business summary, owner profile, recent social signals, conversation starters, pain indicators, and a personalized outreach hook written specifically for that business. Generated once, saved permanently. This is what you read before you pick up the phone.',
  },
  {
    n: '06',
    title: 'Export, push to HubSpot, or update from HubSpot',
    body: 'Three options for what to do with your qualified list:',
    sub: [
      { label: 'Export CSV', desc: 'Download your full qualified list — scores, detected signals, Intel Card fields — for any outreach tool or CRM.' },
      { label: 'Sync to HubSpot (Pro)', desc: 'Push your qualified prospects into HubSpot CRM. For each prospect, LeadPulse upserts the company record (matched by domain), upserts the contact (matched by email then phone), associates them, and writes the LeadPulse score, signals, and Intel Card to dedicated custom properties. No duplicates are created. LeadPulse is always the source of truth on a push — scores and intel overwrite whatever was there.' },
      { label: 'Update from HubSpot (Pro)', desc: 'Pull fresh data from HubSpot back into an existing LeadPulse list. Two ways to trigger it: on the My Lists page, check the list you want to update and click "Update from HubSpot"; or open a list and click "Refresh from HubSpot" in the list toolbar. Both do the same thing — they refresh contact info (names, emails, phone numbers, company details) and, if the list was originally imported from a HubSpot segment, also pull in any new companies added to that segment since the original import. Scores, intel cards, and detected signals are never touched. HubSpot owns contact info; LeadPulse owns qualification data.' },
    ],
  },
]

export default function HowItWorks() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#2E3A59]">How LeadPulse Works</span>
          <span className="rounded-full bg-[#AABFFF]/20 px-2 py-0.5 text-xs text-[#2E3A59]">
            6 steps
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pt-4 pb-5 space-y-5">

          <p className="text-xs text-gray-500 leading-relaxed">
            LeadPulse visits every website on your list and automatically researches each one — so you know exactly who to call, what to say, and who to skip before you make a single outreach attempt.
          </p>

          <ol className="space-y-5">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="mt-0.5 flex-shrink-0 text-xs font-semibold tabular-nums text-[#AABFFF]">
                  {s.n}
                </span>
                <div className="space-y-1.5 min-w-0">
                  <p className="text-xs font-medium text-[#2E3A59]">{s.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
                  {s.sub && (
                    <ul className="space-y-1.5 pt-0.5">
                      {s.sub.map((item) => (
                        <li key={item.label} className="flex gap-2 text-xs text-gray-500 leading-relaxed">
                          <span className="font-medium text-[#2E3A59] flex-shrink-0 whitespace-nowrap">{item.label} —</span>
                          <span>{item.desc}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {'footer' in s && s.footer && (
                    <p className="text-xs text-gray-500 leading-relaxed pt-0.5">{s.footer}</p>
                  )}
                  {s.note && (
                    <p className="text-xs text-gray-400 leading-relaxed italic pt-0.5">{s.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-[#2E3A59]">How lists work</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Every list in LeadPulse is completely isolated. A run of 30 prospects and a run of 5 prospects are two separate lists — they don&rsquo;t know about each other. Your results, CSV export, and HubSpot sync all operate only on the list you&rsquo;re currently viewing. If you export the 5-company list, you get 5 rows. The 30 from the other run are never included.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              This means you can run multiple campaigns simultaneously — different industries, different regions, different criteria — and each one stays clean and separate.
            </p>
          </div>

          <p className="text-xs text-gray-400 border-t border-gray-100 pt-3 leading-relaxed">
            LeadPulse does not replace Apollo or HubSpot — it works alongside them. Apollo finds your prospects. HubSpot stores them. LeadPulse tells you which ones are worth calling and exactly what to say.
          </p>

        </div>
      )}
    </div>
  )
}
