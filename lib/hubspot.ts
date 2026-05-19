import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProspectList } from '@/types'

const HUBSPOT_API_BASE = 'https://api.hubapi.com'

// ── Token management ───────────────────────────────────────────────────────────

interface TokenRow {
  hubspot_access_token: string | null
  hubspot_refresh_token: string | null
  hubspot_token_expires_at: string | null
}

export async function getValidToken(
  userId: string,
  tokens: TokenRow,
  db: SupabaseClient
): Promise<string> {
  if (!tokens.hubspot_access_token || !tokens.hubspot_refresh_token) {
    throw new Error('HubSpot account not connected. Connect it in Settings.')
  }

  const expiresAt = tokens.hubspot_token_expires_at
    ? new Date(tokens.hubspot_token_expires_at).getTime()
    : 0
  const needsRefresh = Date.now() > expiresAt - 5 * 60 * 1000

  if (!needsRefresh) return tokens.hubspot_access_token

  const res = await fetch(`${HUBSPOT_API_BASE}/oauth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      refresh_token: tokens.hubspot_refresh_token,
    }),
  })

  if (!res.ok) throw new Error('Failed to refresh HubSpot token. Reconnect in Settings.')

  const { access_token, refresh_token, expires_in } = await res.json()
  const expiresAtNew = new Date(Date.now() + expires_in * 1000).toISOString()

  await db.from('profiles').update({
    hubspot_access_token: access_token,
    hubspot_refresh_token: refresh_token,
    hubspot_token_expires_at: expiresAtNew,
  }).eq('id', userId)

  return access_token
}

// ── Custom property definitions ────────────────────────────────────────────────

interface PropOption {
  label: string
  value: string
  displayOrder: number
}

interface PropDef {
  name: string
  label: string
  type: string
  fieldType: string
  groupName: string
  options?: PropOption[]
}

const YES_NO_UNKNOWN: PropOption[] = [
  { label: 'Unknown', value: 'Unknown', displayOrder: 0 },
  { label: 'Yes',     value: 'Yes',     displayOrder: 1 },
  { label: 'No',      value: 'No',      displayOrder: 2 },
]

const APOLLO_STATUS_OPTIONS: PropOption[] = [
  { label: 'Not Enrolled', value: 'Not Enrolled', displayOrder: 0 },
  { label: 'Enrolled',     value: 'Enrolled',     displayOrder: 1 },
  { label: 'Replied',      value: 'Replied',      displayOrder: 2 },
  { label: 'Bounced',      value: 'Bounced',      displayOrder: 3 },
  { label: 'Completed',    value: 'Completed',    displayOrder: 4 },
]

// Shared property definitions — applied identically to both contacts and companies.
// groupName is set per-object-type when building the final PropDef arrays.
const SHARED_PROPS: Omit<PropDef, 'groupName'>[] = [
  { name: 'outreach_hook',            label: 'Outreach Hook',            type: 'string',      fieldType: 'text'     },
  { name: 'leadpulse_score',          label: 'LeadPulse Score',          type: 'string',      fieldType: 'text'     },
  { name: 'leadpulse_list_name',      label: 'LeadPulse List Name',      type: 'string',      fieldType: 'text'     },
  { name: 'leadpulse_filter_summary', label: 'LeadPulse Filter Summary', type: 'string',      fieldType: 'textarea' },
  { name: 'practice_platform',        label: 'Practice Platform',        type: 'string',      fieldType: 'text'     },
  { name: 'crm_platform',             label: 'CRM Platform',             type: 'string',      fieldType: 'text'     },
  { name: 'has_chatbot',              label: 'Has Chatbot',              type: 'enumeration', fieldType: 'select', options: YES_NO_UNKNOWN },
  { name: 'has_contact_form',         label: 'Has Contact Form',         type: 'enumeration', fieldType: 'select', options: YES_NO_UNKNOWN },
  { name: 'has_online_booking',       label: 'Has Online Booking',       type: 'enumeration', fieldType: 'select', options: YES_NO_UNKNOWN },
  { name: 'services_detected',        label: 'Services Detected',        type: 'string',      fieldType: 'text'     },
  { name: 'location_count',           label: 'Location Count',           type: 'number',      fieldType: 'number'   },
  { name: 'leadpulse_intel',          label: 'LeadPulse Intel',          type: 'string',      fieldType: 'textarea' },
  // V2 — Email Sequence
  { name: 'outreach_email_1_subject', label: 'Email 1 Subject',          type: 'string',      fieldType: 'text'     },
  { name: 'outreach_email_1_body',    label: 'Email 1 Body',             type: 'string',      fieldType: 'textarea' },
  { name: 'outreach_email_2_subject', label: 'Email 2 Subject',          type: 'string',      fieldType: 'text'     },
  { name: 'outreach_email_2_body',    label: 'Email 2 Body',             type: 'string',      fieldType: 'textarea' },
  { name: 'outreach_email_3_subject', label: 'Email 3 Subject',          type: 'string',      fieldType: 'text'     },
  { name: 'outreach_email_3_body',    label: 'Email 3 Body',             type: 'string',      fieldType: 'textarea' },
  { name: 'apollo_sequence_status',   label: 'Apollo Sequence Status',   type: 'enumeration', fieldType: 'select', options: APOLLO_STATUS_OPTIONS },
]

// Contact-only properties — not synced to company records
const CONTACT_ONLY_PROPS: Omit<PropDef, 'groupName'>[] = [
  { name: 'pain_indicators',       label: 'Pain Indicators',       type: 'string', fieldType: 'textarea' },
  { name: 'conversation_starters', label: 'Conversation Starters', type: 'string', fieldType: 'textarea' },
]

const CONTACT_CUSTOM_PROPS: PropDef[] = [
  ...SHARED_PROPS.map((p) => ({ ...p, groupName: 'contactinformation' })),
  ...CONTACT_ONLY_PROPS.map((p) => ({ ...p, groupName: 'contactinformation' })),
]
const COMPANY_CUSTOM_PROPS: PropDef[] = SHARED_PROPS.map((p) => ({ ...p, groupName: 'companyinformation' }))

// ── ensureCustomProperties ─────────────────────────────────────────────────────
//
// Called once per sync run. Fetches the existing property list for both
// contacts and companies and creates any that are missing. Idempotent.

async function listPropertyNames(
  apiKey: string,
  objectType: 'contacts' | 'companies'
): Promise<Set<string>> {
  const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/properties/${objectType}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return new Set()
  const data = await res.json()
  return new Set((data.results as Array<{ name: string }>).map((p) => p.name))
}

async function createPropertyIfMissing(
  apiKey: string,
  objectType: 'contacts' | 'companies',
  existing: Set<string>,
  prop: PropDef
): Promise<string | null> {
  if (existing.has(prop.name)) return null
  const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/properties/${objectType}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(prop),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { message?: string }).message ?? `HTTP ${res.status}`
    return `${objectType}.${prop.name}: ${msg}`
  }
  return null
}

export async function ensureCustomProperties(apiKey: string): Promise<string[]> {
  const [contactProps, companyProps] = await Promise.all([
    listPropertyNames(apiKey, 'contacts'),
    listPropertyNames(apiKey, 'companies'),
  ])
  const results = await Promise.all([
    ...CONTACT_CUSTOM_PROPS.map((p) =>
      createPropertyIfMissing(apiKey, 'contacts', contactProps, p)
    ),
    ...COMPANY_CUSTOM_PROPS.map((p) =>
      createPropertyIfMissing(apiKey, 'companies', companyProps, p)
    ),
  ])
  return results.filter((r): r is string => r !== null)
}

// ── getPortalId ────────────────────────────────────────────────────────────────
//
// Returns the HubSpot portal ID for the given API key. Used to build
// direct contact links in the UI (app.hubspot.com/contacts/{id}/contact/{cid}).

export async function getPortalId(apiKey: string): Promise<string | null> {
  const res = await fetch(`${HUBSPOT_API_BASE}/account-info/v3/details`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.portalId != null ? String(data.portalId) : null
}

// ── buildFilterSummary ─────────────────────────────────────────────────────────
//
// Generates the list-level summary string stored in prospect_lists.filter_summary
// and pushed to the leadpulse_filter_summary company property in HubSpot.

export function buildFilterSummary(
  list: Pick<ProspectList, 'name' | 'industry_name' | 'service_keywords' | 'selected_criteria'>
): string {
  const synced = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  })
  return [
    `LeadPulse List: ${list.name}`,
    `Industry: ${list.industry_name ?? 'Custom'}`,
    `Keywords: ${(list.service_keywords ?? []).join(', ')}`,
    `Criteria: ${(list.selected_criteria ?? []).join(', ')}`,
    `Score: hot, warm`,
    `Synced: ${synced}`,
  ].join('\n')
}
