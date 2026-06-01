'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { IndustryTemplate, OfferType } from '@/types'
import { CRITERIA_LIST, ALL_CRITERIA } from '@/lib/criteria'
import { OFFER_LIST, OFFERS } from '@/lib/offers'

interface Props {
  templates: IndustryTemplate[]
}

function StepCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: number
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-[#F5F7FF]">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#2E3A59] text-white text-xs font-semibold flex items-center justify-center">
          {step}
        </span>
        <div>
          <p className="text-sm font-semibold text-[#2E3A59]">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

export default function NewListForm({ templates }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [offerType, setOfferType] = useState<OfferType>('lead_capture')
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [criteria, setCriteria] = useState<string[]>([...ALL_CRITERIA])
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function selectOffer(type: OfferType) {
    setOfferType(type)
    // Apply the offer's default criteria — user can still edit
    setCriteria([...OFFERS[type].defaultCriteria])
  }

  function selectTemplate(t: IndustryTemplate) {
    setSelectedTemplate(t)
    setKeywords([...t.default_keywords])
  }

  function addKeyword() {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw])
    }
    setKeywordInput('')
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw))
  }

  function toggleCriterion(id: string) {
    setCriteria((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.csv')) setFile(dropped)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return setError('Please upload a CSV file.')
    if (!name.trim()) return setError('Please enter a list name.')
    if (!selectedTemplate) return setError('Please select an industry template.')

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('name', name)
    formData.append('industry_name', selectedTemplate.name)
    formData.append('industry_template_id', selectedTemplate.id)
    formData.append('keywords', JSON.stringify(keywords))
    formData.append('criteria', JSON.stringify(criteria))
    formData.append('offer_type', offerType)
    formData.append('csv', file)

    const res = await fetch('/api/scrape', { method: 'POST', body: formData })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    router.push(`/lists/${json.list_id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Step 1 — List name */}
      <StepCard step={1} title="Name your list" subtitle="Give this run a clear label for easy reference later.">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Med Spas — Chicago Q2"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2E3A59] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#AABFFF] focus:border-transparent"
        />
      </StepCard>

      {/* Step 2 — Offer type */}
      <StepCard
        step={2}
        title="Choose your offer"
        subtitle="Controls scoring, intel, and email sequence angle for every prospect in this list."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OFFER_LIST.map((offer) => {
            const selected = offerType === offer.id
            return (
              <button
                key={offer.id}
                type="button"
                onClick={() => selectOffer(offer.id)}
                className={`text-left rounded-xl border px-4 py-3.5 transition-all ${
                  selected
                    ? 'border-[#2E3A59] bg-[#2E3A59] shadow-sm'
                    : 'border-gray-200 bg-white hover:border-[#AABFFF]'
                }`}
              >
                <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-[#2E3A59]'}`}>
                  {offer.label}
                </p>
                <p className={`text-xs mt-1 leading-relaxed ${selected ? 'text-white/75' : 'text-gray-400'}`}>
                  {offer.description}
                </p>
              </button>
            )
          })}
        </div>
      </StepCard>

      {/* Step 3 — Industry template */}
      <StepCard step={3} title="Select an industry" subtitle="Loads a curated keyword set for that vertical.">
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTemplate(t)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                selectedTemplate?.id === t.id
                  ? 'border-[#2E3A59] bg-[#2E3A59] text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#AABFFF] hover:text-[#2E3A59]'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </StepCard>

      {/* Step 4 — Keywords */}
      <StepCard
        step={4}
        title="Service keywords"
        subtitle="Terms that signal this prospect needs what you sell."
      >
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 p-3 rounded-lg bg-[#F5F7FF] border border-[#AABFFF]/30">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 rounded-full bg-[#2E3A59] px-3 py-1 text-xs font-medium text-white"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${kw}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            placeholder="Type a keyword and press Enter…"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2E3A59] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#AABFFF] focus:border-transparent"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-[#2E3A59] hover:bg-[#F5F7FF] hover:border-[#AABFFF] transition-colors"
          >
            Add
          </button>
        </div>
      </StepCard>

      {/* Step 5 — Criteria */}
      <StepCard
        step={5}
        title="Qualification criteria"
        subtitle="Pre-filled for your offer. Only checked items are scraped, scored, and shown as columns."
      >
        <div className="flex gap-3 text-xs mb-3">
          <button
            type="button"
            onClick={() => setCriteria([...ALL_CRITERIA])}
            className="text-[#2E3A59] font-medium hover:underline"
          >
            Select all
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => setCriteria([])}
            className="text-gray-400 hover:underline"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => setCriteria([...OFFERS[offerType].defaultCriteria])}
            className="text-[#AABFFF] hover:underline"
          >
            Reset to offer defaults
          </button>
          <span className="ml-auto text-gray-400">{criteria.length} of {CRITERIA_LIST.length} selected</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CRITERIA_LIST.map((c) => {
            const checked = criteria.includes(c.id)
            const isDefault = OFFERS[offerType].defaultCriteria.includes(c.id)
            return (
              <div
                key={c.id}
                onClick={() => toggleCriterion(c.id)}
                className={`flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer transition-all select-none ${
                  checked
                    ? 'border-[#AABFFF] bg-[#AABFFF]/10 shadow-[inset_0_0_0_1px_#AABFFF]'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    checked ? 'bg-[#2E3A59] border-[#2E3A59]' : 'border-gray-300 bg-white'
                  }`}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-semibold ${checked ? 'text-[#2E3A59]' : 'text-gray-600'}`}>{c.label}</p>
                    {isDefault && (
                      <span className="text-[10px] font-medium text-[#AABFFF] bg-[#AABFFF]/15 px-1.5 py-0.5 rounded-full leading-none">
                        default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{c.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </StepCard>

      {/* Step 6 — CSV upload */}
      <StepCard step={6} title="Upload your CSV" subtitle="One website URL per row. Business name and other fields are optional.">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all ${
            dragOver
              ? 'border-[#2E3A59] bg-[#AABFFF]/8 scale-[1.01]'
              : file
              ? 'border-[#AABFFF] bg-[#AABFFF]/5'
              : 'border-gray-200 bg-[#F5F7FF] hover:border-gray-300'
          }`}
        >
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#2E3A59]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#2E3A59]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2E3A59]">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors mt-1"
              >
                Remove file
              </button>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-3 shadow-sm">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#2E3A59]">Drop your CSV here</p>
              <p className="text-xs text-gray-400 mt-1">or{' '}
                <label className="cursor-pointer text-[#2E3A59] font-semibold underline underline-offset-2">
                  browse to upload
                  <input
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-300 mt-3">.csv files only</p>
            </>
          )}
        </div>
      </StepCard>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !file}
        className="w-full rounded-xl bg-[#2E3A59] px-4 py-3 text-sm font-semibold text-white hover:bg-[#3a4a6e] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing…
          </span>
        ) : (
          'Start qualification →'
        )}
      </button>
    </form>
  )
}
