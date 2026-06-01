'use client'

import { useState } from 'react'

export default function HowListsWork() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
      >
        <span className="text-sm font-medium text-[#2E3A59]">How Lists Work</span>
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
        <div className="border-t border-gray-100 px-4 pt-4 pb-5 space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            Every list in LeadPulse is completely isolated. A run of 30 prospects and a run of 5 prospects are two separate lists — they don&rsquo;t know about each other. Your results, CSV export, and HubSpot sync all operate only on the list you&rsquo;re currently viewing. If you export the 5-company list, you get 5 rows. The 30 from the other run are never included.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            This means you can run multiple campaigns simultaneously — different industries, different regions, different criteria — and each one stays clean and separate.
          </p>
        </div>
      )}
    </div>
  )
}
