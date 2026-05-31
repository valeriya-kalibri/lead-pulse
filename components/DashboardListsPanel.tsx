'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { IndustryTemplate, ProspectList } from '@/types'
import HubSpotImportModal from '@/components/HubSpotImportModal'
import DeleteListButton from '@/app/(dashboard)/dashboard/DeleteListButton'

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: ProspectList['status'] }) {
  const map: Record<string, string> = {
    pending:    'bg-gray-100 text-gray-600',
    processing: 'bg-blue-50 text-blue-600',
    complete:   'bg-green-50 text-green-700',
    error:      'bg-red-50 text-red-600',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {status}
    </span>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  lists: ProspectList[]
  userId: string
  isPro: boolean
  hasHubspotKey: boolean
  templates: IndustryTemplate[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardListsPanel({ lists, userId, isPro, hasHubspotKey, templates }: Props) {
  const router = useRouter()

  // Single-select: id of checked list, or null
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Update-from-HubSpot state
  const [updating, setUpdating] = useState(false)
  const [updateResult, setUpdateResult] = useState<{ imported: number; updated: number } | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const selectedList = lists.find((l) => l.id === selectedId) ?? null

  function toggleRow(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
    // Clear previous result/error when selection changes
    setUpdateResult(null)
    setUpdateError(null)
  }

  async function handleUpdate() {
    if (!selectedList) return
    setUpdating(true)
    setUpdateResult(null)
    setUpdateError(null)
    try {
      const res = await fetch('/api/hubspot/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          source: 'leadpulse_list',
          currentListId: selectedList.id,
          currentListName: selectedList.name,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setUpdateResult({ imported: json.imported, updated: json.updated })
      router.refresh()
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  const canHubspot = isPro && hasHubspotKey
  const hubspotDisabledReason = !isPro
    ? 'Pro plan required'
    : !hasHubspotKey
    ? 'Connect HubSpot in Settings'
    : null

  return (
    <div className="space-y-3">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Left: context-sensitive HubSpot button */}
        {selectedList ? (
          /* Update mode */
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                onClick={handleUpdate}
                disabled={!canHubspot || updating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {updating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Updating…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Update from HubSpot
                  </>
                )}
              </button>
              {hubspotDisabledReason && (
                <div className="absolute left-0 top-full mt-1.5 z-10 hidden group-hover:block whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs text-white shadow-lg">
                  {hubspotDisabledReason}
                </div>
              )}
            </div>

            {/* Updating: selected list label */}
            <span className="text-sm text-gray-500 truncate max-w-[220px]">
              "{selectedList.name}"
            </span>

            {/* Dismiss selection */}
            <button
              onClick={() => { setSelectedId(null); setUpdateResult(null); setUpdateError(null) }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear selection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          /* Default: Import New from HubSpot */
          <HubSpotImportModal
            userId={userId}
            isPro={isPro}
            hasHubspotKey={hasHubspotKey}
            templates={templates}
          />
        )}

        {/* Right: always-visible New from CSV */}
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2E3A59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a4a6e] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New from CSV
        </Link>
      </div>

      {/* ── Update result / error banner ────────────────────────────────────── */}
      {updateResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          {updateResult.imported === 0 && updateResult.updated === 0
            ? 'No new records found in HubSpot.'
            : [
                updateResult.imported > 0 ? `${updateResult.imported} new prospect${updateResult.imported !== 1 ? 's' : ''} imported` : '',
                updateResult.updated > 0 ? `${updateResult.updated} record${updateResult.updated !== 1 ? 's' : ''} updated` : '',
              ].filter(Boolean).join(', ') + '.'}
        </div>
      )}
      {updateError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {updateError}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">No prospect lists yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload a CSV or import new from HubSpot to get started</p>
          <Link
            href="/dashboard/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#2E3A59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a4a6e] transition-colors"
          >
            Create your first list
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {/* Checkbox col — no header checkbox (single-select only) */}
                <th className="w-10 px-4 py-3" />
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Industry</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Prospects</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Hot</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Warm</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lists.map((list) => {
                const isChecked = list.id === selectedId
                return (
                  <tr
                    key={list.id}
                    className={`transition-colors ${isChecked ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRow(list.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer accent-orange-500"
                        aria-label={`Select ${list.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/lists/${list.id}`} className="font-medium text-[#2E3A59] hover:underline">
                        {list.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{list.industry_name ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{list.total_prospects}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600 font-medium">{list.hot_count}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-yellow-600 font-medium">{list.warm_count}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={list.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(list.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteListButton listId={list.id} listName={list.name} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
