import type { Score, OfferType } from '@/types'

export interface ScoreResult {
  score: Score
  score_reason: string
  outreach_hook: string
}

// ─── Lead Capture helpers ─────────────────────────────────────────────────────

// contact_form criterion scores on !hasOnlineBooking:
//   they lack proper automated booking capture → high opportunity
// online_booking is informational only (column + filter), not a scoring signal
const LC_SCORING_CRITERIA = ['chatbot', 'services', 'contact_form'] as const

function scoreLeadCapture(params: {
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

  const activeScoringCriteria = LC_SCORING_CRITERIA.filter((c) => criteria.includes(c))
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
    } else if (
      criteria.includes('contact_form') &&
      hasContactForm !== 'yes' &&
      hasOnlineBooking !== 'yes'
    ) {
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

// ─── Business Analytics helpers ───────────────────────────────────────────────

function isBasicAnalytics(platform: string | null): boolean {
  if (!platform) return true
  const p = platform.toLowerCase()
  // Only basic GA / GTM — not yet using real BI tools
  return (
    p === 'google analytics' ||
    p === 'google tag manager' ||
    p.replace(/,\s*/g, ' ') === 'google analytics google tag manager' ||
    p.replace(/,\s*/g, ' ') === 'google tag manager google analytics'
  )
}

function isAdvancedAnalytics(platform: string | null): boolean {
  if (!platform) return false
  const p = platform.toLowerCase()
  return (
    p.includes('mixpanel') ||
    p.includes('hotjar') ||
    p.includes('segment') ||
    p.includes('amplitude') ||
    p.includes('heap')
  )
}

function isHighRevenue(revenueRange: string | null): boolean {
  if (!revenueRange) return false
  return revenueRange.includes('$1M') || revenueRange.includes('$5M')
}

function isMediumRevenue(revenueRange: string | null): boolean {
  if (!revenueRange) return false
  return revenueRange.includes('$500K')
}

function scoreBusinessAnalytics(params: {
  analyticsPlatform: string | null
  locationCount: number | null
  isMultiLocation: boolean | null
  revenueRange: string | null
  employeeCount: string | null
  crmEmrPlatform: string | null
  criteria: string[]
}): ScoreResult {
  const {
    analyticsPlatform,
    locationCount,
    isMultiLocation,
    revenueRange,
    crmEmrPlatform,
    criteria,
  } = params

  const isMulti = isMultiLocation === true || (locationCount !== null && locationCount > 1)
  const locationStr =
    locationCount && locationCount > 1 ? `${locationCount} locations` : 'multiple locations'
  const basicAnalytics = isBasicAnalytics(analyticsPlatform)
  const advancedAnalytics = isAdvancedAnalytics(analyticsPlatform)
  const highRevenue = isHighRevenue(revenueRange)
  const medRevenue = isMediumRevenue(revenueRange)
  const hasCrmEmr = Boolean(crmEmrPlatform)

  // COLD — already data-forward with advanced BI tools
  if (criteria.includes('analytics') && advancedAnalytics) {
    return {
      score: 'cold',
      score_reason: `Already using ${analyticsPlatform} — data-forward, harder sell`,
      outreach_hook: `Already using ${analyticsPlatform} — deprioritize for analytics pitch`,
    }
  }

  // HOT — multi-location with no reporting layer beyond basic analytics
  if (criteria.includes('locations') && isMulti && basicAnalytics) {
    return {
      score: 'hot',
      score_reason: `${locationStr} with no reporting layer beyond ${analyticsPlatform ?? 'basic analytics'}`,
      outreach_hook: `Running ${locationStr} with no unified reporting layer — making decisions blind`,
    }
  }

  // HOT — high revenue, basic or no analytics
  if (criteria.includes('revenue_range') && highRevenue && basicAnalytics) {
    return {
      score: 'hot',
      score_reason: `${revenueRange} revenue with only ${analyticsPlatform ?? 'no analytics'} — significant data blind spot`,
      outreach_hook: `At ${revenueRange} in revenue with only ${analyticsPlatform ?? 'no analytics'} — flying blind on what drives growth`,
    }
  }

  // WARM — medium revenue, basic analytics
  if (medRevenue && basicAnalytics) {
    return {
      score: 'warm',
      score_reason: `${revenueRange} revenue with basic analytics — likely outgrowing current reporting`,
      outreach_hook: `${revenueRange} revenue with only basic analytics — worth a conversation`,
    }
  }

  // WARM — has CRM/EMR platform, data trapped inside, no analytics layer on top
  if (criteria.includes('crm_emr_platform') && hasCrmEmr && basicAnalytics) {
    return {
      score: 'warm',
      score_reason: `Using ${crmEmrPlatform} with no analytics layer — data trapped in the platform`,
      outreach_hook: `${crmEmrPlatform} holds all your business data — no layer to surface what it means`,
    }
  }

  // WARM — multi-location but has partial analytics (not advanced, not basic)
  if (criteria.includes('locations') && isMulti && !basicAnalytics && !advancedAnalytics) {
    return {
      score: 'warm',
      score_reason: `${locationStr} with partial analytics coverage — unified view likely missing`,
      outreach_hook: `${locationStr} with partial analytics coverage — no unified view across sites`,
    }
  }

  return {
    score: 'cold',
    score_reason: 'Limited signals of analytics fit',
    outreach_hook: 'Low fit for analytics pitch — save for other offer',
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function scoreProspect(params: {
  hasChat: 'yes' | 'no' | 'unknown'
  chatPlatform: string | null
  hasOnlineBooking: 'yes' | 'no' | 'unknown'
  hasContactForm: 'yes' | 'no' | 'unknown'
  highTicketServices: string[]
  analyticsPlatform?: string | null
  locationCount?: number | null
  isMultiLocation?: boolean | null
  revenueRange?: string | null
  employeeCount?: string | null
  crmEmrPlatform?: string | null
  criteria: string[]
  offerType?: OfferType
}): ScoreResult {
  const offerType = params.offerType ?? 'lead_capture'

  if (offerType === 'business_analytics') {
    return scoreBusinessAnalytics({
      analyticsPlatform: params.analyticsPlatform ?? null,
      locationCount: params.locationCount ?? null,
      isMultiLocation: params.isMultiLocation ?? null,
      revenueRange: params.revenueRange ?? null,
      employeeCount: params.employeeCount ?? null,
      crmEmrPlatform: params.crmEmrPlatform ?? null,
      criteria: params.criteria,
    })
  }

  return scoreLeadCapture({
    hasChat: params.hasChat,
    chatPlatform: params.chatPlatform,
    hasOnlineBooking: params.hasOnlineBooking,
    hasContactForm: params.hasContactForm,
    highTicketServices: params.highTicketServices,
    criteria: params.criteria,
  })
}
