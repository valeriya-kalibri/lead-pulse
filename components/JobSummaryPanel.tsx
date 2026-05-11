'use client'

import { useState } from 'react'
import type { ScrapeJob } from '@/types'

const ERROR_TYPE_LABELS: Record<string, string> = {
  TIMEOUT: 'Timed out',
  BLOCKED: 'Blocked / 403',
  DNS_FAILED: 'DNS failed',
  PARSE_ERROR: 'Parse error',
  SSL_ERROR: 'SSL error',
  EMPTY_PAGE: 'Empty page (SPA)',
  UNKNOWN: 'Unknown',
}

function fmt(ms: number | null): string {
  if (ms === null) return '—'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function JobSummaryPanel({ job }: { job: ScrapeJob }) {
  const [open, setOpen] = useState(true)
  if (job.status !== 'complete') return null

  const s = job.error_summary
  const succeeded = s?.succeeded ?? job.processed_urls - job.failed_urls
  const failed = s?.failed ?? job.failed_urls
  const skipped = s?.skipped ?? 0
  const errorEntries = Object.entries(s?.by_error_type ?? {}).filter(([, n]) => n > 0)

  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-3 text-xs">
          <span className="font-medium text-[#2E3A59]">Scrape Complete</span>
          <span className="text-green-600 font-medium">{succeeded} scraped</span>
          {failed > 0 && <span className="text-red-500">{failed} failed</span>}
          {skipped > 0 && <span className="text-gray-400">{skipped} skipped</span>}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-50 px-4 py-4 grid grid-cols-2 gap-x-8 gap-y-3 text-xs sm:grid-cols-4">
          <div>
            <p className="text-gray-400 mb-0.5">Total submitted</p>
            <p className="font-semibold text-[#2E3A59] tabular-nums">{job.total_urls}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Successfully scraped</p>
            <p className="font-semibold text-green-600 tabular-nums">{succeeded}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Failed</p>
            <p className={`font-semibold tabular-nums ${failed > 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {failed}
            </p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Skipped (dupes)</p>
            <p className="font-semibold text-gray-400 tabular-nums">{skipped}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Avg scrape time</p>
            <p className="font-semibold text-[#2E3A59]">{fmt(s?.avg_scrape_ms ?? null)}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Completed</p>
            <p className="font-semibold text-[#2E3A59]">{fmtDate(job.completed_at)}</p>
          </div>

          {errorEntries.length > 0 && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-gray-50">
              <p className="text-gray-400 mb-1.5">Errors by type</p>
              <div className="flex flex-wrap gap-2">
                {errorEntries.map(([type, count]) => (
                  <span
                    key={type}
                    className="rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs text-red-600"
                  >
                    {ERROR_TYPE_LABELS[type] ?? type} — {count}
                    {type === 'EMPTY_PAGE' && (
                      <span className="ml-1 text-gray-400">(may need headless browser)</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
