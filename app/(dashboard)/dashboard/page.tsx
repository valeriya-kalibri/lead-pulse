import { createClient } from '@/lib/supabase/server'
import type { IndustryTemplate, ProspectList } from '@/types'
import { FALLBACK_TEMPLATES } from '@/lib/templates'
import HowItWorks from '@/components/HowItWorks'
import HowEmailSequencingWorks from '@/components/HowEmailSequencingWorks'
import HubSpotApolloFieldGuide from '@/components/HubSpotApolloFieldGuide'
import DashboardListsPanel from '@/components/DashboardListsPanel'

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
      </div>

      <HowItWorks />
      <HowEmailSequencingWorks />
      <HubSpotApolloFieldGuide />

      <DashboardListsPanel
        lists={(lists ?? []) as ProspectList[]}
        userId={user!.id}
        isPro={isPro}
        hasHubspotKey={hasHubspotKey}
        templates={templates}
      />
    </div>
  )
}
