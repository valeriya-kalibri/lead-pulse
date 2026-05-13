import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ensureCustomProperties, getValidToken, buildFilterSummary } from '@/lib/hubspot'
import type { Prospect } from '@/types'

const HS_BASE = 'https://api.hubapi.com'

// ── Utilities ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

/** 'yes' → 'Yes', 'hot' → 'Hot', etc. */
function capitalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
  }
}

/** Parse first integer from a text range like '6-15' or '50+'. */
function parseEmployeeCount(s: string | null): string | null {
  if (!s) return null
  const m = s.match(/\d+/)
  return m ? m[0] : null
}

/** Map known revenue range strings to approximate midpoint integers. */
const REVENUE_MAP: Record<string, string> = {
  '<$500k': '250000',
  '$500k-$1m': '750000',
  '$1m-$5m': '3000000',
  '$5m+': '5000000',
}

function parseRevenue(s: string | null): string | null {
  if (!s) return null
  const key = s.toLowerCase().replace(/[\s,]/g, '')
  return REVENUE_MAP[key] ?? null
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const db = createServiceClient()

  // ── Parse & validate request ────────────────────────────────────────────────
  const body = await req.json().catch(() => null)
  const prospectIds: string[] = body?.prospectIds ?? []
  const userId: string = body?.userId ?? ''

  if (!Array.isArray(prospectIds) || prospectIds.length === 0 || !userId) {
    return NextResponse.json({ error: 'Missing prospectIds or userId' }, { status: 400 })
  }

  // ── Fetch HubSpot tokens ────────────────────────────────────────────────────
  const { data: profile } = await db
    .from('profiles')
    .select('hubspot_access_token, hubspot_refresh_token, hubspot_token_expires_at')
    .eq('id', userId)
    .single()

  let apiKey: string
  try {
    apiKey = await getValidToken(userId, profile ?? {
      hubspot_access_token: null,
      hubspot_refresh_token: null,
      hubspot_token_expires_at: null,
    }, db)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'HubSpot not connected.' },
      { status: 400 }
    )
  }

  const hsHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  // ── Ensure custom HubSpot properties exist (idempotent) ────────────────────
  const propertyErrors = await ensureCustomProperties(apiKey)
  if (propertyErrors.length > 0) {
    return NextResponse.json(
      { error: 'Failed to create HubSpot custom properties', details: propertyErrors },
      { status: 400 }
    )
  }

  // ── Fetch prospects ────────────────────────────────────────────────────────
  const { data: rawProspects } = await db
    .from('prospects')
    .select('*')
    .in('id', prospectIds)
    .eq('user_id', userId)

  if (!rawProspects || rawProspects.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, errors: [] })
  }

  // ── Batch-fetch list names + filter summaries ──────────────────────────────
  const listIds = [...new Set(rawProspects.map((p) => p.list_id as string).filter(Boolean))]
  const { data: lists } = await db
    .from('prospect_lists')
    .select('id, name, filter_summary, industry_name, service_keywords, selected_criteria')
    .in('id', listIds)

  const listMap = new Map(
    (lists ?? []).map((l) => [
      l.id as string,
      l as { id: string; name: string; filter_summary: string | null; industry_name: string | null; service_keywords: string[] | null; selected_criteria: string[] | null },
    ])
  )

  // ── Sync loop ──────────────────────────────────────────────────────────────
  let synced = 0
  let failed = 0
  const errors: Array<{ prospectId: string; error: string }> = []

  for (let i = 0; i < rawProspects.length; i++) {
    if (i > 0) await sleep(200)

    const p = rawProspects[i] as Prospect
    const list = listMap.get(p.list_id)
    const listName = list?.name ?? ''
    const filterSummary = list
      ? buildFilterSummary({
          name: list.name,
          industry_name: list.industry_name ?? null,
          service_keywords: list.service_keywords ?? [],
          selected_criteria: list.selected_criteria ?? [],
        })
      : ''

    let hubspot_company_id: string | null = null
    let hubspot_contact_id: string | null = null

    try {
      // ── Build shared LeadPulse props (same fields on contact and company) ──

      const intelText = p.intel
        ? (() => {
            const intel = p.intel
            const generatedAt = p.intel_generated_at
              ? new Date(p.intel_generated_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: '2-digit',
                  year: 'numeric',
                })
              : 'unknown'
            const starters = (intel.conversation_starters ?? [])
              .slice(0, 3)
              .map((s: string) => `- ${s}`)
              .join('\n')
            return [
              `LeadPulse Intel — Generated ${generatedAt}`,
              '',
              `OUTREACH HOOK: ${p.outreach_hook ?? ''}`,
              '',
              `BUSINESS SUMMARY: ${intel.business_summary}`,
              '',
              `OWNER PROFILE: ${intel.owner_profile}`,
              '',
              `SOCIAL SIGNALS: ${intel.social_signals}`,
              '',
              'CONVERSATION STARTERS:',
              starters,
              '',
              `PAIN INDICATORS: ${intel.pain_indicators}`,
            ].join('\n')
          })()
        : ''

      const sharedLeadPulseProps: Record<string, string> = {
        outreach_hook:            p.outreach_hook ?? '',
        leadpulse_score:          capitalize(p.score),
        leadpulse_list_name:      listName,
        leadpulse_filter_summary: filterSummary,
        practice_platform:        p.crm_emr_platform ?? '',
        crm_platform:             p.crm_platform ?? '',
        has_chatbot:              capitalize(p.has_chatbot),
        has_contact_form:         capitalize(p.has_contact_form),
        has_online_booking:       capitalize(p.has_online_booking),
        services_detected:        (p.high_ticket_services ?? []).join(', '),
        leadpulse_intel:          intelText,
      }

      if (p.location_count != null) {
        sharedLeadPulseProps.location_count = String(p.location_count)
      }

      // ── Step A — Upsert Company ────────────────────────────────────────────

      const domain = extractDomain(p.website_url)
      const companySearchRes = await fetch(`${HS_BASE}/crm/v3/objects/companies/search`, {
        method: 'POST',
        headers: hsHeaders,
        body: JSON.stringify({
          filterGroups: [
            { filters: [{ propertyName: 'domain', operator: 'EQ', value: domain }] },
          ],
          limit: 1,
        }),
      })
      const companySearch = await companySearchRes.json()
      const existingCompanyId: string | null = companySearch.results?.[0]?.id ?? null

      const rawCompanyProps: Record<string, string> = {
        name:    p.business_name ?? '',
        website: p.website_url,
        city:    p.city ?? '',
        state:   p.state ?? '',
        ...sharedLeadPulseProps,
      }
      const empCount = parseEmployeeCount(p.employee_count)
      if (empCount) rawCompanyProps.numberofemployees = empCount
      const rev = parseRevenue(p.revenue_range)
      if (rev) rawCompanyProps.annualrevenue = rev

      const companyProps = Object.fromEntries(
        Object.entries(rawCompanyProps).filter(([, v]) => v !== '')
      )

      if (existingCompanyId) {
        const patchRes = await fetch(`${HS_BASE}/crm/v3/objects/companies/${existingCompanyId}`, {
          method: 'PATCH',
          headers: hsHeaders,
          body: JSON.stringify({ properties: companyProps }),
        })
        if (!patchRes.ok) {
          const e = await patchRes.json().catch(() => ({}))
          throw new Error(`Company PATCH failed: ${(e as { message?: string }).message ?? patchRes.status}`)
        }
        hubspot_company_id = existingCompanyId
      } else {
        const createRes = await fetch(`${HS_BASE}/crm/v3/objects/companies`, {
          method: 'POST',
          headers: hsHeaders,
          body: JSON.stringify({ properties: companyProps }),
        })
        if (!createRes.ok) {
          const e = await createRes.json().catch(() => ({}))
          throw new Error(`Company create failed: ${(e as { message?: string }).message ?? createRes.status}`)
        }
        hubspot_company_id = (await createRes.json()).id
      }

      // ── Step B — Upsert Contact ────────────────────────────────────────────

      let existingContactId: string | null = null
      if (p.email) {
        const r = await fetch(`${HS_BASE}/crm/v3/objects/contacts/search`, {
          method: 'POST',
          headers: hsHeaders,
          body: JSON.stringify({
            filterGroups: [
              { filters: [{ propertyName: 'email', operator: 'EQ', value: p.email }] },
            ],
            limit: 1,
          }),
        })
        existingContactId = (await r.json()).results?.[0]?.id ?? null
      }
      if (!existingContactId && p.phone) {
        const r = await fetch(`${HS_BASE}/crm/v3/objects/contacts/search`, {
          method: 'POST',
          headers: hsHeaders,
          body: JSON.stringify({
            filterGroups: [
              { filters: [{ propertyName: 'phone', operator: 'EQ', value: p.phone }] },
            ],
            limit: 1,
          }),
        })
        existingContactId = (await r.json()).results?.[0]?.id ?? null
      }

      const nameParts = (p.contact_name ?? '').trim().split(/\s+/)
      const rawContactProps: Record<string, string> = {
        firstname: nameParts[0] ?? '',
        lastname:  nameParts.slice(1).join(' '),
        email:     p.email ?? '',
        phone:     p.phone ?? '',
        ...sharedLeadPulseProps,
      }
      const revC = parseRevenue(p.revenue_range)
      if (revC) rawContactProps.annualrevenue = revC

      const contactProps = Object.fromEntries(
        Object.entries(rawContactProps).filter(([, v]) => v !== '')
      )

      if (existingContactId) {
        const patchRes = await fetch(`${HS_BASE}/crm/v3/objects/contacts/${existingContactId}`, {
          method: 'PATCH',
          headers: hsHeaders,
          body: JSON.stringify({ properties: contactProps }),
        })
        if (!patchRes.ok) {
          const e = await patchRes.json().catch(() => ({}))
          throw new Error(`Contact PATCH failed: ${(e as { message?: string }).message ?? patchRes.status}`)
        }
        hubspot_contact_id = existingContactId
      } else {
        const createRes = await fetch(`${HS_BASE}/crm/v3/objects/contacts`, {
          method: 'POST',
          headers: hsHeaders,
          body: JSON.stringify({ properties: contactProps }),
        })
        if (!createRes.ok) {
          const e = await createRes.json().catch(() => ({}))
          throw new Error(`Contact create failed: ${(e as { message?: string }).message ?? createRes.status}`)
        }
        hubspot_contact_id = (await createRes.json()).id
      }

      // ── Step C — Associate Contact to Company ─────────────────────────────

      if (hubspot_contact_id && hubspot_company_id) {
        await fetch(
          `${HS_BASE}/crm/v4/objects/contacts/${hubspot_contact_id}/associations/default/companies/${hubspot_company_id}`,
          { method: 'PUT', headers: hsHeaders }
        )
      }

      // ── Step D — Update Supabase ───────────────────────────────────────────

      await db
        .from('prospects')
        .update({
          hubspot_contact_id,
          hubspot_company_id,
          hubspot_synced_at: new Date().toISOString(),
        })
        .eq('id', p.id)

      synced++
    } catch (err) {
      failed++
      errors.push({
        prospectId: p.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  // ── Track monthly HubSpot usage ────────────────────────────────────────────
  if (synced > 0) {
    const month = new Date().toISOString().slice(0, 7)
    await db.rpc('increment_hubspot_usage', {
      p_user_id: userId,
      p_month: month,
      p_count: synced,
    })
  }

  return NextResponse.json({ synced, failed, errors })
}
