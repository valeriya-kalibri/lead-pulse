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
    // Fetch HubSpot Company Lists
    const res = await fetch(`${HS_BASE}/crm/v3/lists?objectType=COMPANY&count=250`, {
      headers: hsHeaders,
    })
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch HubSpot lists' }, { status: 502 })
    const data = await res.json()
    const lists = (data.lists ?? []).map((l: { listId: number | string; name: string }) => ({
      id: String(l.listId),
      name: l.name,
    }))
    return NextResponse.json({ lists })
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
