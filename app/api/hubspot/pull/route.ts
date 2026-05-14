import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/hubspot'

const HS_BASE = 'https://api.hubapi.com'

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
  }
}

function toUrl(domain: string): string {
  return domain.startsWith('http') ? domain : `https://${domain}`
}

// ── Batch helpers ──────────────────────────────────────────────────────────────

interface HsCompanyProps {
  id: string
  domain: string | null
  name: string | null
  city: string | null
  state: string | null
  employeeCount: string | null
  annualRevenue: string | null
}

async function batchReadCompanies(ids: string[], apiKey: string): Promise<HsCompanyProps[]> {
  const results: HsCompanyProps[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const res = await fetch(`${HS_BASE}/crm/v3/objects/companies/batch/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: ['domain', 'name', 'city', 'state', 'numberofemployees', 'annualrevenue'],
        inputs: chunk.map((id) => ({ id })),
      }),
    })
    if (!res.ok) continue
    const data = await res.json()
    for (const r of data.results ?? []) {
      const p = r.properties ?? {}
      results.push({
        id: String(r.id),
        domain: p.domain ?? null,
        name: p.name ?? null,
        city: p.city ?? null,
        state: p.state ?? null,
        employeeCount: p.numberofemployees ?? null,
        annualRevenue: p.annualrevenue ?? null,
      })
    }
  }
  return results
}

async function batchGetPrimaryContacts(companyIds: string[], apiKey: string): Promise<Map<string, string>> {
  const map = new Map<string, string>() // companyId → contactId
  for (let i = 0; i < companyIds.length; i += 100) {
    const chunk = companyIds.slice(i, i + 100)
    const res = await fetch(`${HS_BASE}/crm/v4/associations/companies/contacts/batch/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: chunk.map((id) => ({ id })) }),
    })
    if (!res.ok) continue
    const data = await res.json()
    for (const r of data.results ?? []) {
      const contactId = r.to?.[0]?.toObjectId
      if (contactId) map.set(String(r.from.id), String(contactId))
    }
  }
  return map
}

interface HsContactProps {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
}

