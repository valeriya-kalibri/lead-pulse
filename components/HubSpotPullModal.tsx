'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface HsList {
  id: string
  name: string
}

interface Props {
  userId: string
  currentListId: string
  currentListName: string
  isPro: boolean
  hasHubspotKey: boolean
}

type Source = 'hubspot_list' | 'leadpulse_list'

export default function HubSpotPullModal({
  userId,
  currentListId,
  currentListName,
  isPro,
  hasHubspotKey,
}: Props) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<Source>('hubspot_list')
  const [hsList, setHsList] = useState<HsList[]>([])
  const [lpList, setLpList] = useState<HsList[]>([])
  const [selectedHsId, setSelectedHsId] = useState('')
  const [selectedHsName, setSelectedHsName] = useState('')
  const [loadingLists, setLoadingLists] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [result, setResult] = useState<{ imported: number; updated: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canPull = isPro && hasHubspotKey
  const disabledReason = !isPro
    ? 'Pro plan required'
    : !hasHubspotKey
    ? 'Connect HubSpot in Settings'
    : null

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function fetchLists(type: Source) {
    setLoadingLists(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/hubspot/lists?userId=${encodeURIComponent(userId)}&type=${type === 'hubspot_list' ? 'hubspot' : 'leadpulse'}`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch lists')
      if (type === 'hubspot_list') {
        setHsList(json.lists ?? [])
        const first = json.lists?.[0]
        setSelectedHsId(first?.id ?? '')
        setSelectedHsName(first?.name ?? '')
      } else {
        setLpList(json.lists ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lists')
    } finally {
      setLoadingLists(false)
    }
  }

  function handleOpen() {
    if (!canPull) return
    setOpen(true)
    setResult(null)
    setError(null)
    fetchLists(source)
  }

  function handleSourceChange(next: Source) {
    setSource(next)
    setResult(null)
    setError(null)
    if (next === 'hubspot_list' && hsList.length === 0) fetchLists('hubspot_list')
    if (next === 'leadpulse_list' && lpList.length === 0) fetchLists('leadpulse_list')
  }

  async function handlePull() {
    if (source === 'hubspot_list' && !selectedHsId) return
    setPulling(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/hubspot/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          source,
          hubspotListId: source === 'hubspot_list' ? selectedHsId : undefined,
          hubspotListName: source === 'hubspot_list' ? selectedHsName : undefined,
          currentListId,
          currentListName,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Pull failed')
      if (json.newListId) {
        router.push(`/lists/${json.newListId}`)
        return
      }
      setResult({ imported: json.imported, updated: json.updated })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pull failed')
    } finally {
      setPulling(false)
    }
  }

  const pullDisabled =
    pulling ||
    loadingLists ||
    (source === 'hubspot_list' && !selectedHsId)

  return (
    <div className="relative" ref={panelRef}>
      <div className="relative group">
        <button
          onClick={handleOpen}
          disabled={!canPull}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {/* Download arrow icon */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Pull from HubSpot
        </button>
        {disabledReason && (
          <div className="absolute right-0 top-full mt-1.5 z-10 hidden group-hover:block whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs text-white shadow-lg">
            {disabledReason}
          </div>
        )}
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-4 space-y-4">
          <p className="text-sm font-semibold text-[#2E3A59]">Pull from HubSpot</p>

          {/* Source selector */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Source</label>
            <select
              value={source}
              onChange={(e) => handleSourceChange(e.target.value as Source)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400"
            >
              <option value="hubspot_list">HubSpot Company List</option>
              <option value="leadpulse_list">LeadPulse List</option>
            </select>
          </div>

          {/* HubSpot list picker */}
          {source === 'hubspot_list' && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">HubSpot list</label>
              {loadingLists ? (
                <p className="text-xs text-gray-400">Loading lists…</p>
              ) : hsList.length === 0 ? (
                <p className="text-xs text-gray-400">No company lists found in HubSpot.</p>
              ) : (
                <select
                  value={selectedHsId}
                  onChange={(e) => {
                    setSelectedHsId(e.target.value)
                    setSelectedHsName(hsList.find((l) => l.id === e.target.value)?.name ?? '')
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400"
                >
                  {hsList.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-400">Creates a new LeadPulse list from this HubSpot list.</p>
            </div>
          )}

          {/* LeadPulse list info */}
          {source === 'leadpulse_list' && (
            <div className="space-y-1">
              {loadingLists ? (
                <p className="text-xs text-gray-400">Checking HubSpot…</p>
              ) : lpList.length === 0 ? (
                <p className="text-xs text-amber-600">No contacts in HubSpot tagged with a LeadPulse list name.</p>
              ) : (
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-500">Pulling contacts tagged</p>
                  <p className="text-sm font-medium text-[#2E3A59] truncate">"{currentListName}"</p>
                </div>
              )}
              <p className="text-xs text-gray-400">
                Updates contact info for existing prospects. Enriched records are not overwritten.
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {result.imported > 0 && <span>{result.imported} imported</span>}
              {result.imported > 0 && result.updated > 0 && <span>, </span>}
              {result.updated > 0 && <span>{result.updated} updated</span>}
              {result.imported === 0 && result.updated === 0 && <span>No new records found.</span>}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePull}
              disabled={pullDisabled || (source === 'leadpulse_list' && lpList.length === 0)}
              className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pulling ? 'Pulling…' : 'Pull'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
