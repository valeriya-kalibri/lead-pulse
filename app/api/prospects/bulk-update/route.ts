import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ALLOWED_FIELDS = ['employee_count', 'revenue_range'] as const
type BulkField = (typeof ALLOWED_FIELDS)[number]

const ALLOWED_VALUES: Record<BulkField, string[]> = {
  employee_count: ['1-5', '6-15', '16-50', '50+'],
  revenue_range: ['<$500K', '$500K-$1M', '$1M-$5M', '$5M+'],
}

export async function POST(req: NextRequest) {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { ids, field, value } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }
  if (!ALLOWED_FIELDS.includes(field as BulkField)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }
  if (!ALLOWED_VALUES[field as BulkField].includes(value)) {
    return NextResponse.json({ error: 'Invalid value' }, { status: 400 })
  }

  const db = createServiceClient()

  const { error } = await db
    .from('prospects')
    .update({ [field]: value })
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: ids.length })
}
