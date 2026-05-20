import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

const SYSTEM_PROMPT =
  'You are a cold outreach copywriter. Write personalized cold email sequences for sales reps. Each email must reference specific facts about the prospect — never use generic placeholders. Return only valid JSON, no preamble, no markdown.'

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
    .select('*, prospect_lists(industry_name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (prospect.score === 'cold') {
    return NextResponse.json({ error: 'Email sequences not available for Cold prospects' }, { status: 400 })
  }
  if (!prospect.intel) {
    return NextResponse.json({ error: 'Generate an Intel Card first' }, { status: 400 })
  }

  const forceRefresh = new URL(req.url).searchParams.get('refresh') === '1'
  if (prospect.sequence_generated_at && !forceRefresh) {
    return NextResponse.json({
      outreach_email_subject_1: prospect.outreach_email_subject_1,
      outreach_email_body_1: prospect.outreach_email_body_1,
      outreach_email_subject_2: prospect.outreach_email_subject_2,
      outreach_email_body_2: prospect.outreach_email_body_2,
      outreach_email_subject_3: prospect.outreach_email_subject_3,
      outreach_email_body_3: prospect.outreach_email_body_3,
    })
  }

  const intel = prospect.intel as {
    outreach_hook: string
    business_summary: string
    owner_profile: string
    social_signals: string
    conversation_starters: string[]
    pain_indicators: string
  }

  const industry = (prospect.prospect_lists as { industry_name: string | null } | null)?.industry_name ?? 'Unknown'

  const userMessage = `Write a 3-step cold email sequence for this prospect.

BUSINESS: ${prospect.business_name || 'Unknown'}
WEBSITE: ${prospect.website_url}
LOCATION: ${prospect.city || ''}${prospect.city && prospect.state ? ', ' : ''}${prospect.state || ''}
INDUSTRY: ${industry}
SCORE: ${prospect.score}
SCORE REASON: ${prospect.score_reason || ''}

INTEL:
Outreach Hook: ${intel.outreach_hook}
Business Summary: ${intel.business_summary}
Owner Profile: ${intel.owner_profile}
Social Signals: ${intel.social_signals}
Conversation Starters: ${intel.conversation_starters.join(' | ')}
Pain Indicators: ${intel.pain_indicators}

QUALIFICATION:
- Has Chatbot: ${prospect.has_chatbot}
- Has Contact Form: ${prospect.has_contact_form}
- Has Online Booking: ${prospect.has_online_booking}
- CRM/EMR Platform: ${prospect.crm_emr_platform || 'none'}
- Services Detected: ${prospect.high_ticket_services?.join(', ') || 'none'}
- Locations: ${prospect.location_count ?? 1}

Email writing rules:
- Plain text, conversational, sounds like a real human (not a marketing tool)
- No bullet points in email bodies
- No "I hope this finds you well" or generic openers
- Do NOT use any person's name anywhere in the subject or body — no owner names, no contact names, nothing. Names will be added by the sender in Apollo.
- Each email takes a different angle — never repeat the same point
- Short subject lines — 4-7 words, no punctuation
- Email 1: Lead with the outreach hook, expand into 3-4 short paragraphs, end with one soft question
- Email 2: Different angle from Email 1, reference prior outreach briefly, 2-3 paragraphs
- Email 3: 2-3 sentences max, low pressure, leaves door open

Return only valid JSON:
{
  "outreach_email_subject_1": "subject line",
  "outreach_email_body_1": "full email body",
  "outreach_email_subject_2": "subject line",
  "outreach_email_body_2": "full email body",
  "outreach_email_subject_3": "subject line",
  "outreach_email_body_3": "full email body"
}`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let sequence: {
    outreach_email_subject_1: string
    outreach_email_body_1: string
    outreach_email_subject_2: string
    outreach_email_body_2: string
    outreach_email_subject_3: string
    outreach_email_body_3: string
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const block = msg.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type')

    const raw = block.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    sequence = JSON.parse(raw)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude API error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  await db
    .from('prospects')
    .update({
      ...sequence,
      sequence_generated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Track usage
  const month = new Date().toISOString().slice(0, 7)
  await db.rpc('increment_sequence_usage', { p_user_id: user.id, p_month: month, p_count: 1 })

  return NextResponse.json(sequence)
}
