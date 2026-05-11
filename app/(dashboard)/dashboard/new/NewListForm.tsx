'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { IndustryTemplate } from '@/types'
import { CRITERIA_LIST, ALL_CRITERIA } from '@/lib/criteria'

interface Props {
  templates: IndustryTemplate[]
}

export default function NewListForm({ templates }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [criteria, setCriteria] = useState<string[]>([...ALL_CRITERIA])
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* List name */}
      <div>
        <label className="block text-sm font-medium text-[#2E3A59] mb-1">List name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Med Spas — Chicago Q2"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
        />
      </div>

      {/* Industry template */}
      <div>
        <label className="block text-sm font-medium text-[#2E3A59] mb-2">Industry template</label>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTemplate(t)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedTemplate?.id === t.id
                  ? 'border-[#2E3A59] bg-[#2E3A59] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#2E3A59]'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-[#2E3A59] mb-2">
          Service keywords{' '}
          <span className="font-normal text-gray-400">(what you&apos;re qualifying for)</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 rounded-full bg-[#AABFFF]/20 px-2.5 py-1 text-xs font-medium text-[#2E3A59]"
            >
              {kw}
              <button
                type="button"
                onClick={() => removeKeyword(kw)}
                className="hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            placeholder="Add keyword and press Enter"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-[#2E3A59] transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Qualification criteria */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-[#2E3A59]">
            Qualification criteria
          </label>
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              onClick={() => setCriteria([...ALL_CRITERIA])}
              className="text-[#2E3A59] hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setCriteria([])}
              className="text-gray-400 hover:underline"
            >
              Clear all
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Only checked criteria will be scraped, scored, and shown as columns in results.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CRITERIA_LIST.map((c) => {
            const checked = criteria.includes(c.id)
            return (
              <label
                key={c.id}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                  checked
                    ? 'border-[#AABFFF] bg-[#AABFFF]/8'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCriterion(c.id)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#2E3A59] accent-[#2E3A59]"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#2E3A59]">{c.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* CSV upload */}
      <div>
        <label className="block text-sm font-medium text-[#2E3A59] mb-2">
          Upload CSV{' '}
          <span className="font-normal text-gray-400">(one website URL per row)</span>
        </label>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? 'border-[#AABFFF] bg-[#AABFFF]/5' : 'border-gray-200 bg-white'
          }`}
        >
          {file ? (
            <div>
              <p className="text-sm font-medium text-[#2E3A59]">{file.name}</p>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="mt-1 text-xs text-gray-400 hover:text-red-500"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <svg
                className="w-8 h-8 text-gray-300 mb-2"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <p className="text-sm text-gray-500">Drag & drop your CSV or</p>
              <label className="mt-1 cursor-pointer text-sm text-[#2E3A59] font-medium hover:underline">
                browse
                <input
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !file || !selectedTemplate}
        className="w-full rounded-lg bg-[#2E3A59] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3a4a6e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing…' : 'Start qualification'}
      </button>
    </form>
  )
}
