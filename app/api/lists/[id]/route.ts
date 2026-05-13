import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params

  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data: list } = await db
    .from('prospect_lists')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await db.from('prospect_lists').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
