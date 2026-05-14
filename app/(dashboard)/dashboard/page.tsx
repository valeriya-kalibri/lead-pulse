import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { IndustryTemplate, ProspectList } from '@/types'
import { FALLBACK_TEMPLATES } from '@/lib/templates'
import DeleteListButton from './DeleteListButton'
import HubSpotImportModal from '@/components/HubSpotImportModal'
import HowItWorks from '@/components/HowItWorks'

function StatusPill({ status }: { status: ProspectList['status'] }) {
  const map = {
    pending: 'bg-gray-100 text-gray-600',
    processing: 'bg-blue-50 text-blue-600',
    complete: 'bg-green-50 text-green-700',
    error: 'bg-red-50 text-red-600',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: lists }, { data: usage }, { data: profile }, { data: templateRows }] =
    await Promise.all([
      supabase
        .from('prospect_lists')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('usage')
        .select('prospects_scraped')
        .eq('user_id', user!.id)
        .eq('month', new Date().toISOString().slice(0, 7))
        .single(),
      supabase
        .from('profiles')
        .select('plan, hubspot_access_token')
        .eq('id', user!.id)
        .single(),
      supabase.from('industry_templates').select('*').order('sort_order'),
    ])

  const scraped = usage?.prospects_scraped ?? 0
  const isPro = profile?.plan === 'pro'
  const hasHubspotKey = Boolean(profile?.hubspot_access_token)
  const limit = isPro ? null : 250

  const templates: IndustryTemplate[] =
    templateRows && templateRows.length > 0
      ? (templateRows as IndustryTemplate[])
      : (FALLBACK_TEMPLATES as IndustryTemplate[])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#2E3A59]">My Prospect Lists</h1>
          {limit && (
            <p className="text-sm text-gray-500 mt-0.5">
              {scraped} / {limit} prospects used this month
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <HubSpotImportModal
            userId={user!.id}
            isPro={isPro}
            hasHubspotKey={hasHubspotKey}
            templates={templates}
          />
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2E3A59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a4a6e] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New List
          </Link>
        </div>
      </div>

      <HowItWorks />

      {!lists || lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">No prospect lists yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload a CSV or import from HubSpot to get started</p>
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
              {lists.map((list: ProspectList) => (
                <tr key={list.id} className="hover:bg-gray-50 transition-colors">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
