'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { IndustryTemplate } from '@/types'
import { ALL_CRITERIA } from '@/lib/criteria'

interface HsList {
  id: string
  name: string
  objectTypeId: string | null
}

interface Props {
  userId: string
  isPro: boolean
  hasHubspotKey: boolean
  templates: IndustryTemplate[]
}

export default function HubSpotImportModal({ userId, isPro, hasHubspotKey, templates }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [hsList, setHsList] = useState<HsList[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  const [selectedHsId, setSelectedHsId] = useState('')
  const [listName, setListName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canImport = isPro && hasHubspotKey
  const disabledReason = !isPro
    ? 'Pro plan required'
    : !hasHubspotKey
    ? 'Connect HubSpot in Settings'
    : null

  async function fetchLists() {
    setLoadingLists(true)
    setError(null)
    try {
      const res = await fetch(`/api/hubspot/lists?userId=${encodeURIComponent(userId)}&type=hubspot`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch HubSpot lists')
      const lists: HsList[] = json.lists ?? []
      setHsList(lists)
      if (lists[0]) {
        setSelectedHsId(lists[0].id)
        setListName(lists[0].name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch HubSpot lists')
    } finally {
      setLoadingLists(false)
    }
  }

  function handleOpen() {
    if (!canImport) return
    setOpen(true)
    setError(null)
    setSelectedTemplate(null)
    setSelectedHsId('')
    setListName('')
    setHsList([])
    fetchLists()
  }

  function handleHsSelect(id: string) {
    const found = hsList.find((l) => l.id === id)
    if (!found) return
    setSelectedHsId(id)
    setListName(found.name)
  }

  async function handleImport() {
    if (!selectedHsId || !selectedTemplate || !listName.trim()) return
    setImporting(true)
    setError(null)
    try {
      const selectedHsName = hsList.find((l) => l.id === selectedHsId)?.name ?? listName
      const res = await fetch('/api/hubspot/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          source: 'hubspot_list',
          hubspotListId: selectedHsId,
          hubspotListName: listName.trim(),
          hubspotListObjectTypeId: hsList.find((l) => l.id === selectedHsId)?.objectTypeId ?? null,
          industryTemplateId: selectedTemplate.id,
          industryName: selectedTemplate.name,
          serviceKeywords: selectedTemplate.default_keywords,
          selectedCriteria: ALL_CRITERIA,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Import failed')
      if (json.newListId) {
        setOpen(false)
        router.push(`/lists/${json.newListId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const canSubmit = !importing && !loadingLists && selectedHsId && selectedTemplate && listName.trim()

  return (
    <>
      <div className="relative group">
        <button
          onClick={handleOpen}
          disabled={!canImport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Import from HubSpot
        </button>
        {disabledReason && (
          <div className="absolute right-0 top-full mt-1.5 z-10 hidden group-hover:block whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs text-white shadow-lg">
            {disabledReason}
          </div>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#2E3A59]">Import from HubSpot</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* HubSpot list picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">HubSpot Company List</label>
                {loadingLists ? (
                  <p className="text-sm text-gray-400">Loading your HubSpot lists…</p>
                ) : hsList.length === 0 && !error ? (
                  <p className="text-sm text-amber-600">No company lists found in HubSpot.</p>
                ) : (
                  <select
                    value={selectedHsId}
                    onChange={(e) => handleHsSelect(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF] focus:border-transparent"
                  >
                    {hsList.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* List name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">
                  List name in LeadPulse
                  <span className="ml-1 font-normal text-gray-400">(auto-filled, editable)</span>
                </label>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="e.g. Med Spas — Chicago Q2"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2E3A59] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#AABFFF] focus:border-transparent"
                />
              </div>

              {/* Industry picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Industry</label>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplate(t)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                        selectedTemplate?.id === t.id
                          ? 'border-[#2E3A59] bg-[#2E3A59] text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-[#AABFFF] hover:text-[#2E3A59]'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
                {selectedTemplate && selectedTemplate.default_keywords.length > 0 && (
                  <p className="text-xs text-gray-400">
                    {selectedTemplate.default_keywords.length} default keywords loaded. You can edit them after import.
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!canSubmit}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
