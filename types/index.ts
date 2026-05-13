export type Plan = 'starter' | 'pro'
export type Role = 'admin' | 'user'
export type YesNoUnknown = 'yes' | 'no' | 'unknown'
export type ErrorType =
  | 'TIMEOUT'
  | 'BLOCKED'
  | 'DNS_FAILED'
  | 'PARSE_ERROR'
  | 'SSL_ERROR'
  | 'EMPTY_PAGE'
  | 'UNKNOWN'

export interface ErrorSummary {
  succeeded: number
  failed: number
  skipped: number
  by_error_type: Partial<Record<ErrorType, number>>
  avg_scrape_ms: number | null
}

export interface IntelData {
  outreach_hook: string
  business_summary: string
  owner_profile: string
  social_signals: string
  conversation_starters: string[]
  pain_indicators: string
}
export type Score = 'hot' | 'warm' | 'cold'
export type ScrapeStatus = 'pending' | 'processing' | 'complete' | 'error' | 'skipped'
export type ListStatus = 'pending' | 'processing' | 'complete' | 'error'
export type JobStatus = 'queued' | 'running' | 'complete' | 'error'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  plan: Plan
  role: Role
  hubspot_access_token: string | null
  hubspot_refresh_token: string | null
  hubspot_token_expires_at: string | null
  hubspot_portal_id: string | null
  created_at: string
  updated_at: string
}

export interface IndustryTemplate {
  id: string
  name: string
  slug: string
  default_keywords: string[]
  sort_order: number
  created_at: string
}

export interface ProspectList {
  id: string
  user_id: string
  name: string
  description: string | null
  industry_template_id: string | null
  industry_name: string | null
  service_keywords: string[]
  total_prospects: number
  hot_count: number
  warm_count: number
  cold_count: number
  status: ListStatus
  selected_criteria: string[] | null
  filter_summary: string | null
  created_at: string
  updated_at: string
}

export interface Prospect {
  id: string
  list_id: string
  user_id: string
  website_url: string
  business_name: string | null
  has_chatbot: YesNoUnknown | null
  chatbot_platform: string | null
  has_contact_form: YesNoUnknown | null
  has_online_booking: YesNoUnknown | null
  crm_emr_platform: string | null
  crm_platform: string | null
  high_ticket_services: string[] | null
  location_count: number | null
  is_multi_location: boolean | null
  analytics_platform: string | null
  employee_count: string | null
  revenue_range: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  score: Score
  score_reason: string | null
  outreach_hook: string | null
  scrape_status: ScrapeStatus
  scrape_error: string | null
  error_type: ErrorType | null
  scraped_at: string | null
  intel: IntelData | null
  intel_generated_at: string | null
  hubspot_contact_id: string | null
  hubspot_company_id: string | null
  hubspot_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface ScrapeJob {
  id: string
  list_id: string
  user_id: string
  total_urls: number
  processed_urls: number
  failed_urls: number
  status: JobStatus
  started_at: string | null
  completed_at: string | null
  error_summary: ErrorSummary | null
  created_at: string
}

export interface Usage {
  id: string
  user_id: string
  month: string
  prospects_scraped: number
  hubspot_synced: number
  created_at: string
  updated_at: string
}
