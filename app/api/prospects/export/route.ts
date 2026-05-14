import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prospectsToCSV } from '@/lib/csv'
import { ALL_CRITERIA } from '@/lib/criteria'
import type { Prospect, ProspectList } from '@/types'

export async function GET(req: NextRequest) {
  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const listId = req.nextUrl.searchParams.get('list_id')
  if (!listId) return NextResponse.json({ error: 'Missing list_id' }, { status: 400 })

  const scoresParam = req.nextUrl.searchParams.get('scores') // e.g. 'hot,warm'
  const scoreFilter = scoresParam ? scoresParam.split(',').map((s) => s.trim()) : null

  const db = createServiceClient()

  // Verify ownership and get criteria
  const { data: list } = await db
    .from('prospect_lists')
    .select('id, name, selected_criteria')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single()

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

  let query = db
    .from('prospects')
    .select('*')
    .eq('list_id', listId)
    .order('score')
    .order('business_name')

  if (scoreFilter) query = query.in('score', scoreFilter)

  const { data: prospects } = await query

  const pl = list as Pick<ProspectList, 'id' | 'name' | 'selected_criteria'>
  const criteria = pl.selected_criteria ?? ALL_CRITERIA

  const csv = prospectsToCSV((prospects ?? []) as Prospect[], criteria)
  const suffix = scoreFilter ? `_${scoreFilter.join('_')}` : ''
  const filename = `${pl.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${suffix}_prospects.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
