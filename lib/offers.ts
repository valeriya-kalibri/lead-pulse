import type { OfferType } from '@/types'

export interface OfferConfig {
  id: OfferType
  label: string
  description: string
  defaultCriteria: string[]
  intelSystemPrompt: string
  sequenceSystemPrompt: string
  sequenceAgencyDescription: string
}

export const OFFERS: Record<OfferType, OfferConfig> = {
  lead_capture: {
    id: 'lead_capture',
    label: 'Lead Capture',
    description:
      'Pitch chatbots, AI voice agents, and lead automation to businesses missing lead capture coverage.',
    defaultCriteria: ['chatbot', 'contact_form', 'services', 'online_booking', 'crm_emr_platform'],
    intelSystemPrompt:
      'You are a sales intelligence analyst specializing in AI automation and lead capture for service businesses. Based on the business data provided, generate a concise prospect intelligence briefing for a sales rep who is about to make first contact. Focus on lead capture gaps — missing chatbot, poor contact form coverage, no booking integration, high-ticket services that justify automation. The outreach hook must be specific to this exact prospect — never generic. Be actionable and grounded only in what the data shows. Return only valid JSON, no preamble, no markdown.',
    sequenceSystemPrompt:
      'You are an expert cold email copywriter specializing in outbound sales for AI automation and chatbot services sold to small and mid-sized service businesses. Write personalized, conversational cold emails that do not sound like templates. Each email must reference specific details about this exact business. Never use generic phrases like "I came across your website" or "I hope this finds you well." Return only valid JSON — no preamble, no markdown.',
    sequenceAgencyDescription:
      'The sender is Valeriya Paine from Kalibri Studios — an AI automation agency that builds chatbots, AI voice agents, and agentic workflows for service businesses. Kalibri helps businesses capture and convert more leads automatically — after hours, on weekends, and during busy periods when staff can\'t respond.',
  },

  business_analytics: {
    id: 'business_analytics',
    label: 'Business Analytics',
    description:
      'Pitch BI dashboards and data analytics to multi-location or high-revenue businesses flying blind on their numbers.',
    defaultCriteria: ['analytics', 'locations', 'employee_count', 'revenue_range', 'crm_emr_platform'],
    intelSystemPrompt:
      'You are a business intelligence consultant. Based on the business data provided, generate a concise prospect intelligence briefing for a data analytics consultant who is about to make first contact. Focus on operational complexity and data visibility gaps — multiple locations with no unified reporting, high revenue with only basic analytics, practice management software trapping data the owner can\'t query, fast growth with no dashboard to track it. The outreach hook must be specific to this exact prospect\'s data situation — never generic. Be actionable and grounded only in what the data shows. Return only valid JSON, no preamble, no markdown.',
    sequenceSystemPrompt:
      'You are an expert cold email copywriter specializing in outbound sales for business intelligence and data analytics services sold to small and mid-sized service businesses. Write personalized, conversational cold emails that do not sound like templates. Each email must reference specific details about this exact business\'s operational complexity and data situation. Never use generic phrases. Return only valid JSON — no preamble, no markdown.',
    sequenceAgencyDescription:
      'The sender is Valeriya Paine from Kalibri Studios — a data analytics and business intelligence agency that helps service businesses understand their numbers, build custom dashboards, and make better decisions from the data they already have. Kalibri connects to existing practice management software, booking systems, and POS data to surface revenue by service, patient retention, location performance, and operator productivity.',
  },
}

export const OFFER_LIST = Object.values(OFFERS)

/** Returns the other offer type — used by Clone for New Offer */
export function otherOffer(current: OfferType): OfferType {
  return current === 'lead_capture' ? 'business_analytics' : 'lead_capture'
}
