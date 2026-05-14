import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/hubspot'

const HS_BASE = 'https://api.hubapi.com'

export async function GET(req: NextRequest) {
  const db = createServiceClient()
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') ?? ''
  const type = searchParams.get('type') ?? 'hubspot' // 'hubspot' | 'leadpulse'

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

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

  if (type === 'hubspot') {
    const allLists: { id: string; name: string; objectTypeId: string | null }[] = []

    // 1 — v3 GET (returns lists if crm.lists.read scope is active)
    const v3Res = await fetch(`${HS_BASE}/crm/v3/lists?count=250`, { headers: hsHeaders })
    if (v3Res.ok) {
      const v3Data = await v3Res.json()
      for (const l of v3Data.lists ?? []) {
        allLists.push({ id: String(l.listId), name: l.name, objectTypeId: l.objectTypeId ?? null })
      }
    }

    // 2 — v3 search (sometimes returns company lists when GET doesn't)
    if (allLists.length === 0) {
      for (const objectTypeId of ['0-2', '0-1']) {
        const searchRes = await fetch(`${HS_BASE}/crm/v3/lists/search`, {
          method: 'POST',
          headers: hsHeaders,
          body: JSON.stringify({ objectTypeId, query: '', count: 250 }),
        })
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          for (const l of searchData.lists ?? searchData.results ?? []) {
            allLists.push({ id: String(l.listId ?? l.id), name: l.name, objectTypeId })
          }
        }
      }
    }

    // 3 — v1 contacts fallback (always works, contact lists only)
    if (allLists.length === 0) {
      const v1Res = await fetch(`${HS_BASE}/contacts/v1/lists?count=250`, { headers: hsHeaders })
      if (v1Res.ok) {
        const v1Data = await v1Res.json()
        for (const l of v1Data.lists ?? []) {
          allLists.push({ id: String(l.listId), name: l.name, objectTypeId: '0-1' })
        }
      }
    }

    if (allLists.length === 0) {
      return NextResponse.json({ error: 'No HubSpot lists found. Try reconnecting HubSpot in Settings.' }, { status: 502 })
    }

    return NextResponse.json({ lists: allLists })
  }

  // type === 'leadpulse' — distinct leadpulse_list_name values from HubSpot companies
  const res = await fetch(`${HS_BASE}/crm/v3/objects/companies/search`, {
    method: 'POST',
    headers: hsHeaders,
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'leadpulse_list_name', operator: 'HAS_PROPERTY' }] }],
      properties: ['leadpulse_list_name'],
      limit: 100,
    }),
  })
  if (!res.ok) return NextResponse.json({ error: 'Failed to search HubSpot companies' }, { status: 502 })
  const data = await res.json()
  const seen = new Set<string>()
  const lists: { id: string; name: string }[] = []
  for (const r of data.results ?? []) {
    const name: string | undefined = r.properties?.leadpulse_list_name
    if (name && !seen.has(name)) {
      seen.add(name)
      lists.push({ id: name, name })
    }
  }
  return NextResponse.json({ lists })
}
