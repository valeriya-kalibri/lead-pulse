'use client'

import { useState } from 'react'

export default function HowCSVImportWorks() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
      >
        <span className="text-sm font-medium text-[#2E3A59]">How CSV Import Works</span>
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

          {/* One prospect per company */}
          <div>
            <p className="text-xs font-medium text-[#2E3A59] mb-1">One prospect per company domain</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              LeadPulse qualifies companies, not individual contacts. When you upload a CSV, it groups
              every row by company domain name and creates one prospect per unique domain. If your
              Apollo export has 32 contacts across 15 companies, you&rsquo;ll get 15 prospects — one
              scraped result per website. This is intentional: scraping the same site five times gives
              you the same score five times. One clean row per company is what you actually need before
              outreach.
            </p>
          </div>

          {/* Contact selection */}
          <div>
            <p className="text-xs font-medium text-[#2E3A59] mb-2">Who gets kept when a company has multiple contacts</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              LeadPulse automatically picks the best person to contact using a priority ranking. The
              goal is to surface the person who controls the budget and makes purchasing decisions —
              not the clinical lead. An owner who is also an injector is still the right person to
              call. A Medical Director at a founder-led practice is not.
            </p>

            <div className="space-y-1.5">
              {[
                { tier: 'Tier 1', label: 'Owner / Founder / Co-Owner / Partner', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { tier: 'Tier 2', label: 'CEO / President / Principal', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { tier: 'Tier 3', label: 'Medical Director / Clinical Director / CMO', color: 'bg-violet-50 text-violet-700 border-violet-200' },
                { tier: 'Tier 4', label: 'Practice Manager / Operations Manager / Office Manager', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { tier: 'Tier 5', label: 'Everyone else', color: 'bg-gray-50 text-gray-500 border-gray-200' },
              ].map(({ tier, label, color }) => (
                <div key={tier} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${color}`}>
                  <span className="text-[10px] font-semibold tracking-wide uppercase w-10 shrink-0">{tier}</span>
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mt-3">
              If two contacts share the same tier, LeadPulse prefers the one with a business email
              over a personal email only. If still tied, the one with a phone number wins. After that,
              the first person in the file is kept.
            </p>
          </div>

        </div>
      )}
    </div>
  )
}
