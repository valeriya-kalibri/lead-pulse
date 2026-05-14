import { scrapeUrl, sleep } from '@/lib/scraper'
import { createServiceClient } from '@/lib/supabase/server'
import type { ErrorSummary, ErrorType } from '@/types'

export async function processJob(
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
      const { error: updateErr } = await db
        .from('prospects')
        .update({ ...result.data })
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
    .update({ status: 'complete', completed_at: new Date().toISOString(), error_summary: errorSummary })
    .eq('id', jobId)

  await db
    .from('prospect_lists')
    .update({ status: 'complete', hot_count: hot, warm_count: warm, cold_count: cold })
    .eq('id', listId)

  const month = new Date().toISOString().slice(0, 7)
  await db.rpc('increment_usage', { p_user_id: userId, p_month: month, p_count: processed - failed })
}
