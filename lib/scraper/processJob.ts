import { scrapeUrl, scrapeHtml, sleep } from '@/lib/scraper'
import { playwrightFetch } from '@/lib/scraper/playwrightFetch'
import { createServiceClient } from '@/lib/supabase/server'
import type { ErrorSummary, ErrorType, OfferType } from '@/types'

export async function processJob(
  listId: string,
  jobId: string,
  userId: string,
  keywords: string[],
  criteria: string[],
  db: ReturnType<typeof createServiceClient>,
  isPro = false
) {
  const SCRAPE_DELAY = isPro ? 150 : 500
  // Fetch offer type from the list — drives scoring logic
  const { data: listRecord } = await db
    .from('prospect_lists')
    .select('offer_type')
    .eq('id', listId)
    .single()
  const offerType: OfferType = (listRecord?.offer_type as OfferType) ?? 'lead_capture'

  const { data: pendingProspects } = await db
    .from('prospects')
    .select('id, website_url')
    .eq('list_id', listId)
    .eq('scrape_status', 'pending')

  if (!pendingProspects) return

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
  let playwrightFallbackCount = 0
  const errorTypeCounts: Partial<Record<ErrorType, number>> = {}

  for (const prospect of pendingProspects) {
    await db.from('prospects').update({ scrape_status: 'processing' }).eq('id', prospect.id)

    const t0 = Date.now()
    let result = await scrapeUrl(prospect.website_url, keywords, criteria, offerType)
    let usedPlaywright = false

    // Playwright fallback for SPA/React sites that return an empty page shell
    if (!result.success && result.errorType === 'EMPTY_PAGE') {
      const html = await playwrightFetch(prospect.website_url)
      if (html) {
        result = scrapeHtml(html, keywords, criteria, offerType)
        usedPlaywright = true
        playwrightFallbackCount++
      }
    }

    totalMs += Date.now() - t0

    if (result.success && result.data) {
      const dataToWrite = {
        ...result.data,
        ...(usedPlaywright && { scrape_source: 'playwright' }),
      }
      const { error: updateErr } = await db
        .from('prospects')
        .update(dataToWrite)
        .eq('id', prospect.id)
      if (updateErr) {
        console.error(`[scrape] DB update failed for ${prospect.website_url}:`, updateErr.message)
        await db
          .from('prospects')
          .update({ scrape_status: 'error', scrape_error: `DB write failed: ${updateErr.message}`, score: 'cold' })
          .eq('id', prospect.id)
        failed++
      } else {
        if (result.data.score === 'hot') hot++
        else if (result.data.score === 'warm') warm++
        else cold++
      }
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

    await sleep(SCRAPE_DELAY)
  }

  const errorSummary: ErrorSummary & { playwright_fallback_count?: number } = {
    succeeded: processed - failed,
    failed,
    skipped: skippedCount ?? 0,
    by_error_type: errorTypeCounts,
    avg_scrape_ms: processed > 0 ? Math.round(totalMs / processed) : null,
    ...(playwrightFallbackCount > 0 && { playwright_fallback_count: playwrightFallbackCount }),
  }

  await db
    .from('scrape_jobs')
    .update({ status: 'complete', completed_at: new Date().toISOString(), error_summary: errorSummary })
    .eq('id', jobId)

  await db
    .from('prospect_lists')
    .update({ status: 'complete', hot_count: hot, warm_count: warm, cold_count: cold })
    .eq('id', listId)

  const month = new Date().toISOString().slice(0, 7)
  await db.rpc('increment_usage', { p_user_id: userId, p_month: month, p_count: processed - failed })
}
