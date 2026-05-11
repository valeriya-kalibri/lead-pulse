import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/csv'
import { scrapeUrl, sleep } from '@/lib/scraper'
import { ALL_CRITERIA } from '@/lib/criteria'
import type { ErrorSummary, ErrorType } from '@/types'

const STARTER_MONTHLY_LIMIT = 250

async function getCurrentMonthUsage(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const month = new Date().toISOString().slice(0, 7)
  const { data } = await supabase
    .from('usage')
    .select('id, prospects_scraped')
    .eq('user_id', userId)
    .eq('month', month)
    .single()
  return { month, usage: data }
}

export async function POST(req: NextRequest) {
  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data: profile } = await db.from('profiles').select('plan').eq('id', user.id).single()
  const plan = profile?.plan ?? 'starter'

  if (plan === 'starter') {
    const { usage } = await getCurrentMonthUsage(db, user.id)
    if ((usage?.prospects_scraped ?? 0) >= STARTER_MONTHLY_LIMIT) {
      return NextResponse.json(
        { error: 'Monthly prospect limit reached. Upgrade to Pro for unlimited prospecting.' },
        { status: 402 }
      )
    }
  }

  const formData = await req.formData()
  const name = formData.get('name') as string
  const industryName = formData.get('industry_name') as string
  const industryTemplateId = formData.get('industry_template_id') as string
  const keywordsRaw = formData.get('keywords') as string
  const criteriaRaw = formData.get('criteria') as string
  const csvFile = formData.get('csv') as File | null

  if (!name || !csvFile) {
    return NextResponse.json({ error: 'Missing required fields: name and csv' }, { status: 400 })
  }

  const keywords: string[] = (() => {
    try { return JSON.parse(keywordsRaw) } catch { return [] }
  })()

  const criteria: string[] = (() => {
    try { return JSON.parse(criteriaRaw) } catch { return ALL_CRITERIA }
  })()

  const csvText = await csvFile.text()
  const rows = parseCSV(csvText)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid URLs found in CSV' }, { status: 400 })
  }

  const allowedRows = plan === 'starter'
    ? (() => {
        const remaining = STARTER_MONTHLY_LIMIT
        return rows.slice(0, remaining)
      })()
    : rows

  // Deduplicate URLs within this batch — later occurrences are marked skipped
  const urlsSeen = new Set<string>()
  const prospectInserts = allowedRows.map((row) => {
    const key = row.url.toLowerCase().replace(/\/$/, '')
    const isSkipped = urlsSeen.has(key)
    if (!isSkipped) urlsSeen.add(key)
    return {
      list_id: '', // filled after list is created
      user_id: user.id,
      website_url: row.url,
      business_name: row.business_name || null,
      employee_count: row.employee_count || null,
      revenue_range: row.revenue_range || null,
      contact_name: row.contact_name || null,
      phone: row.phone || null,
      email: row.email || null,
      city: row.city || null,
      state: row.state || null,
      scrape_status: (isSkipped ? 'skipped' : 'pending') as 'skipped' | 'pending',
    }
  })

  const { data: list, error: listErr } = await db
    .from('prospect_lists')
    .insert({
      user_id: user.id,
      name,
      industry_name: industryName || null,
      industry_template_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(industryTemplateId)
        ? industryTemplateId
        : null,
      service_keywords: keywords,
      selected_criteria: criteria,
      status: 'processing',
      total_prospects: allowedRows.length,
    })
    .select('id')
    .single()

  if (listErr || !list) {
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
  }

  await db
    .from('prospects')
    .insert(prospectInserts.map((p) => ({ ...p, list_id: list.id })))

  const { data: job } = await db
    .from('scrape_jobs')
    .insert({
      list_id: list.id,
      user_id: user.id,
      total_urls: allowedRows.length,
      processed_urls: 0,
      failed_urls: 0,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  processJob(list.id, job!.id, user.id, keywords, criteria, db).catch(console.error)

  return NextResponse.json({ list_id: list.id, job_id: job?.id })
}

async function processJob(
  listId: string,
  jobId: string,
  userId: string,
  keywords: string[],
  criteria: string[],
  db: ReturnType<typeof createServiceClient>
) {
  const { data: pendingProspects } = await db
    .from('prospects')
    .select('id, website_url')
    .eq('list_id', listId)
    .eq('scrape_status', 'pending')

  if (!pendingProspects) return

  // Count skipped duplicates for the summary
  const { count: skippedCount } = await db
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId)
    .eq('scrape_status', 'skipped')

  let processed = 0
  let failed = 0
  let hot = 0
  let warm = 0
  let cold = 0
  let totalMs = 0
  const errorTypeCounts: Partial<Record<ErrorType, number>> = {}

  for (const prospect of pendingProspects) {
    await db.from('prospects').update({ scrape_status: 'processing' }).eq('id', prospect.id)

    const t0 = Date.now()
    const result = await scrapeUrl(prospect.website_url, keywords, criteria)
    totalMs += Date.now() - t0

    if (result.success && result.data) {
      await db.from('prospects').update({ ...result.data }).eq('id', prospect.id)
      if (result.data.score === 'hot') hot++
      else if (result.data.score === 'warm') warm++
      else cold++
    } else {
      const et: ErrorType = result.errorType ?? 'UNKNOWN'
      errorTypeCounts[et] = (errorTypeCounts[et] ?? 0) + 1
      await db
        .from('prospects')
        .update({
          scrape_status: 'error',
          scrape_error: result.error ?? 'Unknown',
          error_type: et,
          score: 'cold',
        })
        .eq('id', prospect.id)
      failed++
    }

    processed++
    await db
      .from('scrape_jobs')
      .update({ processed_urls: processed, failed_urls: failed })
      .eq('id', jobId)

    await sleep(500)
  }

  const errorSummary: ErrorSummary = {
    succeeded: processed - failed,
    failed,
    skipped: skippedCount ?? 0,
    by_error_type: errorTypeCounts,
    avg_scrape_ms: processed > 0 ? Math.round(totalMs / processed) : null,
  }

  await db
    .from('scrape_jobs')
    .update({
      status: 'complete',
      completed_at: new Date().toISOString(),
      error_summary: errorSummary,
    })
    .eq('id', jobId)

  await db
    .from('prospect_lists')
    .update({ status: 'complete', hot_count: hot, warm_count: warm, cold_count: cold })
    .eq('id', listId)

  const month = new Date().toISOString().slice(0, 7)
  await db.rpc('increment_usage', { p_user_id: userId, p_month: month, p_count: processed - failed })
}
