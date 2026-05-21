import * as cheerio from 'cheerio'
import { detectChatbot } from './detectChatbot'
import { detectServices } from './detectServices'
import { detectCrmEmr } from './detectCrmEmr'
import { detectCRM } from './detectCRM'
import { detectContactForm } from './detectContactForm'
import { detectLocations } from './detectLocations'
import { detectBooking } from './detectBooking'
import { detectAnalytics } from './detectAnalytics'
import { scoreProspect } from './score'
import { ALL_CRITERIA } from '@/lib/criteria'
import type { Prospect, ErrorType, OfferType } from '@/types'

export interface ScrapeResult {
  success: boolean
  data?: Partial<Prospect>
  error?: string
  errorType?: ErrorType
}

function categorizeError(err: unknown, status?: number): ErrorType {
  if (status === 403 || status === 429) return 'BLOCKED'

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()

    if (err.name === 'AbortError' || msg.includes('abort') || msg.includes('timed out')) {
      return 'TIMEOUT'
    }
    if (
      msg.includes('getaddrinfo') ||
      msg.includes('enotfound') ||
      msg.includes('econnrefused') ||
      msg.includes('dns')
    ) {
      return 'DNS_FAILED'
    }
    if (
      msg.includes('certificate') ||
      msg.includes('ssl') ||
      msg.includes('tls') ||
      msg.includes('cert_') ||
      msg.includes('self signed')
    ) {
      return 'SSL_ERROR'
    }
    if (msg.includes('parse') || msg.includes('unexpected token') || msg.includes('invalid json')) {
      return 'PARSE_ERROR'
    }
    if (msg.includes('403') || msg.includes('blocked') || msg.includes('forbidden')) {
      return 'BLOCKED'
    }
  }

  return 'UNKNOWN'
}

/**
 * Run the full detection + scoring pipeline on already-fetched HTML.
 * Returns a ScrapeResult. Does NOT check for empty pages — caller is responsible.
 */
export function scrapeHtml(
  html: string,
  keywords: string[],
  criteria: string[] = ALL_CRITERIA,
  offerType: OfferType = 'lead_capture'
): ScrapeResult {
  const $full = cheerio.load(html)
  const businessName =
    $full('meta[property="og:site_name"]').attr('content') ||
    $full('title').text().split('|')[0].split('–')[0].split('-')[0].trim() ||
    null

  const chatbot = criteria.includes('chatbot')
    ? detectChatbot(html)
    : { hasChat: 'unknown' as const, platform: null }

  const services = criteria.includes('services')
    ? detectServices(html, keywords)
    : { services: [] }

  const crmEmr = criteria.includes('crm_emr')
    ? detectCrmEmr(html)
    : { crmEmrPlatform: null }

  const crm = criteria.includes('crm')
    ? detectCRM(html)
    : { crmPlatform: null }

  const locations = criteria.includes('locations')
    ? detectLocations(html)
    : { locationCount: null as number | null, isMultiLocation: null as boolean | null }

  const analytics = criteria.includes('analytics')
    ? detectAnalytics(html)
    : { analyticsPlatform: null }

  const needsBooking = criteria.includes('online_booking') || criteria.includes('contact_form')
  const booking = needsBooking ? detectBooking(html) : { hasOnlineBooking: 'unknown' as const }

  const contactForm = criteria.includes('contact_form')
    ? detectContactForm(html)
    : { hasContactForm: 'unknown' as const }

  const scored = scoreProspect({
    hasChat: chatbot.hasChat,
    chatPlatform: chatbot.platform,
    hasOnlineBooking: booking.hasOnlineBooking,
    hasContactForm: contactForm.hasContactForm,
    highTicketServices: services.services,
    analyticsPlatform: analytics.analyticsPlatform,
    locationCount: locations.locationCount,
    isMultiLocation: locations.isMultiLocation,
    crmEmrPlatform: crmEmr.crmEmrPlatform,
    criteria,
    offerType,
  })

  return {
    success: true,
    data: {
      business_name: businessName,
      has_chatbot: criteria.includes('chatbot') ? chatbot.hasChat : 'unknown',
      chatbot_platform: chatbot.platform,
      has_contact_form: criteria.includes('contact_form') ? contactForm.hasContactForm : 'unknown',
      has_online_booking: criteria.includes('online_booking') ? booking.hasOnlineBooking : 'unknown',
      ...(criteria.includes('crm_emr') && { crm_emr_platform: crmEmr.crmEmrPlatform }),
      ...(criteria.includes('crm') && { crm_platform: crm.crmPlatform }),
      ...(criteria.includes('services') && { high_ticket_services: services.services }),
      ...(criteria.includes('locations') && {
        location_count: locations.locationCount,
        is_multi_location: locations.isMultiLocation,
      }),
      ...(criteria.includes('analytics') && { analytics_platform: analytics.analyticsPlatform }),
      score: scored.score,
      score_reason: scored.score_reason,
      outreach_hook: scored.outreach_hook,
      scrape_status: 'complete',
      scraped_at: new Date().toISOString(),
    },
  }
}

export async function scrapeUrl(
  url: string,
  keywords: string[],
  criteria: string[] = ALL_CRITERIA,
  offerType: OfferType = 'lead_capture'
): Promise<ScrapeResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LeadPulse/1.0; +https://leadpulse.ai)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        errorType: categorizeError(null, response.status),
      }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Detect client-side SPA with no readable content
    $('script, style, noscript').remove()
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
    if (bodyText.length < 150) {
      return {
        success: false,
        error: 'Page appears to be client-side rendered with no readable HTML content',
        errorType: 'EMPTY_PAGE',
      }
    }

    return scrapeHtml(html, keywords, criteria, offerType)
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error, errorType: categorizeError(err) }
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
