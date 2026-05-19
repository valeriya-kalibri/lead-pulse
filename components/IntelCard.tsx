'use client'

import { useState } from 'react'
import type { IntelData, ApolloStatus, Prospect } from '@/types'

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

const APOLLO_STATUSES: { value: ApolloStatus; label: string; cls: string }[] = [
  { value: 'not_enrolled', label: 'Not Enrolled', cls: 'bg-gray-100 text-gray-600' },
  { value: 'enrolled', label: 'Enrolled', cls: 'bg-blue-50 text-blue-600' },
  { value: 'replied', label: 'Replied', cls: 'bg-green-50 text-green-700' },
  { value: 'bounced', label: 'Bounced', cls: 'bg-red-50 text-red-600' },
  { value: 'completed', label: 'Completed', cls: 'bg-purple-50 text-purple-700' },
]

interface EmailSequence {
  outreach_email_subject_1: string
  outreach_email_body_1: string
  outreach_email_subject_2: string
  outreach_email_body_2: string
  outreach_email_subject_3: string
  outreach_email_body_3: string
}

interface IntelCardProps {
  intel: IntelData
  prospect: Pick<
    Prospect,
    | 'id'
    | 'score'
    | 'outreach_email_subject_1'
    | 'outreach_email_body_1'
    | 'outreach_email_subject_2'
    | 'outreach_email_body_2'
    | 'outreach_email_subject_3'
    | 'outreach_email_body_3'
    | 'sequence_generated_at'
    | 'apollo_sequence_status'
  >
  onSequenceGenerated: (prospectId: string, data: EmailSequence) => void
  onApolloStatusChange: (prospectId: string, status: ApolloStatus) => void
}

const EMAIL_LABELS = [
  { key: 1 as const, label: 'Email 1 — Cold Opener', send: 'Day 1' },
  { key: 2 as const, label: 'Email 2 — Follow-Up', send: 'Day 3–4' },
  { key: 3 as const, label: 'Email 3 — Breakup Email', send: 'Day 7–8' },
]

export default function IntelCard({ intel, prospect, onSequenceGenerated, onApolloStatusChange }: IntelCardProps) {
  const [loadingSequence, setLoadingSequence] = useState(false)
  const [sequenceError, setSequenceError] = useState<string | null>(null)
  const [openEmail, setOpenEmail] = useState<number | null>(null)

  const hasSequence = Boolean(prospect.sequence_generated_at)
  const apolloStatus = APOLLO_STATUSES.find(s => s.value === prospect.apollo_sequence_status) ?? APOLLO_STATUSES[0]

  async function generateSequence(refresh = false) {
    setLoadingSequence(true)
    setSequenceError(null)
    try {
      const url = `/api/prospects/${prospect.id}/sequence${refresh ? '?refresh=1' : ''}`
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
        setSequenceError(error)
        return
      }
      const data: EmailSequence = await res.json()
      onSequenceGenerated(prospect.id, data)
    } catch {
      setSequenceError('Network error — try again.')
    } finally {
      setLoadingSequence(false)
    }
  }

  async function updateApolloStatus(status: ApolloStatus) {
    onApolloStatusChange(prospect.id, status)
    fetch(`/api/prospects/${prospect.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apollo_sequence_status: status }),
    }).catch(console.error)
  }

  return (
    <div className="space-y-4">
      {/* Outreach Hook */}
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

      {/* Email Sequence Section */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[#2E3A59]">✉️ Email Sequence</p>
          {hasSequence && (
            <button
              type="button"
              onClick={() => generateSequence(true)}
              disabled={loadingSequence}
              title="Regenerate email sequence"
              className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
            >
              ↻ Regenerate
            </button>
          )}
        </div>

        {!hasSequence && !loadingSequence && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => generateSequence()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#AABFFF]/40 bg-[#F5F7FF] px-3 py-1.5 text-xs font-medium text-[#2E3A59] hover:border-[#AABFFF] hover:bg-[#AABFFF]/10 transition-colors"
            >
              ✉️ Generate Email Sequence
            </button>
            <span className="text-xs text-gray-400">3-step personalized sequence from Intel Card data</span>
          </div>
        )}

        {loadingSequence && (
          <p className="text-xs text-[#AABFFF] animate-pulse">Writing 3 personalized emails…</p>
        )}

        {sequenceError && (
          <p className="text-xs text-red-500">{sequenceError}</p>
        )}

        {hasSequence && !loadingSequence && (
          <div className="space-y-2">
            {EMAIL_LABELS.map(({ key, label, send }) => {
              const subject = prospect[`outreach_email_subject_${key}` as keyof typeof prospect] as string | null
              const body = prospect[`outreach_email_body_${key}` as keyof typeof prospect] as string | null
              const isOpen = openEmail === key

              return (
                <div key={key} className="rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenEmail(isOpen ? null : key)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-[#2E3A59] whitespace-nowrap">{label}</span>
                      <span className="rounded-full bg-[#2E3A59]/10 px-2 py-0.5 text-[10px] text-[#2E3A59] whitespace-nowrap">{send}</span>
                      {subject && (
                        <span className="text-xs text-gray-400 truncate hidden sm:block">{subject}</span>
                      )}
                    </div>
                    <svg
                      className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && subject && body && (
                    <div className="border-t border-gray-100 px-3 py-3 space-y-3 bg-gray-50/50">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Subject</p>
                          <CopyButton text={subject} />
                        </div>
                        <p className="text-xs font-medium text-[#2E3A59]">{subject}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Body</p>
                          <CopyButton text={body} />
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{body}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Apollo status tracking */}
            <div className="mt-3 flex items-center gap-3 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 shrink-0">Apollo status:</p>
              <div className="flex flex-wrap gap-1.5">
                {APOLLO_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => updateApolloStatus(s.value)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${
                      s.value === prospect.apollo_sequence_status
                        ? `${s.cls} ring-1 ring-current`
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
