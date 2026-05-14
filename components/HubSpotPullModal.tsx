'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  listId: string
  listName: string
  userId: string
  isPro: boolean
  hasHubspotKey: boolean
}

export default function HubSpotPullModal({ listId, listName, userId, isPro, hasHubspotKey }: Props) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [hasRecords, setHasRecords] = useState<boolean | null>(null)
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

  async function checkForRecords() {
    setHasRecords(null)
    try {
      const res = await fetch(
        `/api/hubspot/lists?userId=${encodeURIComponent(userId)}&type=leadpulse`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      const lists: { id: string; name: string }[] = json.lists ?? []
      setHasRecords(lists.some((l) => l.name === listName))
    } catch {
      setHasRecords(false)
    }
  }

  function handleOpen() {
    if (!canPull) return
    setOpen(true)
    setResult(null)
    setError(null)
    checkForRecords()
  }

  async function handlePull() {
    setPulling(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/hubspot/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          source: 'leadpulse_list',
          currentListId: listId,
          currentListName: listName,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Refresh failed')
      setResult({ imported: json.imported, updated: json.updated })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setPulling(false)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <div className="relative group">
        <button
          onClick={handleOpen}
          disabled={!canPull}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Refresh from HubSpot
        </button>
        {disabledReason && (
          <div className="absolute right-0 top-full mt-1.5 z-10 hidden group-hover:block whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs text-white shadow-lg">
            {disabledReason}
          </div>
        )}
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-4 space-y-4">
          <p className="text-sm font-semibold text-[#2E3A59]">Refresh from HubSpot</p>

          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
            <p className="text-xs text-gray-500">Syncing contacts tagged</p>
            <p className="text-sm font-medium text-[#2E3A59] truncate">"{listName}"</p>
          </div>

          {hasRecords === null && (
            <p className="text-xs text-gray-400">Checking HubSpot…</p>
          )}
          {hasRecords === false && (
            <p className="text-xs text-amber-600">
              No contacts in HubSpot tagged with this list name. Sync this list to HubSpot first.
            </p>
          )}

          <p className="text-xs text-gray-400">
            Updates contact info for existing prospects. Enriched records are not overwritten.
          </p>

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {result.imported > 0 && <span>{result.imported} imported</span>}
              {result.imported > 0 && result.updated > 0 && ', '}
              {result.updated > 0 && <span>{result.updated} updated</span>}
              {result.imported === 0 && result.updated === 0 && 'No new records found.'}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePull}
              disabled={pulling || hasRecords === null || hasRecords === false}
              className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pulling ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
