import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ALL_CRITERIA } from '@/lib/criteria'
import type { Prospect, ProspectList, ScrapeJob } from '@/types'
import ProspectTable from '@/components/ProspectTable'
import JobSummaryPanel from '@/components/JobSummaryPanel'
import ListActions from './ListActions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ListPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: list }, { data: prospects }, { data: job }, { data: profile }] =
    await Promise.all([
      supabase.from('prospect_lists').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase
        .from('prospects')
        .select('*')
        .eq('list_id', id)
        .order('score', { ascending: false })
        .order('created_at'),
      supabase
        .from('scrape_jobs')
        .select('*')
        .eq('list_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('plan, hubspot_access_token, hubspot_portal_id')
        .eq('id', user.id)
        .single(),
    ])

  if (!list) notFound()

  const pl = list as ProspectList
  const ps = (prospects ?? []) as Prospect[]
  const sj = job as ScrapeJob | null
  const criteria = pl.selected_criteria ?? ALL_CRITERIA
  const isPro = profile?.plan === 'pro'
  const hasHubspotKey = Boolean(profile?.hubspot_access_token)
  const hubspotPortalId = (profile?.hubspot_portal_id as string | null) ?? null

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#2E3A59]">{pl.name}</h1>
          {pl.industry_name && (
            <p className="text-sm text-gray-400 mt-0.5">{pl.industry_name}</p>
          )}
        </div>
        <ListActions
          listId={pl.id}
          listName={pl.name}
          userId={user.id}
          prospectIds={ps.filter((p) => p.scrape_status === 'complete').map((p) => p.id)}
          isPro={isPro}
          hasHubspotKey={hasHubspotKey}
        />
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: pl.total_prospects, color: 'text-[#2E3A59]' },
          { label: 'Hot', value: pl.hot_count, color: 'text-red-600' },
          { label: 'Warm', value: pl.warm_count, color: 'text-yellow-600' },
          { label: 'Cold', value: pl.cold_count, color: 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Job progress bar — while processing */}
      {sj && sj.status !== 'complete' && (
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-6 shadow-sm">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>
              {sj.status === 'queued' ? 'Queued' : 'Processing…'} — {sj.processed_urls} /{' '}
              {sj.total_urls}
            </span>
            <span>{sj.failed_urls > 0 && `${sj.failed_urls} failed`}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#AABFFF] rounded-full transition-all"
              style={{
                width: `${sj.total_urls ? (sj.processed_urls / sj.total_urls) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Job summary — after completion */}
      {sj && <JobSummaryPanel job={sj} />}

      <ProspectTable
        prospects={ps}
        listId={pl.id}
        userId={user.id}
        keywords={pl.service_keywords}
        criteria={criteria}
        isPro={isPro}
        hasHubspotKey={hasHubspotKey}
        hubspotPortalId={hubspotPortalId}
      />
    </div>
  )
}
