import { NextRequest, NextResponse, after } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/csv'
import { ALL_CRITERIA } from '@/lib/criteria'
import { processJob } from '@/lib/scraper/processJob'

export const maxDuration = 300

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

  // Deduplicate by URL — drop later occurrences entirely so they never appear in results
  const urlsSeen = new Set<string>()
  const prospectInserts = allowedRows
    .filter((row) => {
      const key = row.url.toLowerCase().replace(/\/$/, '')
      if (urlsSeen.has(key)) return false
      urlsSeen.add(key)
      return true
    })
    .map((row) => ({
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
      scrape_status: 'pending' as const,
    }))

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
      total_prospects: prospectInserts.length,
    })
    .select('id')
    .single()

  if (listErr || !list) {
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
  }

  const { error: insertError } = await db
    .from('prospects')
    .insert(prospectInserts.map((p) => ({ ...p, list_id: list.id })))

  if (insertError) {
    await db.from('prospect_lists').delete().eq('id', list.id)
    return NextResponse.json(
      { error: `Failed to import prospects: ${insertError.message}` },
      { status: 500 }
    )
  }

  const { data: job } = await db
    .from('scrape_jobs')
    .insert({
      list_id: list.id,
      user_id: user.id,
      total_urls: prospectInserts.length,
      processed_urls: 0,
      failed_urls: 0,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  after(() => processJob(list.id, job!.id, user.id, keywords, criteria, db).catch(console.error))

  return NextResponse.json({ list_id: list.id, job_id: job?.id })
}

