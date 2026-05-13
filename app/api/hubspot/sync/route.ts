import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ensureCustomProperties } from '@/lib/hubspot'
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

  // ── Fetch HubSpot API key ───────────────────────────────────────────────────
  const { data: profile } = await db
    .from('profiles')
    .select('hubspot_api_key')
    .eq('id', userId)
    .single()

  if (!profile?.hubspot_api_key) {
    return NextResponse.json(
      { error: 'No HubSpot API key configured. Add it in Settings.' },
      { status: 400 }
    )
  }

  const apiKey = profile.hubspot_api_key as string
  const hsHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  // ── Ensure custom HubSpot properties exist (idempotent) ────────────────────
  await ensureCustomProperties(apiKey)

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
    .select('id, name, filter_summary')
    .in('id', listIds)

  const listMap = new Map(
    (lists ?? []).map((l) => [
      l.id as string,
      l as { id: string; name: string; filter_summary: string | null },
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
    const filterSummary = list?.filter_summary ?? ''

    let hubspot_company_id: string | null = null
    let hubspot_contact_id: string | null = null
    let hubspot_note_id: string | null = null

    try {
      // ── Step A — Upsert Company ────────────────────────────────────────────
      //
      // Search by domain first. Update if found, create if not.
      // Save returned ID to hubspot_company_id.

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

      const companyProps: Record<string, string> = {
        name: p.business_name ?? '',
        website: p.website_url,
        city: p.city ?? '',
        state: p.state ?? '',
        practice_platform: p.crm_emr_platform ?? '',
        crm_platform: p.crm_platform ?? '',
        has_chatbot: capitalize(p.has_chatbot),
        has_contact_form: capitalize(p.has_contact_form),
        has_online_booking: capitalize(p.has_online_booking),
        services_detected: (p.high_ticket_services ?? []).join(', '),
        leadpulse_score: capitalize(p.score),
        leadpulse_list_name: listName,
        leadpulse_filter_summary: filterSummary,
      }

      const empCount = parseEmployeeCount(p.employee_count)
      if (empCount) companyProps.numberofemployees = empCount

      const rev = parseRevenue(p.revenue_range)
      if (rev) companyProps.annualrevenue = rev

      if (p.location_count != null) companyProps.location_count = String(p.location_count)

      if (existingCompanyId) {
        await fetch(`${HS_BASE}/crm/v3/objects/companies/${existingCompanyId}`, {
          method: 'PATCH',
          headers: hsHeaders,
          body: JSON.stringify({ properties: companyProps }),
        })
        hubspot_company_id = existingCompanyId
      } else {
        const createRes = await fetch(`${HS_BASE}/crm/v3/objects/companies`, {
          method: 'POST',
          headers: hsHeaders,
          body: JSON.stringify({ properties: companyProps }),
        })
        if (!createRes.ok) {
          const e = await createRes.json().catch(() => ({}))
          throw new Error(
            `Company upsert failed: ${(e as { message?: string }).message ?? createRes.status}`
          )
        }
        hubspot_company_id = (await createRes.json()).id
      }

      // ── Step B — Upsert Contact ────────────────────────────────────────────
      //
      // Search by email first, then by phone if no email match.
      // Update if found, create if not. Save returned ID to hubspot_contact_id.

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
      const contactProps: Record<string, string> = {
        firstname: nameParts[0] ?? '',
        lastname: nameParts.slice(1).join(' '),
        email: p.email ?? '',
        phone: p.phone ?? '',
        outreach_hook: p.outreach_hook ?? '',
        leadpulse_score: capitalize(p.score),
        leadpulse_list_name: listName,
      }

      if (existingContactId) {
        await fetch(`${HS_BASE}/crm/v3/objects/contacts/${existingContactId}`, {
          method: 'PATCH',
          headers: hsHeaders,
          body: JSON.stringify({ properties: contactProps }),
        })
        hubspot_contact_id = existingContactId
      } else {
        const createRes = await fetch(`${HS_BASE}/crm/v3/objects/contacts`, {
          method: 'POST',
          headers: hsHeaders,
          body: JSON.stringify({ properties: contactProps }),
        })
        if (!createRes.ok) {
          const e = await createRes.json().catch(() => ({}))
          throw new Error(
            `Contact upsert failed: ${(e as { message?: string }).message ?? createRes.status}`
          )
        }
        hubspot_contact_id = (await createRes.json()).id
      }

      // ── Step C — Associate Contact to Company (Associations API v4) ────────

      if (hubspot_contact_id && hubspot_company_id) {
        await fetch(
          `${HS_BASE}/crm/v4/objects/contacts/${hubspot_contact_id}/associations/default/companies/${hubspot_company_id}`,
          { method: 'PUT', headers: hsHeaders }
        )
      }

      // ── Step D — Push Intel Note (only if intel field is populated) ────────
      //
      // Creates a Note object via CRM v3, then associates it to both the
      // Contact and the Company via Associations API v4.

      if (p.intel && hubspot_contact_id) {
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
          .map((s) => `- ${s}`)
          .join('\n')

        const noteBody = [
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

        const noteRes = await fetch(`${HS_BASE}/crm/v3/objects/notes`, {
          method: 'POST',
          headers: hsHeaders,
          body: JSON.stringify({
            properties: {
              hs_note_body: noteBody,
              hs_timestamp: new Date().toISOString(),
            },
          }),
        })

        if (noteRes.ok) {
          hubspot_note_id = (await noteRes.json()).id as string

          // Associate note → contact
          await fetch(
            `${HS_BASE}/crm/v4/objects/notes/${hubspot_note_id}/associations/default/contacts/${hubspot_contact_id}`,
            { method: 'PUT', headers: hsHeaders }
          )

          // Associate note → company
          if (hubspot_company_id) {
            await fetch(
              `${HS_BASE}/crm/v4/objects/notes/${hubspot_note_id}/associations/default/companies/${hubspot_company_id}`,
              { method: 'PUT', headers: hsHeaders }
            )
          }
        }
      }

      // ── Step E — Update Supabase ───────────────────────────────────────────

      await db
        .from('prospects')
        .update({
          hubspot_contact_id,
          hubspot_company_id,
          hubspot_note_id,
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
