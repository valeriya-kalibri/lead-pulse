import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as cheerio from 'cheerio'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { IntelData } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

const SYSTEM_PROMPT =
  'You are a sales intelligence analyst. Based on the business data provided, generate a concise prospect intelligence briefing for a sales rep who is about to make first contact. The outreach hook must be specific to this exact prospect — never generic. Be actionable and grounded only in what the data shows. Return only valid JSON, no preamble, no markdown.'

async function fetchText(url: string, maxChars = 3000): Promise<string> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8_000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadPulse/1.0)' },
      redirect: 'follow',
    })
    clearTimeout(t)
    if (!res.ok) return ''
    const html = await res.text()
    const $ = cheerio.load(html)
    $('script, style, nav, header, footer, [role="navigation"], noscript').remove()
    return $('main, article, .content, body')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxChars)
  } catch {
    return ''
  }
}

function extractSocialLinks(html: string): Record<string, string> {
  const found: Record<string, string> = {}
  const patterns: [string, RegExp][] = [
    ['instagram', /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/],
    ['facebook', /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9_./-]+/],
    ['tiktok', /https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+/],
  ]
  for (const [platform, re] of patterns) {
    const m = html.match(re)
    if (m) found[platform] = m[0]
  }
  return found
}

export async function POST(req: NextRequest, { params }: Props) {
  const { id } = await params

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data: prospect } = await db
    .from('prospects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (prospect.score === 'cold') {
    return NextResponse.json({ error: 'Intel not available for Cold prospects' }, { status: 400 })
  }

  // Return cached intel unless force-refresh requested
  const forceRefresh = new URL(req.url).searchParams.get('refresh') === '1'
  if (prospect.intel && prospect.intel_generated_at && !forceRefresh) {
    return NextResponse.json(prospect.intel)
  }

  const base = prospect.website_url.replace(/\/$/, '')

  // Fetch homepage HTML first (needed for social link extraction)
  let homeHtml = ''
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10_000)
    const res = await fetch(base, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadPulse/1.0)' },
      redirect: 'follow',
    })
    clearTimeout(t)
    if (res.ok) homeHtml = await res.text()
  } catch { /* continue without */ }

  // Extract main page readable text
  const homeText = (() => {
    if (!homeHtml) return ''
    const $ = cheerio.load(homeHtml)
    $('script, style, nav, header, footer, noscript').remove()
    return $('main, article, section, body').first().text().replace(/\s+/g, ' ').trim().slice(0, 3000)
  })()

  // Fetch sub-pages and social profiles in parallel
  const socialLinks = extractSocialLinks(homeHtml)
  const [aboutText, teamText, blogText, ...socialTexts] = await Promise.all([
    fetchText(`${base}/about`),
    fetchText(`${base}/team`),
    fetchText(`${base}/blog`),
    ...Object.values(socialLinks).map((url) => fetchText(url, 1200)),
  ])

  const socialContent = Object.keys(socialLinks)
    .map((platform, i) => (socialTexts[i] ? `${platform} profile:\n${socialTexts[i]}` : null))
    .filter(Boolean)
    .join('\n\n')

  const scrapeSnapshot = {
    website_url: prospect.website_url,
    business_name: prospect.business_name,
    score: prospect.score,
    score_reason: prospect.score_reason,
    has_chatbot: prospect.has_chatbot,
    chatbot_platform: prospect.chatbot_platform,
    has_contact_form: prospect.has_contact_form,
    has_online_booking: prospect.has_online_booking,
    crm_emr_platform: prospect.crm_emr_platform,
    crm_platform: prospect.crm_platform,
    high_ticket_services: prospect.high_ticket_services,
    location_count: prospect.location_count,
    is_multi_location: prospect.is_multi_location,
    analytics_platform: prospect.analytics_platform,
    employee_count: prospect.employee_count,
    revenue_range: prospect.revenue_range,
    city: prospect.city,
    state: prospect.state,
  }

  const userMessage = `Prospect data:
${JSON.stringify(scrapeSnapshot, null, 2)}

Homepage content:
${homeText || '(not available)'}

About page:
${aboutText || '(not available)'}

Team page:
${teamText || '(not available)'}

Blog / News:
${blogText || '(not available)'}

Social media found: ${Object.keys(socialLinks).join(', ') || 'none'}
${socialContent || ''}

Return a JSON object with exactly these fields:
{
  "outreach_hook": "one punchy sentence the sales rep leads with — specific to this exact prospect",
  "business_summary": "3-4 sentences on what they do, who they serve, positioning, and differentiators",
  "owner_profile": "what kind of person runs this business based on about/team page, tone, content style",
  "social_signals": "what they have been posting about and what it signals about their current focus or pain points",
  "conversation_starters": ["specific genuine thing 1", "specific genuine thing 2", "specific genuine thing 3"],
  "pain_indicators": "where they are likely feeling friction right now based on all signals — website gaps, tech stack, activity"
}`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let intel: IntelData
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const block = msg.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type')

    // Strip any accidental markdown fences
    const raw = block.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    intel = JSON.parse(raw)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude API error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const { error: saveError } = await db
    .from('prospects')
    .update({
      intel,
      intel_generated_at: new Date().toISOString(),
      outreach_hook: intel.outreach_hook,
    })
    .eq('id', id)

  if (saveError) {
    console.error('[intel] DB write failed:', saveError.message)
    return NextResponse.json({ error: `Failed to save intel: ${saveError.message}` }, { status: 500 })
  }

  return NextResponse.json(intel)
}