async function batchReadContacts(ids: string[], apiKey: string): Promise<Map<string, HsContactProps>> {
  const map = new Map<string, HsContactProps>()
  const uniqueIds = [...new Set(ids)]
  for (let i = 0; i < uniqueIds.length; i += 100) {
    const chunk = uniqueIds.slice(i, i + 100)
    const res = await fetch(`${HS_BASE}/crm/v3/objects/contacts/batch/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: ['firstname', 'lastname', 'email', 'phone'],
        inputs: chunk.map((id) => ({ id })),
      }),
    })
    if (!res.ok) continue
    const data = await res.json()
    for (const r of data.results ?? []) {
      const p = r.properties ?? {}
      map.set(String(r.id), {
        firstName: p.firstname ?? null,
        lastName: p.lastname ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
      })
    }
  }
  return map
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const db = createServiceClient()
  const body = await req.json().catch(() => null)
  const {
    userId,
    source,           // 'hubspot_list' | 'leadpulse_list'
    hubspotListId,    // required for hubspot_list
    hubspotListName,  // required for hubspot_list (to name the new LP list)
    currentListId,    // the LeadPulse list the user is on
    currentListName,  // used as the leadpulse_list_name filter
  } = body ?? {}

  if (!userId || !source || !currentListId || !currentListName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (source === 'hubspot_list' && (!hubspotListId || !hubspotListName)) {
    return NextResponse.json({ error: 'Missing hubspotListId or hubspotListName' }, { status: 400 })
  }

  const { data: profile } = await db
    .from('profiles')
    .select('hubspot_access_token, hubspot_refresh_token, hubspot_token_expires_at')
    .eq('id', userId)
    .single()

  let apiKey: string
  try {
    apiKey = await getValidToken(
      userId,
      profile ?? { hubspot_access_token: null, hubspot_refresh_token: null, hubspot_token_expires_at: null },
      db
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'HubSpot not connected.' },
      { status: 400 }
    )
  }

  const hsHeaders = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  // ── Collect company IDs from HubSpot ───────────────────────────────────────

  const companyIds: string[] = []

  if (source === 'hubspot_list') {
    // Paginate through HubSpot list memberships
    let after: string | null = null
    while (true) {
      const res = await fetch(
        `${HS_BASE}/crm/v3/lists/${hubspotListId}/memberships?limit=100${after ? `&after=${after}` : ''}`,
        { headers: hsHeaders }
      )
      if (!res.ok) break
      const data = await res.json() as { results?: { recordId: unknown }[]; paging?: { next?: { after?: string } } }
      for (const m of data.results ?? []) companyIds.push(String(m.recordId))
      after = data.paging?.next?.after ?? null
      if (!after) break
    }
  } else {
    // Search companies by leadpulse_list_name
    let after: string | null = null
    while (true) {
      const res = await fetch(`${HS_BASE}/crm/v3/objects/companies/search`, {
        method: 'POST',
        headers: hsHeaders,
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: 'leadpulse_list_name', operator: 'EQ', value: currentListName }] }],
          properties: ['hs_object_id'],
          limit: 100,
          ...(after ? { after } : {}),
        }),
      })
      if (!res.ok) break
      const data = await res.json() as { results?: { id: unknown }[]; paging?: { next?: { after?: string } } }
      for (const r of data.results ?? []) companyIds.push(String(r.id))
      after = data.paging?.next?.after ?? null
      if (!after) break
    }
  }

  if (companyIds.length === 0) {
    return NextResponse.json({ imported: 0, updated: 0, newListId: null })
  }

  // ── Batch-fetch company details, associations, and contacts ────────────────

  const [companies, contactIdByCompany] = await Promise.all([
    batchReadCompanies(companyIds, apiKey),
    batchGetPrimaryContacts(companyIds, apiKey),
  ])

  const contactIds = [...contactIdByCompany.values()]
  const contactDetails = contactIds.length > 0 ? await batchReadContacts(contactIds, apiKey) : new Map<string, HsContactProps>()

  // ── Determine target list ──────────────────────────────────────────────────

  let targetListId = currentListId

  if (source === 'hubspot_list') {
    const { data: newList, error } = await db
      .from('prospect_lists')
      .insert({
        user_id: userId,
        name: hubspotListName,
        total_prospects: 0,
        hot_count: 0,
        warm_count: 0,
        cold_count: 0,
        status: 'complete',
        service_keywords: [],
      })
      .select('id')
      .single()

    if (error || !newList) {
      return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
    }
    targetListId = newList.id
  }

  // ── Load existing prospects for matching (leadpulse_list only) ────────────

  const byHubspotId = new Map<string, { id: string; scraped_at: string | null }>()
  const byEmail = new Map<string, { id: string; scraped_at: string | null }>()
  const byDomain = new Map<string, { id: string; scraped_at: string | null }>()

  if (source === 'leadpulse_list') {
    const { data: existing } = await db
      .from('prospects')
      .select('id, website_url, email, hubspot_company_id, scraped_at')
      .eq('list_id', targetListId)
      .eq('user_id', userId)

    for (const p of existing ?? []) {
      if (p.hubspot_company_id) byHubspotId.set(p.hubspot_company_id, { id: p.id, scraped_at: p.scraped_at })
      if (p.email) byEmail.set(p.email.toLowerCase(), { id: p.id, scraped_at: p.scraped_at })
      if (p.website_url) byDomain.set(extractDomain(p.website_url), { id: p.id, scraped_at: p.scraped_at })
    }
  }

  // ── Insert / update prospects ──────────────────────────────────────────────

  let imported = 0
  let updated = 0

  for (const company of companies) {
    if (!company.domain) continue // skip companies with no domain — can't scrape

    const contactId = contactIdByCompany.get(company.id) ?? null
    const contact = contactId ? (contactDetails.get(contactId) ?? null) : null
    const contactName = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || null
    const domain = extractDomain(company.domain)

    const hsContactFields = {
      contact_name: contactName,
      email: contact?.email ?? null,
      phone: contact?.phone ?? null,
      business_name: company.name,
      city: company.city,
      state: company.state,
      employee_count: company.employeeCount,
      revenue_range: company.annualRevenue,
      hubspot_company_id: company.id,
      hubspot_contact_id: contactId,
    }

    if (source === 'hubspot_list') {
      // New list — always insert
      await db.from('prospects').insert({
        list_id: targetListId,
        user_id: userId,
        website_url: toUrl(company.domain),
        score: 'cold',
        scrape_status: 'pending',
        ...hsContactFields,
      })
      imported++
    } else {
      // Match against existing prospects
      const match =
        byHubspotId.get(company.id) ??
        (contact?.email ? byEmail.get(contact.email.toLowerCase()) : undefined) ??
        byDomain.get(domain)

      if (match) {
        const isEnriched = match.scraped_at !== null
        const updateFields: Record<string, unknown> = { ...hsContactFields }
        if (!isEnriched) updateFields.website_url = toUrl(company.domain)
        await db.from('prospects').update(updateFields).eq('id', match.id)
        updated++
      } else {
        await db.from('prospects').insert({
          list_id: targetListId,
          user_id: userId,
          website_url: toUrl(company.domain),
          score: 'cold',
          scrape_status: 'pending',
          ...hsContactFields,
        })
        imported++
      }
    }
  }

  // Update list prospect count
  const { count } = await db
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', targetListId)

  await db
    .from('prospect_lists')
    .update({ total_prospects: count ?? 0 })
    .eq('id', targetListId)

  return NextResponse.json({
    imported,
    updated,
    newListId: source === 'hubspot_list' ? targetListId : null,
  })
}
