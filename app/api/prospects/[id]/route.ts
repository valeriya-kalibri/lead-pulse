import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApolloStatus } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

const APOLLO_STATUSES: ApolloStatus[] = ['not_enrolled', 'enrolled', 'replied', 'bounced', 'completed']
const EDITABLE_FIELDS = ['employee_count', 'revenue_range', 'city', 'state'] as const
type EditableField = (typeof EDITABLE_FIELDS)[number]

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params

  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, string | null> = {}

  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      updates[field] = body[field] || null
    }
  }

  if ('apollo_sequence_status' in body) {
    const status = body.apollo_sequence_status as ApolloStatus
    if (!APOLLO_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid apollo_sequence_status' }, { status: 400 })
    }
    updates.apollo_sequence_status = status
    if (status === 'enrolled') {
      updates.apollo_enrolled_at = new Date().toISOString()
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const db = createServiceClient()

  const { data: prospect } = await db
    .from('prospects')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await db.from('prospects').update(updates).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
