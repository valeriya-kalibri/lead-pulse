'use client'

import { useState } from 'react'
import type { IntelData } from '@/types'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="shrink-0 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-400 hover:border-[#2E3A59] hover:text-[#2E3A59] transition-colors"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  )
}

export default function IntelCard({ intel }: { intel: IntelData }) {
  return (
    <div className="space-y-4">
      {/* Outreach Hook — primary CTA, visually first */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              ⚡ Outreach Hook
            </p>
            <p className="text-sm font-medium leading-relaxed text-amber-900">
              {intel.outreach_hook}
            </p>
          </div>
          <CopyButton text={intel.outreach_hook} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
        <div>
          <p className="mb-1 font-semibold text-[#2E3A59]">🏢 Business Summary</p>
          <p className="leading-relaxed text-gray-600">{intel.business_summary}</p>
        </div>

        <div>
          <p className="mb-1 font-semibold text-[#2E3A59]">👤 Owner / Decision Maker</p>
          <p className="leading-relaxed text-gray-600">{intel.owner_profile}</p>
        </div>

        <div>
          <p className="mb-1 font-semibold text-[#2E3A59]">📱 Social Signals</p>
          <p className="leading-relaxed text-gray-600">{intel.social_signals}</p>
        </div>

        <div>
          <p className="mb-1 font-semibold text-[#2E3A59]">⚠️ Pain Indicators</p>
          <p className="leading-relaxed text-gray-600">{intel.pain_indicators}</p>
        </div>

        <div className="md:col-span-2">
          <p className="mb-2 font-semibold text-[#2E3A59]">💬 Conversation Starters</p>
          <div className="flex flex-col gap-2">
            {intel.conversation_starters.map((s, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2"
              >
                <p className="text-gray-600">{s}</p>
                <CopyButton text={s} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
