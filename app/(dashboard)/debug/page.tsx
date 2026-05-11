import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ScrapeJob, ErrorType, ErrorSummary } from '@/types'
import DebugErrorLog, { type ErrorProspect } from './DebugErrorLog'

function pct(n: number, total: number) {
  if (total === 0) return '0%'
  return `${((n / total) * 100).toFixed(1)}%`
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default async function DebugPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch scrape jobs with list names
  const { data: rawJobs } = await supabase
    .from('scrape_jobs')
    .select('*, prospect_lists(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch error prospects with list names
  const { data: rawErrors } = await supabase
    .from('prospects')
    .select('id, website_url, business_name, error_type, scrape_error, scraped_at, list_id, prospect_lists(name)')
    .eq('user_id', user.id)
    .eq('scrape_status', 'error')
    .order('scraped_at', { ascending: false })
    .limit(500)

  type RawJob = ScrapeJob & { prospect_lists: { name: string } | null }
  const jobs = (rawJobs ?? []) as RawJob[]

  const errorProspects: ErrorProspect[] = (rawErrors ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    website_url: p.website_url as string,
    business_name: p.business_name as string | null,
    error_type: p.error_type as ErrorType | null,
    scrape_error: p.scrape_error as string | null,
    scraped_at: p.scraped_at as string | null,
    list_id: p.list_id as string,
    list_name: (p.prospect_lists as { name: string } | null)?.name ?? null,
  }))

  return (
    <div className="p-8 max-w-7xl">
      <h1 className="text-xl font-semibold text-[#2E3A59] mb-1">Debug Panel</h1>
      <p className="text-sm text-gray-400 mb-8">Internal scrape job history and error tracking.</p>

      {/* Jobs table */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-[#2E3A59] mb-3">Scrape Jobs</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-400">No scrape jobs found.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-500">List</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">Total</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">Succeeded</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">Failed</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">Skipped</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">Error Rate</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">Avg Time</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {jobs.map((job) => {
                    const s = job.error_summary as ErrorSummary | null
                    const succeeded = s?.succeeded ?? (job.processed_urls - job.failed_urls)
                    const failed = job.failed_urls
                    const skipped = s?.skipped ?? 0
                    const avgMs = s?.avg_scrape_ms ?? null
                    const statusColors: Record<string, string> = {
                      complete: 'text-green-600',
                      running: 'text-yellow-600',
                      error: 'text-red-500',
                      queued: 'text-gray-400',
                    }
                    return (
                      <tr key={job.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-[#2E3A59] max-w-[180px] truncate">
                          {job.prospect_lists?.name ?? '—'}
                        </td>
                        <td className={`px-4 py-2.5 font-medium ${statusColors[job.status] ?? 'text-gray-400'}`}>
                          {job.status}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{job.total_urls}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-green-600 font-medium">{succeeded}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${failed > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {failed}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-400">{skipped}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${failed / job.total_urls > 0.2 ? 'text-red-500' : 'text-gray-500'}`}>
                          {pct(failed, job.total_urls)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-500">
                          {avgMs !== null ? (avgMs >= 1000 ? `${(avgMs / 1000).toFixed(1)}s` : `${avgMs}ms`) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                          {fmtDate(job.completed_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Error log */}
      <section>
        <h2 className="text-sm font-semibold text-[#2E3A59] mb-3">
          Error Log
          <span className="ml-2 text-xs font-normal text-gray-400">({errorProspects.length} total)</span>
        </h2>
        <DebugErrorLog items={errorProspects} />
      </section>
    </div>
  )
}
