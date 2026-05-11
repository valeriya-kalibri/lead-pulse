import type { Score } from '@/types'

export interface ScoreResult {
  score: Score
  score_reason: string
  outreach_hook: string
}

// contact_form criterion scores on !hasOnlineBooking:
//   they lack proper automated booking capture → high opportunity
// online_booking is informational only (column + filter), not a scoring signal
const SCORING_CRITERIA = ['chatbot', 'services', 'contact_form'] as const

export function scoreProspect(params: {
  hasChat: 'yes' | 'no' | 'unknown'
  chatPlatform: string | null
  hasOnlineBooking: 'yes' | 'no' | 'unknown'
  hasContactForm: 'yes' | 'no' | 'unknown'
  highTicketServices: string[]
  criteria: string[]
}): ScoreResult {
  const { hasChat, chatPlatform, hasOnlineBooking, hasContactForm, highTicketServices, criteria } =
    params
  const noChat = hasChat === 'no'
  const hasServices = highTicketServices.length > 0
  // contact_form positive signal = they lack confirmed booking (opportunity for better lead capture)
  const needsCapture = hasOnlineBooking !== 'yes'

  const activeScoringCriteria = SCORING_CRITERIA.filter((c) => criteria.includes(c))
  const total = activeScoringCriteria.length

  if (total === 0) {
    return {
      score: 'cold',
      score_reason: 'No scoring criteria selected',
      outreach_hook: 'Unable to score — no criteria configured',
    }
  }

  // Chatbot already present → always Cold regardless of other signals
  if (criteria.includes('chatbot') && hasChat === 'yes') {
    return {
      score: 'cold',
      score_reason: `Already using ${chatPlatform ?? 'a chatbot'}`,
      outreach_hook: `Already using ${chatPlatform ?? 'a chatbot'} — low priority`,
    }
  }

  const factMap: Record<string, boolean> = {
    chatbot: noChat,
    services: hasServices,
    contact_form: needsCapture,
  }

  const positiveCount = activeScoringCriteria.filter((c) => factMap[c]).length

  // Build human-readable signal list
  const positiveReasons: string[] = []
  if (criteria.includes('chatbot') && noChat) positiveReasons.push('no chatbot')
  if (criteria.includes('services') && hasServices)
    positiveReasons.push(`offers ${highTicketServices[0]}`)
  if (criteria.includes('contact_form')) {
    if (hasContactForm === 'yes' && hasOnlineBooking !== 'yes')
      positiveReasons.push('has contact form but no booking widget')
    else if (hasContactForm !== 'yes' && hasOnlineBooking !== 'yes')
      positiveReasons.push('no lead capture of any kind')
    else if (hasOnlineBooking === 'yes')
      positiveReasons.push('has online booking — some capture in place')
  }

  if (positiveCount === total) {
    const serviceSnippet = highTicketServices.slice(0, 2).join(' and ')
    let hook: string
    if (criteria.includes('contact_form') && hasContactForm === 'yes' && hasOnlineBooking !== 'yes') {
      hook = serviceSnippet
        ? `Has contact form but no booking widget — ${serviceSnippet} — replace with chatbot`
        : `Has contact form but no booking widget — prime chatbot candidate`
    } else if (criteria.includes('contact_form') && hasContactForm !== 'yes' && hasOnlineBooking !== 'yes') {
      hook = serviceSnippet
        ? `Completely uncovered — no chatbot, no booking, no form — ${serviceSnippet} suite`
        : `No lead capture at all — completely uncovered`
    } else {
      hook = serviceSnippet
        ? `No chatbot detected — ${serviceSnippet} suite present — perfect fit`
        : `Strong prospect — ${positiveReasons.join(', ')}`
    }
    return {
      score: 'hot',
      score_reason: positiveReasons.join(', ') || 'All selected criteria met',
      outreach_hook: hook,
    }
  }

  if (positiveCount >= Math.ceil(total / 2) && positiveCount > 0) {
    return {
      score: 'warm',
      score_reason: positiveReasons.join(', ') || 'Partial criteria met',
      outreach_hook: `Solid prospect — ${positiveReasons.join(', ')} — worth a conversation`,
    }
  }

  return {
    score: 'cold',
    score_reason: 'Limited signals of high-value intent',
    outreach_hook: 'Low signal prospect — save for nurture sequence',
  }
}
