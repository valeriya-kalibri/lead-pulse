'use client'

import { useState } from 'react'

const STEPS = [
  {
    n: '01',
    title: 'Export your list from Apollo',
    body: 'Export your prospects as a CSV file. Make sure the website URL column is included. If multiple contacts share the same website, LeadPulse will scrape it once and apply the results to all of them.',
  },
  {
    n: '02',
    title: 'Create a new prospect list',
    body: 'Give your list a name, select your industry, and confirm or customize your service keywords. These keywords are what LeadPulse looks for on each website.',
  },
  {
    n: '03',
    title: 'Choose your qualification criteria',
    body: 'Select which data points you want the scraper to check — chatbot detection, high-ticket services, booking platform, number of locations, and more. Only the criteria you select will be analyzed and shown in your results.',
  },
  {
    n: '04',
    title: 'Upload your CSV and run',
    body: 'LeadPulse works through your entire list automatically — 10 prospects or 500, it runs the same way. Each website is visited, analyzed against your criteria, and scored.',
  },
  {
    n: '05',
    title: 'Review your scored results',
    body: 'Every prospect receives a score: 🔥 Hot, ⚡ Warm, or ❄️ Cold — based on what was found on their site. Use the filter bar to narrow down by score, service, platform, or any combination.',
  },
  {
    n: '06',
    title: 'Export or sync to HubSpot',
    body: 'Download your qualified list as a CSV for any outreach tool, or push your prospects directly into HubSpot CRM with one click (Pro plan).',
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
          <span className="text-sm font-medium text-[#2E3A59]">How This Works</span>
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
        <div className="border-t border-gray-100 px-4 pt-4 pb-5">
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            LeadPulse visits every website on your list and automatically researches each one — so
            you know exactly who to contact before you make a single call.
          </p>

          <ol className="space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="mt-0.5 flex-shrink-0 text-xs font-semibold tabular-nums text-[#AABFFF]">
                  {s.n}
                </span>
                <div>
                  <p className="text-xs font-medium text-[#2E3A59]">{s.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-4 text-xs text-gray-400 border-t border-gray-100 pt-3 leading-relaxed">
            LeadPulse does not replace Apollo — it works alongside it. Apollo finds your
            prospects. LeadPulse tells you which ones are worth calling.
          </p>
        </div>
      )}
    </div>
  )
}
