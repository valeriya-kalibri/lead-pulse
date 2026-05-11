import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

const ALLOWED_FIELDS = ['employee_count', 'revenue_range', 'city', 'state'] as const
type AllowedField = (typeof ALLOWED_FIELDS)[number]

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params

  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Partial<Record<AllowedField, string | null>> = {}

  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      updates[field] = body[field] || null
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const db = createServiceClient()

  // Verify ownership before updating
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
