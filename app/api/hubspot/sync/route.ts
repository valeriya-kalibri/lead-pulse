import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  ensureCustomProperties,
  getPortalId,
  buildFilterSummary,
  syncSingleProspect,
} from '@/lib/hubspot'
import type { Prospect, ProspectList } from '@/types'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data: profile } = await db
    .from('profiles')
    .select('plan, hubspot_api_key, hubspot_portal_id')
    .eq('id', user.id)
    .single()

  if (profile?.plan !== 'pro') {
    return NextResponse.json({ error: 'HubSpot sync requires a Pro plan.' }, { status: 403 })
  }
  if (!profile.hubspot_api_key) {
    return NextResponse.json(
      { error: 'No HubSpot API key configured. Add it in Settings.' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const prospect_ids: string[] = body.prospect_ids
  const list_id: string = body.list_id

  if (!list_id || !Array.isArray(prospect_ids) || prospect_ids.length === 0) {
    return NextResponse.json({ error: 'Missing list_id or prospect_ids' }, { status: 400 })
  }

  const { data: list } = await db
    .from('prospect_lists')
    .select('*')
    .eq('id', list_id)
    .eq('user_id', user.id)
    .single()
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

  const { data: prospects } = await db
    .from('prospects')
    .select('*')
    .in('id', prospect_ids)
    .eq('user_id', user.id)
    .eq('scrape_status', 'complete')

  if (!prospects || prospects.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, errors: [], synced_ids: [] })
  }

  const apiKey = profile.hubspot_api_key as string

  // Create any missing custom properties (idempotent)
  await ensureCustomProperties(apiKey)

  // Cache the portal ID in profiles if we don't have it yet
  let portalId: string | null = profile.hubspot_portal_id ?? null
  if (!portalId) {
    portalId = await getPortalId(apiKey)
    if (portalId) {
      await db.from('profiles').update({ hubspot_portal_id: portalId }).eq('id', user.id)
    }
  }

  // Build and persist the list-level filter summary
  const filterSummary = buildFilterSummary(list as ProspectList)
  await db.from('prospect_lists').update({ filter_summary: filterSummary }).eq('id', list_id)

  let synced = 0
  let failed = 0
  const errors: string[] = []
  const synced_ids: string[] = []

  for (let i = 0; i < prospects.length; i++) {
    if (i > 0) await delay(200)

    const prospect = prospects[i] as Prospect

    try {
      const result = await syncSingleProspect(apiKey, prospect, list.name as string, filterSummary)

      await db
        .from('prospects')
        .update({
          hubspot_contact_id: result.contactId,
          hubspot_company_id: result.companyId,
          hubspot_note_id: result.noteId,
          hubspot_synced_at: new Date().toISOString(),
        })
        .eq('id', prospect.id)

      synced++
      synced_ids.push(prospect.id)
    } catch (err) {
      failed++
      errors.push(
        `${prospect.business_name ?? prospect.website_url}: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      )
    }
  }

  // Track usage
  const month = new Date().toISOString().slice(0, 7)
  await db.rpc('increment_hubspot_usage', { p_user_id: user.id, p_month: month, p_count: synced })

  return NextResponse.json({ synced, failed, errors, synced_ids })
}
