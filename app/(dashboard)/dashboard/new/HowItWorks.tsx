'use client'

import { useState } from 'react'

const STEPS = [
  {
    n: '01',
    title: 'Export your list from Apollo or HubSpot',
    body: 'Export your prospects as a CSV file. LeadPulse auto-reads standard Apollo and HubSpot export columns — company name, website, contact name, email, phone, city, state, employee count, and revenue. No column renaming or cleanup needed. If multiple contacts share the same website, LeadPulse scrapes it once and applies the results to all of them automatically.',
    note: 'Exporting from HubSpot? Use Export View → CSV. Under Properties, select "Properties and associations in your view." Make sure your view includes: Company Name, Website Domain, Associated Contact name, email, phone, City, State, Number of Employees, and Annual Revenue. Check "Include associated record name" and "Include up to 1,000 associated records per column." Do not select All Properties — it adds unnecessary columns. Your file is ready to upload as-is.',
  },
  {
    n: '02',
    title: 'Create a new prospect list',
    body: 'Give your list a name and select your industry. LeadPulse pre-loads the most common high-ticket service keywords for that vertical — you can edit, remove, or add your own.',
  },
  {
    n: '03',
    title: 'Choose your qualification criteria',
    body: 'Select which data points you want LeadPulse to check on each website — chatbot detection, contact form, online booking, CRM/EMR platform, high-ticket services, number of locations, analytics tools, employee count, and revenue range. All 10 are selected by default. Uncheck anything you don\'t need. Only selected criteria are analyzed, scored, and shown in your results.',
  },
  {
    n: '04',
    title: 'Upload your CSV and run',
    body: 'Hit Start Qualification and LeadPulse goes to work. Every website on your list is visited, analyzed against your selected criteria, and scored. 10 prospects or 500 — it runs the same way, automatically, in the background. You\'ll see results populate in real time as each site completes.',
  },
  {
    n: '05',
    title: 'Review your scored results',
    body: 'Every prospect receives a score based on what was found on their site: 🔥 Hot — high priority, clear gap, worth calling today. ⚡ Warm — missing one key qualifier, still worth outreach. ❄️ Cold — already covered, deprioritize. Use the filter bar to narrow by score, service detected, platform, city, state, employee count, revenue, or any combination.',
  },
  {
    n: '06',
    title: 'Generate Intel (optional)',
    body: 'For your best prospects, click Generate Intel to produce a full AI briefing — business summary, owner profile, recent social signals, conversation starters, pain indicators, and a personalized outreach hook written specifically for that business. Generated once, saved permanently. This is what you read before you pick up the phone.',
  },
  {
    n: '07',
    title: 'Export, push to HubSpot, or pull from HubSpot',
    body: 'Download your qualified list as a CSV for any outreach tool. Or use HubSpot sync (Pro plan) — push your qualified prospects into HubSpot CRM with scores, intel, and signals attached, or pull contacts in from an existing HubSpot list to enrich them inside LeadPulse.',
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
            7 steps
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
            LeadPulse visits every website on your list and automatically researches each one, so you know exactly who to call, what to say, and who to skip before you make a single outreach attempt.
          </p>

          <ol className="space-y-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="mt-0.5 flex-shrink-0 text-xs font-semibold tabular-nums text-[#AABFFF]">
                  {s.n}
                </span>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#2E3A59]">{s.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
                  {s.note && (
                    <p className="text-xs text-gray-400 leading-relaxed italic">{s.note}</p>
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

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-[#2E3A59]">Pushing to HubSpot</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pushing to HubSpot is a smart upsert — not a blind create. For every prospect you sync, LeadPulse does the following:
            </p>
            <ul className="space-y-1.5 pl-1">
              {[
                { label: 'Company', desc: 'searches your HubSpot account by website domain. If a matching company record already exists, it updates it with the LeadPulse score, services detected, chatbot status, booking status, platform data, and filter summary. If no match is found, it creates a new company record.' },
                { label: 'Contact', desc: 'searches by email first, then by phone if no email is found. Same logic — updates the existing record if found, creates a new one if not.' },
                { label: 'Association', desc: 'links the contact to the company in HubSpot if not already connected.' },
                { label: 'LeadPulse Intel', desc: 'if you generated an Intel Card for that prospect, it is written to a dedicated LeadPulse Intel field on both the contact and company record so your full briefing lives inside your CRM alongside the record.' },
              ].map((item) => (
                <li key={item.label} className="flex gap-2 text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-[#2E3A59] flex-shrink-0">{item.label} —</span>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 leading-relaxed">
              LeadPulse is always the source of truth on a push. Every score, intel card, and signal field you push will overwrite whatever was in HubSpot previously — no conditions. If you have 50 companies already in HubSpot and push 5 through LeadPulse, only those 5 are touched. No duplicates are ever created.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-[#2E3A59]">Pulling from HubSpot</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pulling is the reverse — it brings contacts from HubSpot into LeadPulse so you can qualify and enrich them. There are two pull modes:
            </p>
            <ul className="space-y-1.5 pl-1">
              {[
                { label: 'HubSpot List', desc: 'select any Company List you have saved in HubSpot. LeadPulse fetches every company in that list, pulls the primary associated contact for each one, and creates a new LeadPulse list ready for qualification. The new list name matches the HubSpot list name.' },
                { label: 'LeadPulse List', desc: 'pulls back contacts that were previously pushed from the current list. LeadPulse searches HubSpot for all records tagged with this list name and refreshes their contact info — name, email, phone, company details — inside LeadPulse.' },
              ].map((item) => (
                <li key={item.label} className="flex gap-2 text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-[#2E3A59] flex-shrink-0">{item.label} —</span>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 leading-relaxed">
              A pull never overwrites enrichment data. If a prospect has already been scraped, LeadPulse will refresh their contact info from HubSpot but will never touch the score, intel card, outreach hook, or any detected signals. HubSpot owns contact info. LeadPulse owns qualification data. Each direction only writes what it owns.
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
