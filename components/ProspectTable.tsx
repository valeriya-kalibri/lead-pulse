'use client'

import { useState, useMemo } from 'react'
import type { Prospect, IntelData } from '@/types'
import ScoreBadge from './ScoreBadge'
import ScrapeStatusBadge from './ScrapeStatusBadge'
import FilterBar, { type Filters } from './FilterBar'
import IntelCard from './IntelCard'

interface Props {
  prospects: Prospect[]
  listId: string
  keywords: string[]
  criteria: string[]
  isPro?: boolean
  hasHubspotKey?: boolean
  hubspotPortalId?: string | null
}

type SortKey = 'score' | 'business_name' | 'location_count' | 'scraped_at'
type SortDir = 'asc' | 'desc'

type EditableField = 'employee_count' | 'revenue_range' | 'city' | 'state'

interface EditState {
  id: string
  field: EditableField
  value: string
}

interface EditableCellProps {
  id: string
  field: EditableField
  displayValue: string | null
  editing: EditState | null
  onStartEdit: (id: string, field: EditableField, current: string | null) => void
  onSave: (state: EditState) => void
  onCancel: () => void
  onEditChange: (value: string) => void
}

function EditableCell({
  id,
  field,
  displayValue,
  editing,
  onStartEdit,
  onSave,
  onCancel,
  onEditChange,
}: EditableCellProps) {
  const isEditing = editing?.id === id && editing?.field === field

  if (isEditing) {
    return (
      <input
        autoFocus
        value={editing.value}
        onChange={(e) => onEditChange(e.target.value)}
        onBlur={() => onSave(editing)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(editing)
          if (e.key === 'Escape') onCancel()
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded border border-[#AABFFF] px-1.5 py-0.5 text-xs text-[#2E3A59] focus:outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      title="Click to edit"
      onClick={(e) => {
        e.stopPropagation()
        onStartEdit(id, field, displayValue)
      }}
      className="text-xs text-gray-600 hover:text-[#2E3A59] hover:underline text-left w-full"
    >
      {displayValue ?? <span className="text-gray-300">—</span>}
    </button>
  )
}

const SCORE_ORDER = { hot: 0, warm: 1, cold: 2 }

// All criteria that map to columns (used for colSpan calculation)
const ALL_COL_CRITERIA = [
  'chatbot',
  'contact_form',
  'services',
  'crm_emr',
  'locations',
  'online_booking',
  'analytics',
  'crm',
  'employee_count',
  'revenue_range',
  'city',
  'state',
]

interface SyncToast {
  synced: number
  failed: number
}

export default function ProspectTable({
  prospects: initial,
  listId,
  criteria,
  isPro,
  hasHubspotKey,
  hubspotPortalId,
}: Props) {
  const [prospects, setProspects] = useState<Prospect[]>(initial)
  const [filters, setFilters] = useState<Filters>({
    score: 'all',
    hasChat: 'all',
    hasBooking: 'all',
    search: '',
    city: '',
    state: '',
  })
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'score', dir: 'asc' })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [loadingIntel, setLoadingIntel] = useState<string | null>(null)
  const [openIntel, setOpenIntel] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const [syncToast, setSyncToast] = useState<SyncToast | null>(null)

  // 5 fixed columns (Checkbox, Score, Intel/Hook, Business, URL) + 1 per active criterion
  const colCount = 5 + ALL_COL_CRITERIA.filter((c) => criteria.includes(c)).length

  async function generateIntel(prospectId: string, refresh = false) {
    setLoadingIntel(prospectId)
    try {
      const url = `/api/prospects/${prospectId}/intel${refresh ? '?refresh=1' : ''}`
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Intel generation failed: ${error}`)
        return
      }
      const intel: IntelData = await res.json()
      setProspects((prev) =>
        prev.map((p) =>
          p.id === prospectId
            ? { ...p, intel, intel_generated_at: new Date().toISOString(), outreach_hook: intel.outreach_hook }
            : p
        )
      )
      setOpenIntel(prospectId)
    } catch {
      alert('Intel generation failed — check your network connection.')
    } finally {
      setLoadingIntel(null)
    }
  }

  const uniqueCities = useMemo(() => {
    const set = new Set<string>()
    for (const p of prospects) if (p.city) set.add(p.city)
    return Array.from(set).sort()
  }, [prospects])

  const uniqueStates = useMemo(() => {
    const set = new Set<string>()
    for (const p of prospects) if (p.state) set.add(p.state)
    return Array.from(set).sort()
  }, [prospects])

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      if (filters.score !== 'all' && p.score !== filters.score) return false
      if (criteria.includes('chatbot')) {
        if (filters.hasChat === 'yes' && p.has_chatbot !== 'yes') return false
        if (filters.hasChat === 'no' && p.has_chatbot !== 'no') return false
      }
      if (criteria.includes('online_booking')) {
        if (filters.hasBooking === 'yes' && p.has_online_booking !== 'yes') return false
        if (filters.hasBooking === 'no' && p.has_online_booking !== 'no') return false
      }
      if (criteria.includes('city') && filters.city) {
        if (p.city !== filters.city) return false
      }
      if (criteria.includes('state') && filters.state) {
        if (p.state !== filters.state) return false
      }
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !p.website_url.toLowerCase().includes(q) &&
          !p.business_name?.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [prospects, filters, criteria])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      if (sort.key === 'score') return (SCORE_ORDER[a.score] - SCORE_ORDER[b.score]) * dir
      if (sort.key === 'location_count')
        return ((a.location_count ?? 0) - (b.location_count ?? 0)) * dir
      const av = (a[sort.key] ?? '') as string
      const bv = (b[sort.key] ?? '') as string
      return av.localeCompare(bv) * dir
    })
  }, [filtered, sort])

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }

  function startEdit(id: string, field: EditableField, current: string | null) {
    setEditing({ id, field, value: current ?? '' })
  }

  async function saveEdit(state: EditState) {
    setEditing(null)
    setProspects((prev) =>
      prev.map((p) =>
        p.id === state.id ? { ...p, [state.field]: state.value || null } : p
      )
    )
    fetch(`/api/prospects/${state.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [state.field]: state.value || null }),
    }).catch(console.error)
  }

  async function handleHubSpotSync() {
    const idsToSync =
      selectedIds.size > 0
        ? Array.from(selectedIds)
        : prospects.filter((p) => p.score === 'hot' || p.score === 'warm').map((p) => p.id)

    if (idsToSync.length === 0) return

    setSyncing(true)
    try {
      const res = await fetch('/api/hubspot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_ids: idsToSync, list_id: listId }),
      })
      const json = await res.json()

      if (res.ok) {
        const syncedSet = new Set<string>(json.synced_ids ?? [])
        const now = new Date().toISOString()
        setProspects((prev) =>
          prev.map((p) => (syncedSet.has(p.id) ? { ...p, hubspot_synced_at: now } : p))
        )
        setSyncToast({ synced: json.synced, failed: json.failed ?? 0 })
        setTimeout(() => setSyncToast(null), 6000)
      } else {
        alert(json.error ?? 'Sync failed.')
      }
    } catch {
      alert('Sync failed — check your network connection.')
    } finally {
      setSyncing(false)
      setSelectedIds(new Set())
    }
  }

  function toggleSelectAll() {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sorted.map((p) => p.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function SortTh({ col, label }: { col: SortKey; label: string }) {
    const active = sort.key === col
    return (
      <th
        className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-[#2E3A59] whitespace-nowrap"
        onClick={() => toggleSort(col)}
      >
        {label}
        {active && (
          <span className="ml-1 text-[#AABFFF]">{sort.dir === 'asc' ? '↑' : '↓'}</span>
        )}
      </th>
    )
  }

  if (prospects.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
        <p className="text-sm text-gray-400">
          No prospects yet. Processing may still be in progress.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Sync toast */}
      {syncToast && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          <span className="font-semibold">{syncToast.synced} contacts synced to HubSpot.</span>
          {syncToast.failed > 0 && (
            <span className="text-red-600">{syncToast.failed} failed.</span>
          )}
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          criteria={criteria}
          cities={uniqueCities}
          states={uniqueStates}
        />
        <div className="flex items-center gap-2">
          {isPro && (
            hasHubspotKey ? (
              <button
                type="button"
                onClick={handleHubSpotSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:border-orange-400 hover:bg-orange-100 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.5 11.5a1 1 0 0 1-1 1h-8v8a1 1 0 0 1-2 0v-8h-8a1 1 0 0 1 0-2h8v-8a1 1 0 0 1 2 0v8h8a1 1 0 0 1 1 1Z" />
                </svg>
                {syncing
                  ? 'Syncing…'
                  : selectedIds.size > 0
                    ? `Sync to HubSpot (${selectedIds.size})`
                    : 'Sync Hot + Warm'}
              </button>
            ) : (
              <a
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-[#2E3A59] hover:text-[#2E3A59] transition-colors whitespace-nowrap"
              >
                Add HubSpot API Key
              </a>
            )
          )}
          <a
            href={`/api/prospects/export?list_id=${listId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-[#2E3A59] hover:text-[#2E3A59] transition-colors whitespace-nowrap"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export CSV
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-50 text-xs text-gray-400">
          {sorted.length} of {prospects.length} prospects
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={sorted.length > 0 && selectedIds.size === sorted.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-[#2E3A59] focus:ring-[#AABFFF]"
                  />
                </th>
                <SortTh col="score" label="Score" />
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                  ⚡ Intel
                </th>
                <SortTh col="business_name" label="Business" />
                <th className="text-left px-4 py-3 font-medium text-gray-500">URL</th>
                {criteria.includes('chatbot') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Chatbot</th>
                )}
                {criteria.includes('contact_form') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    Contact Form
                  </th>
                )}
                {criteria.includes('services') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Services</th>
                )}
                {criteria.includes('crm_emr') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    CRM / EMR
                  </th>
                )}
                {criteria.includes('locations') && (
                  <SortTh col="location_count" label="Locs" />
                )}
                {criteria.includes('online_booking') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    Has Booking
                  </th>
                )}
                {criteria.includes('analytics') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Analytics</th>
                )}
                {criteria.includes('crm') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500">CRM</th>
                )}
                {criteria.includes('employee_count') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Employees</th>
                )}
                {criteria.includes('revenue_range') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Revenue</th>
                )}
                {criteria.includes('city') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500">City</th>
                )}
                {criteria.includes('state') && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500">State</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((p) => (
                <>
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  >
                    <td className="px-4 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded border-gray-300 text-[#2E3A59] focus:ring-[#AABFFF]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={p.score} />
                    </td>

                    {/* Intel column */}
                    <td
                      className="px-4 py-3 max-w-[220px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.score !== 'cold' ? (
                        p.intel ? (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                              {p.intel.outreach_hook}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setOpenIntel(openIntel === p.id ? null : p.id)}
                                className="text-xs font-medium text-[#AABFFF] hover:text-[#2E3A59] transition-colors"
                              >
                                {openIntel === p.id ? 'Close' : 'View Intel'}
                              </button>
                              <button
                                type="button"
                                title="Regenerate"
                                onClick={() => generateIntel(p.id, true)}
                                disabled={loadingIntel === p.id}
                                className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
                              >
                                ↻
                              </button>
                            </div>
                          </div>
                        ) : loadingIntel === p.id ? (
                          <span className="text-xs text-[#AABFFF] animate-pulse">
                            Researching prospect…
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => generateIntel(p.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#AABFFF]/40 bg-[#F5F7FF] px-2.5 py-1 text-xs font-medium text-[#2E3A59] hover:border-[#AABFFF] hover:bg-[#AABFFF]/10 transition-colors whitespace-nowrap"
                          >
                            ⚡ Generate Intel
                          </button>
                        )
                      ) : (
                        <span className="text-gray-200 text-xs select-none">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <ScrapeStatusBadge
                          status={p.scrape_status}
                          errorType={p.error_type}
                          errorMessage={p.scrape_error}
                        />
                        <span className="font-medium text-[#2E3A59] truncate">
                          {p.business_name ?? <span className="text-gray-300">—</span>}
                        </span>
                        {p.hubspot_synced_at && (
                          p.hubspot_contact_id && hubspotPortalId ? (
                            <a
                              href={`https://app.hubspot.com/contacts/${hubspotPortalId}/contact/${p.hubspot_contact_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="View in HubSpot"
                              className="shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            >
                              HS
                            </a>
                          ) : (
                            <span
                              title={`Synced to HubSpot`}
                              className="shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700"
                            >
                              HS
                            </span>
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <a
                        href={p.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#2E3A59] hover:underline truncate block text-xs"
                      >
                        {p.website_url.replace(/^https?:\/\//, '')}
                      </a>
                    </td>
                    {criteria.includes('chatbot') && (
                      <td className="px-4 py-3">
                        {p.has_chatbot === 'yes' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            {p.chatbot_platform ?? 'Yes'}
                          </span>
                        ) : p.has_chatbot === 'no' ? (
                          <span className="text-xs text-green-600">No</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    {criteria.includes('contact_form') && (
                      <td className="px-4 py-3">
                        {p.has_contact_form === 'yes' ? (
                          <span className="text-xs text-amber-600">Yes</span>
                        ) : p.has_contact_form === 'no' ? (
                          <span className="text-xs text-gray-400">No</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    {criteria.includes('services') && (
                      <td className="px-4 py-3 max-w-[160px]">
                        {p.high_ticket_services?.length ? (
                          <span className="text-xs text-gray-600 truncate block">
                            {p.high_ticket_services.slice(0, 2).join(', ')}
                            {p.high_ticket_services.length > 2 &&
                              ` +${p.high_ticket_services.length - 2}`}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">none</span>
                        )}
                      </td>
                    )}
                    {criteria.includes('crm_emr') && (
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {p.crm_emr_platform ?? <span className="text-gray-300">—</span>}
                      </td>
                    )}
                    {criteria.includes('locations') && (
                      <td className="px-4 py-3 tabular-nums text-center text-gray-600 text-xs">
                        {p.location_count ?? '—'}
                      </td>
                    )}
                    {criteria.includes('online_booking') && (
                      <td className="px-4 py-3">
                        {p.has_online_booking === 'yes' ? (
                          <span className="text-xs text-green-600">Yes</span>
                        ) : p.has_online_booking === 'no' ? (
                          <span className="text-xs text-gray-400">No</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    {criteria.includes('analytics') && (
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {p.analytics_platform ?? <span className="text-gray-300">—</span>}
                      </td>
                    )}
                    {criteria.includes('crm') && (
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {p.crm_platform ?? <span className="text-gray-300">—</span>}
                      </td>
                    )}
                    {criteria.includes('employee_count') && (
                      <td className="px-4 py-3 w-24">
                        <EditableCell
                          id={p.id}
                          field="employee_count"
                          displayValue={p.employee_count}
                          editing={editing}
                          onStartEdit={startEdit}
                          onSave={saveEdit}
                          onCancel={() => setEditing(null)}
                          onEditChange={(v) =>
                            setEditing((e) => (e ? { ...e, value: v } : null))
                          }
                        />
                      </td>
                    )}
                    {criteria.includes('revenue_range') && (
                      <td className="px-4 py-3 w-28">
                        <EditableCell
                          id={p.id}
                          field="revenue_range"
                          displayValue={p.revenue_range}
                          editing={editing}
                          onStartEdit={startEdit}
                          onSave={saveEdit}
                          onCancel={() => setEditing(null)}
                          onEditChange={(v) =>
                            setEditing((e) => (e ? { ...e, value: v } : null))
                          }
                        />
                      </td>
                    )}
                    {criteria.includes('city') && (
                      <td className="px-4 py-3 w-28">
                        <EditableCell
                          id={p.id}
                          field="city"
                          displayValue={p.city}
                          editing={editing}
                          onStartEdit={startEdit}
                          onSave={saveEdit}
                          onCancel={() => setEditing(null)}
                          onEditChange={(v) =>
                            setEditing((e) => (e ? { ...e, value: v } : null))
                          }
                        />
                      </td>
                    )}
                    {criteria.includes('state') && (
                      <td className="px-4 py-3 w-24">
                        <EditableCell
                          id={p.id}
                          field="state"
                          displayValue={p.state}
                          editing={editing}
                          onStartEdit={startEdit}
                          onSave={saveEdit}
                          onCancel={() => setEditing(null)}
                          onEditChange={(v) =>
                            setEditing((e) => (e ? { ...e, value: v } : null))
                          }
                        />
                      </td>
                    )}
                  </tr>

                  {openIntel === p.id && p.intel && (
                    <tr key={`${p.id}-intel`}>
                      <td colSpan={colCount} className="border-b border-amber-100 bg-amber-50/30 px-6 py-5">
                        <IntelCard intel={p.intel} />
                      </td>
                    </tr>
                  )}

                  {expanded === p.id && (
                    <tr key={`${p.id}-exp`} className="bg-[#F5F7FF]">
                      <td colSpan={colCount} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">

                          {/* Contact info from CSV */}
                          {(p.contact_name || p.email || p.phone || p.city || p.state) && (
                            <div className="col-span-2 grid grid-cols-2 gap-3 pb-3 mb-1 border-b border-gray-200">
                              {p.contact_name && (
                                <div>
                                  <p className="font-medium text-[#2E3A59] mb-0.5">Contact</p>
                                  <p className="text-gray-500">{p.contact_name}</p>
                                </div>
                              )}
                              {p.email && (
                                <div>
                                  <p className="font-medium text-[#2E3A59] mb-0.5">Email</p>
                                  <a
                                    href={`mailto:${p.email}`}
                                    className="text-[#2E3A59] hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {p.email}
                                  </a>
                                </div>
                              )}
                              {p.phone && (
                                <div>
                                  <p className="font-medium text-[#2E3A59] mb-0.5">Phone</p>
                                  <p className="text-gray-500">{p.phone}</p>
                                </div>
                              )}
                              {(p.city || p.state) && (
                                <div>
                                  <p className="font-medium text-[#2E3A59] mb-0.5">Location</p>
                                  <p className="text-gray-500">
                                    {[p.city, p.state].filter(Boolean).join(', ')}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Qualification signals */}
                          <div>
                            <p className="font-medium text-[#2E3A59] mb-1">Score reason</p>
                            <p className="text-gray-500">{p.score_reason ?? '—'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-[#2E3A59] mb-1">Outreach hook</p>
                            <p className="text-gray-500">{p.outreach_hook ?? '—'}</p>
                          </div>
                          {p.high_ticket_services?.length ? (
                            <div>
                              <p className="font-medium text-[#2E3A59] mb-1">
                                All services detected
                              </p>
                              <p className="text-gray-500">
                                {p.high_ticket_services.join(', ')}
                              </p>
                            </div>
                          ) : null}
                          {p.crm_emr_platform && (
                            <div>
                              <p className="font-medium text-[#2E3A59] mb-1">CRM / EMR platform</p>
                              <p className="text-gray-500">{p.crm_emr_platform}</p>
                            </div>
                          )}
                          {p.crm_platform && (
                            <div>
                              <p className="font-medium text-[#2E3A59] mb-1">CRM</p>
                              <p className="text-gray-500">{p.crm_platform}</p>
                            </div>
                          )}
                          {p.scrape_error && (
                            <div>
                              <p className="font-medium text-red-500 mb-1">Scrape error</p>
                              <p className="text-gray-500">{p.scrape_error}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
