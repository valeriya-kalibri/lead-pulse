import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { OFFERS, otherOffer } from '@/lib/offers'
import { scoreProspect } from '@/lib/scraper/score'
import type { OfferType } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: Props) {
  const { id: sourceListId } = await params

  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Fetch source list — verify ownership
  const { data: sourceList } = await db
    .from('prospect_lists')
    .select('*')
    .eq('id', sourceListId)
    .eq('user_id', user.id)
    .single()

  if (!sourceList) return NextResponse.json({ error: 'List not found' }, { status: 404 })

  // Determine the new offer type — always the opposite of the source
  const newOfferType: OfferType = otherOffer(sourceList.offer_type as OfferType ?? 'lead_capture')
  const newOfferConfig = OFFERS[newOfferType]

  // Fetch all scraped prospects from the source list
  const { data: sourceProspects } = await db
    .from('prospects')
    .select('*')
    .eq('list_id', sourceListId)
    .eq('scrape_status', 'complete')

  if (!sourceProspects || sourceProspects.length === 0) {
    return NextResponse.json({ error: 'No scraped prospects to clone' }, { status: 400 })
  }

  // Create the new list
  const newListName = `${sourceList.name} — ${newOfferConfig.label}`
  const { data: newList, error: listErr } = await db
    .from('prospect_lists')
    .insert({
      user_id: user.id,
      name: newListName,
      industry_name: sourceList.industry_name,
      industry_template_id: sourceList.industry_template_id,
      service_keywords: sourceList.service_keywords,
      selected_criteria: newOfferConfig.defaultCriteria,
      offer_type: newOfferType,
      status: 'complete',
      total_prospects: sourceProspects.length,
    })
    .select('id')
    .single()

  if (listErr || !newList) {
    return NextResponse.json({ error: 'Failed to create cloned list' }, { status: 500 })
  }

  // Re-score each prospect through the new offer's lens and copy rows
  let hot = 0, warm = 0, cold = 0

  const inserts = sourceProspects.map((p) => {
    const scored = scoreProspect({
      hasChat: p.has_chatbot ?? 'unknown',
      chatPlatform: p.chatbot_platform ?? null,
      hasOnlineBooking: p.has_online_booking ?? 'unknown',
      hasContactForm: p.has_contact_form ?? 'unknown',
      highTicketServices: p.high_ticket_services ?? [],
      analyticsPlatform: p.analytics_platform ?? null,
      locationCount: p.location_count ?? null,
      isMultiLocation: p.is_multi_location ?? null,
      revenueRange: p.revenue_range ?? null,
      employeeCount: p.employee_count ?? null,
      crmEmrPlatform: p.crm_emr_platform ?? null,
      criteria: newOfferConfig.defaultCriteria,
      offerType: newOfferType,
    })

    if (scored.score === 'hot') hot++
    else if (scored.score === 'warm') warm++
    else cold++

    return {
      list_id: newList.id,
      user_id: user.id,
      // Contact / company fields
      website_url: p.website_url,
      business_name: p.business_name,
      contact_name: p.contact_name,
      email: p.email,
      phone: p.phone,
      city: p.city,
      state: p.state,
      employee_count: p.employee_count,
      revenue_range: p.revenue_range,
      // Scraped detection data — carried over as-is, no re-scraping
      has_chatbot: p.has_chatbot,
      chatbot_platform: p.chatbot_platform,
      has_contact_form: p.has_contact_form,
      has_online_booking: p.has_online_booking,
      crm_emr_platform: p.crm_emr_platform,
      crm_platform: p.crm_platform,
      high_ticket_services: p.high_ticket_services,
      location_count: p.location_count,
      is_multi_location: p.is_multi_location,
      analytics_platform: p.analytics_platform,
      scrape_status: 'complete' as const,
      scrape_source: p.scrape_source,
      scraped_at: p.scraped_at,
      // Fresh score for the new offer
      score: scored.score,
      score_reason: scored.score_reason,
      outreach_hook: scored.outreach_hook,
      // AI-generated fields cleared — must be regenerated for the new offer
      intel: null,
      intel_generated_at: null,
      outreach_email_subject_1: null,
      outreach_email_body_1: null,
      outreach_email_subject_2: null,
      outreach_email_body_2: null,
      outreach_email_subject_3: null,
      outreach_email_body_3: null,
      sequence_generated_at: null,
      apollo_sequence_status: 'not_enrolled' as const,
      // HubSpot IDs not carried over — this is a fresh list
      hubspot_contact_id: null,
      hubspot_company_id: null,
      hubspot_synced_at: null,
    }
  })

  const { error: insertErr } = await db.from('prospects').insert(inserts)

  if (insertErr) {
    // Clean up the empty list on failure
    await db.from('prospect_lists').delete().eq('id', newList.id)
    return NextResponse.json({ error: `Failed to copy prospects: ${insertErr.message}` }, { status: 500 })
  }

  // Update list score counts
  await db
    .from('prospect_lists')
    .update({ hot_count: hot, warm_count: warm, cold_count: cold })
    .eq('id', newList.id)

  return NextResponse.json({ list_id: newList.id, offer_type: newOfferType, name: newListName })
}
