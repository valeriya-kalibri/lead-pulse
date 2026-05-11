'use client'

import { useState, useMemo } from 'react'
import Papa from 'papaparse'
import type { ErrorType } from '@/types'

export interface ErrorProspect {
  id: string
  website_url: string
  business_name: string | null
  error_type: ErrorType | null
  scrape_error: string | null
  scraped_at: string | null
  list_id: string
  list_name: string | null
}

const ERROR_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All error types' },
  { value: 'TIMEOUT', label: 'TIMEOUT' },
  { value: 'BLOCKED', label: 'BLOCKED' },
  { value: 'DNS_FAILED', label: 'DNS_FAILED' },
  { value: 'EMPTY_PAGE', label: 'EMPTY_PAGE' },
  { value: 'SSL_ERROR', label: 'SSL_ERROR' },
  { value: 'PARSE_ERROR', label: 'PARSE_ERROR' },
  { value: 'UNKNOWN', label: 'UNKNOWN' },
]

const ERROR_TYPE_COLORS: Record<string, string> = {
  TIMEOUT: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  BLOCKED: 'bg-orange-50 text-orange-700 border-orange-200',
  DNS_FAILED: 'bg-red-50 text-red-700 border-red-200',
  EMPTY_PAGE: 'bg-purple-50 text-purple-700 border-purple-200',
  SSL_ERROR: 'bg-red-50 text-red-700 border-red-200',
  PARSE_ERROR: 'bg-blue-50 text-blue-700 border-blue-200',
  UNKNOWN: 'bg-gray-50 text-gray-600 border-gray-200',
}

export default function DebugErrorLog({ items }: { items: ErrorProspect[] }) {
  const [filterType, setFilterType] = useState('all')
  const [filterList, setFilterList] = useState('all')
  const [search, setSearch] = useState('')

  const uniqueLists = useMemo(() => {
    const seen = new Set<string>()
    const out: Array<{ id: string; name: string }> = []
    for (const item of items) {
      if (!seen.has(item.list_id)) {
        seen.add(item.list_id)
        out.push({ id: item.list_id, name: item.list_name ?? item.list_id })
      }
    }
    return out
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterType !== 'all' && item.error_type !== filterType) return false
      if (filterList !== 'all' && item.list_id !== filterList) return false
      if (search) {
        const q = search.toLowerCase()
        if (!item.website_url.toLowerCase().includes(q) && !item.business_name?.toLowerCase().includes(q))
          return false
      }
      return true
    })
  }, [items, filterType, filterList, search])

  function exportCSV() {
    const rows = filtered.map((item) => ({
      url: item.website_url,
      business: item.business_name ?? '',
      list: item.list_name ?? '',
      error_type: item.error_type ?? '',
      error_message: item.scrape_error ?? '',
      scraped_at: item.scraped_at ?? '',
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'leadpulse_error_log.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search URL or business…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs w-52 focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
        >
          {ERROR_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterList}
          onChange={(e) => setFilterList(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
        >
          <option value="all">All lists</option>
          {uniqueLists.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <button
          onClick={exportCSV}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-[#2E3A59] hover:text-[#2E3A59] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-3">{filtered.length} of {items.length} errors</p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-100 py-10 text-center text-sm text-gray-400">
          No errors match your filters.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap">URL</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500">Business</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500">List</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap">Error Type</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500">Details</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap">Scraped At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <a
                        href={item.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2E3A59] hover:underline truncate block"
                      >
                        {item.website_url.replace(/^https?:\/\//, '')}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-[140px] truncate">
                      {item.business_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[120px] truncate">
                      {item.list_name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        {item.error_type && (
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold w-fit ${ERROR_TYPE_COLORS[item.error_type] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}
                          >
                            {item.error_type}
                          </span>
                        )}
                        {item.error_type === 'EMPTY_PAGE' && (
                          <span className="text-[10px] text-purple-500 leading-tight">
                            May require headless browser rendering
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 max-w-[240px]">
                      <span className="truncate block" title={item.scrape_error ?? undefined}>
                        {item.scrape_error ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                      {item.scraped_at
                        ? new Date(item.scraped_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
