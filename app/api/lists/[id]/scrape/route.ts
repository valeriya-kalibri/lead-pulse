import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ALL_CRITERIA } from '@/lib/criteria'
import { processJob } from '@/lib/scraper/processJob'

const STARTER_MONTHLY_LIMIT = 250

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: listId } = await params

  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data: list } = await db
    .from('prospect_lists')
    .select('id, user_id, service_keywords, selected_criteria')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single()

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

  const { data: profile } = await db.from('profiles').select('plan').eq('id', user.id).single()
  const plan = profile?.plan ?? 'starter'

  if (plan === 'starter') {
    const month = new Date().toISOString().slice(0, 7)
    const { data: usage } = await db
      .from('usage')
      .select('prospects_scraped')
      .eq('user_id', user.id)
      .eq('month', month)
      .single()
    if ((usage?.prospects_scraped ?? 0) >= STARTER_MONTHLY_LIMIT) {
      return NextResponse.json(
        { error: 'Monthly prospect limit reached. Upgrade to Pro for unlimited prospecting.' },
        { status: 402 }
      )
    }
  }

  const { count: pendingCount } = await db
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId)
    .eq('scrape_status', 'pending')

  if (!pendingCount || pendingCount === 0) {
    return NextResponse.json({ error: 'No pending prospects to scrape' }, { status: 400 })
  }

  const { data: job } = await db
    .from('scrape_jobs')
    .insert({
      list_id: listId,
      user_id: user.id,
      total_urls: pendingCount,
      processed_urls: 0,
      failed_urls: 0,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  await db.from('prospect_lists').update({ status: 'processing' }).eq('id', listId)

  let bodyKeywords: string[] | null = null
  let bodyCriteria: string[] | null = null
  try {
    const body = await req.json()
    if (Array.isArray(body.keywords)) bodyKeywords = body.keywords
    if (Array.isArray(body.criteria)) bodyCriteria = body.criteria
  } catch { /* no body or invalid JSON — use stored values */ }

  const keywords: string[] = bodyKeywords ?? list.service_keywords ?? []
  const criteria: string[] = bodyCriteria ?? list.selected_criteria ?? ALL_CRITERIA

  if (bodyKeywords || bodyCriteria) {
    await db.from('prospect_lists').update({
      ...(bodyKeywords ? { service_keywords: bodyKeywords } : {}),
      ...(bodyCriteria ? { selected_criteria: bodyCriteria } : {}),
    }).eq('id', listId)
  }

  processJob(listId, job!.id, user.id, keywords, criteria, db).catch(console.error)

  return NextResponse.json({ job_id: job?.id })
}
