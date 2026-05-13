import type { ProspectList } from '@/types'

const HUBSPOT_API_BASE = 'https://api.hubapi.com'

// ── Custom property definitions ────────────────────────────────────────────────

interface PropDef {
  name: string
  label: string
  type: string
  fieldType: string
  groupName: string
}

const CONTACT_CUSTOM_PROPS: PropDef[] = [
  {
    name: 'outreach_hook',
    label: 'Outreach Hook',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
  },
  {
    name: 'leadpulse_score',
    label: 'LeadPulse Score',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
  },
  {
    name: 'leadpulse_list_name',
    label: 'LeadPulse List Name',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
  },
]

const COMPANY_CUSTOM_PROPS: PropDef[] = [
  {
    name: 'practice_platform',
    label: 'Practice Platform',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
  },
  {
    name: 'crm_platform',
    label: 'CRM Platform',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
  },
  {
    name: 'has_chatbot',
    label: 'Has Chatbot',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
  },
  {
    name: 'has_contact_form',
    label: 'Has Contact Form',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
  },
  {
    name: 'has_online_booking',
    label: 'Has Online Booking',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
  },
  {
    name: 'services_detected',
    label: 'Services Detected',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
  },
  {
    name: 'location_count',
    label: 'Location Count',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
  },
  {
    name: 'leadpulse_score',
    label: 'LeadPulse Score',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
  },
  {
    name: 'leadpulse_list_name',
    label: 'LeadPulse List Name',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
  },
  {
    name: 'leadpulse_filter_summary',
    label: 'LeadPulse Filter Summary',
    type: 'string',
    fieldType: 'textarea',
    groupName: 'companyinformation',
  },
]

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
): Promise<void> {
  if (existing.has(prop.name)) return
  await fetch(`${HUBSPOT_API_BASE}/crm/v3/properties/${objectType}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(prop),
  })
}

export async function ensureCustomProperties(apiKey: string): Promise<void> {
  const [contactProps, companyProps] = await Promise.all([
    listPropertyNames(apiKey, 'contacts'),
    listPropertyNames(apiKey, 'companies'),
  ])
  await Promise.all([
    ...CONTACT_CUSTOM_PROPS.map((p) =>
      createPropertyIfMissing(apiKey, 'contacts', contactProps, p)
    ),
    ...COMPANY_CUSTOM_PROPS.map((p) =>
      createPropertyIfMissing(apiKey, 'companies', companyProps, p)
    ),
  ])
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
