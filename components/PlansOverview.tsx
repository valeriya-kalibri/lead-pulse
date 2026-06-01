'use client'

import { useState } from 'react'

const features: { label: string; starter: string; pro: string }[] = [
  { label: 'Prospects per month',            starter: '250',           pro: 'Unlimited' },
  { label: 'CSV upload & batch scraping',    starter: '✓',             pro: '✓' },
  { label: 'All 10 qualification criteria',  starter: '✓',             pro: '✓' },
  { label: 'Industry templates + keywords',  starter: '✓',             pro: '✓' },
  { label: 'Apollo / HubSpot CSV import',   starter: '✓',             pro: '✓' },
  { label: 'Filter, sort, export to CSV',    starter: '✓',             pro: '✓' },
  { label: 'Saved prospect lists',           starter: '✓',             pro: '✓' },
  { label: 'Error tracking & debug panel',   starter: '✓',             pro: '✓' },
  { label: 'AI Intel Cards',                 starter: 'Pay per use',   pro: '100 included / month' },
  { label: 'HubSpot Contact & Company sync', starter: '—',             pro: '✓' },
  { label: 'LeadPulse Intel property sync',  starter: '—',             pro: '✓' },
  { label: 'Filter Summary in HubSpot',      starter: '—',             pro: '✓' },
  { label: 'Pull lists from HubSpot',        starter: '—',             pro: '✓' },
  { label: 'Multi-filter scoring dashboard', starter: '—',             pro: '✓' },
  { label: 'Priority scraping',              starter: '—',             pro: '✓' },
  { label: 'Bulk field editing',             starter: '—',             pro: '✓' },
]

export default function PlansOverview() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
      >
        <span className="text-sm font-medium text-[#2E3A59]">Plans — Starter vs Pro</span>
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
        <div className="border-t border-gray-100 px-4 pt-4 pb-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Starter</p>
              <p className="text-lg font-bold text-[#2E3A59]">$49<span className="text-xs font-normal text-gray-400"> / mo</span></p>
              <p className="text-xs text-gray-400 mt-1">Up to 250 prospects / month. Full scraping and export — no CRM sync.</p>
            </div>
            <div className="rounded-lg border border-[#2E3A59]/20 bg-[#2E3A59] px-4 py-3">
              <p className="text-xs font-semibold text-[#AABFFF] uppercase tracking-wide mb-0.5">Pro</p>
              <p className="text-lg font-bold text-white">$149<span className="text-xs font-normal text-white/60"> / mo</span></p>
              <p className="text-xs text-white/60 mt-1">Unlimited prospects, HubSpot sync, Intel sync, bulk editing, and priority scraping.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Feature</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 w-28">Starter</th>
                  <th className="px-3 py-2 text-center font-medium text-[#2E3A59] w-28">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {features.map((f, i) => {
                  const starterGray = f.starter === '—'
                  const proHighlight = f.starter === '—' && f.pro === '✓'
                  return (
                    <tr key={i} className={i % 2 === 1 ? 'bg-gray-50/30' : ''}>
                      <td className="px-3 py-2 text-gray-700">{f.label}</td>
                      <td className={`px-3 py-2 text-center ${starterGray ? 'text-gray-300' : 'text-gray-500'}`}>
                        {f.starter}
                      </td>
                      <td className={`px-3 py-2 text-center font-medium ${proHighlight ? 'text-[#2E3A59]' : 'text-gray-500'}`}>
                        {f.pro}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
