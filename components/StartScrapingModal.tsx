'use client'

import { useState, useEffect } from 'react'
import { CRITERIA_LIST, ALL_CRITERIA } from '@/lib/criteria'

interface Props {
  isOpen: boolean
  onClose: () => void
  listName: string
  initialKeywords: string[]
  initialCriteria: string[]
  onConfirm: (keywords: string[], criteria: string[]) => void
  confirming: boolean
}

export default function StartScrapingModal({
  isOpen,
  onClose,
  listName,
  initialKeywords,
  initialCriteria,
  onConfirm,
  confirming,
}: Props) {
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [criteria, setCriteria] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      setKeywords(initialKeywords.length > 0 ? [...initialKeywords] : [])
      setCriteria(initialCriteria.length > 0 ? [...initialCriteria] : [...ALL_CRITERIA])
      setKeywordInput('')
    }
  }, [isOpen, initialKeywords, initialCriteria])

  if (!isOpen) return null

  function addKeyword() {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) setKeywords([...keywords, kw])
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

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-[#2E3A59]">Configure Scraping</h2>
              <p className="text-xs text-gray-400 mt-0.5">{listName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
            {/* Keywords */}
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-[#2E3A59]">Service keywords</p>
                <p className="text-xs text-gray-400 mt-0.5">Terms that signal this prospect offers high-ticket services.</p>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-[#F5F7FF] border border-[#AABFFF]/30">
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
            </div>

            {/* Criteria */}
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#2E3A59]">Qualification criteria</p>
                  <p className="text-xs text-gray-400 mt-0.5">Only checked items will be scraped, scored, and shown as columns.</p>
                </div>
                <div className="flex gap-3 text-xs">
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
                    Clear
                  </button>
                  <span className="text-gray-400">{criteria.length}/{CRITERIA_LIST.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CRITERIA_LIST.map((c) => {
                  const checked = criteria.includes(c.id)
                  return (
                    <label
                      key={c.id}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer transition-all ${
                        checked
                          ? 'border-[#AABFFF] bg-[#AABFFF]/10 shadow-[inset_0_0_0_1px_#AABFFF]'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleCriterion(c.id)}
                      />
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
                        <p className={`text-xs font-semibold ${checked ? 'text-[#2E3A59]' : 'text-gray-600'}`}>{c.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{c.description}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={confirming}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(keywords, criteria)}
              disabled={confirming || criteria.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2E3A59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a4a6e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {confirming ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Starting…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                  </svg>
                  Start Scraping
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
