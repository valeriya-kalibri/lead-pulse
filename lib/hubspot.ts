import type { Prospect, ProspectList } from '@/types'

const HUBSPOT_API_BASE = 'https://api.hubapi.com'

// ---- Custom property definitions ----

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
    type: 'bool',
    fieldType: 'booleancheckbox',
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

// ---- Step 1: Ensure custom properties exist ----

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

// ---- Portal ID ----

export async function getPortalId(apiKey: string): Promise<string | null> {
  const res = await fetch(`${HUBSPOT_API_BASE}/account-info/v3/details`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.portalId != null ? String(data.portalId) : null
}

// ---- Filter summary ----

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

// ---- Helpers ----

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
  }
}

async function searchHubSpot(
  apiKey: string,
  objectType: 'contacts' | 'companies',
  filterGroups: object[]
): Promise<string | null> {
  const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/${objectType}/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterGroups, limit: 1 }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return (data.results?.[0]?.id as string) ?? null
}

function splitName(name: string | null): { firstname: string; lastname: string } {
  if (!name) return { firstname: '', lastname: '' }
  const parts = name.trim().split(/\s+/)
  return { firstname: parts[0] ?? '', lastname: parts.slice(1).join(' ') }
}

// ---- Step A: Company sync ----

async function syncCompany(
  apiKey: string,
  prospect: Prospect,
  listName: string,
  filterSummary: string
): Promise<string> {
  const domain = extractDomain(prospect.website_url)

  const existingId = await searchHubSpot(apiKey, 'companies', [
    { filters: [{ propertyName: 'domain', operator: 'EQ', value: domain }] },
  ])

  const props: Record<string, string> = {
    name: prospect.business_name ?? '',
    website: prospect.website_url,
    city: prospect.city ?? '',
    state: prospect.state ?? '',
    practice_platform: prospect.crm_emr_platform ?? '',
    crm_platform: prospect.crm_platform ?? '',
    has_chatbot: prospect.has_chatbot === 'yes' ? 'true' : 'false',
    services_detected: (prospect.high_ticket_services ?? []).join(', '),
    leadpulse_score: prospect.score,
    leadpulse_list_name: listName,
    leadpulse_filter_summary: filterSummary,
  }

  if (prospect.location_count != null) {
    props.location_count = String(prospect.location_count)
  }
  if (prospect.employee_count) {
    const num = parseInt(prospect.employee_count)
    if (!isNaN(num)) props.numberofemployees = String(num)
  }

  const body = JSON.stringify({ properties: props })

  if (existingId) {
    await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies/${existingId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
    })
    return existingId
  }

  const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Company create failed: ${(err as { message?: string }).message ?? res.status}`)
  }
  const data = await res.json()
  return data.id as string
}

// ---- Step B: Contact sync ----

async function syncContact(
  apiKey: string,
  prospect: Prospect,
  listName: string
): Promise<string> {
  let existingId: string | null = null

  if (prospect.email) {
    existingId = await searchHubSpot(apiKey, 'contacts', [
      { filters: [{ propertyName: 'email', operator: 'EQ', value: prospect.email }] },
    ])
  }

  if (!existingId && prospect.phone) {
    existingId = await searchHubSpot(apiKey, 'contacts', [
      { filters: [{ propertyName: 'phone', operator: 'EQ', value: prospect.phone }] },
    ])
  }

  const { firstname, lastname } = splitName(prospect.contact_name)

  const props: Record<string, string> = {
    firstname,
    lastname,
    email: prospect.email ?? '',
    phone: prospect.phone ?? '',
    outreach_hook: prospect.outreach_hook ?? '',
    leadpulse_score: prospect.score,
    leadpulse_list_name: listName,
  }

  const body = JSON.stringify({ properties: props })

  if (existingId) {
    await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${existingId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
    })
    return existingId
  }

  const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Contact create failed: ${(err as { message?: string }).message ?? res.status}`)
  }
  const data = await res.json()
  return data.id as string
}

// ---- Step C: Associate contact to company ----

async function associateContactToCompany(
  apiKey: string,
  contactId: string,
  companyId: string
): Promise<void> {
  await fetch(
    `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}/associations/companies/${companyId}/contact_to_company`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    }
  )
}

// ---- Step D: Intel note ----

function formatNoteBody(prospect: Prospect): string {
  const intel = prospect.intel
  if (!intel) return ''

  const generated = prospect.intel_generated_at
    ? new Date(prospect.intel_generated_at).toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
      })
    : 'unknown'

  const starters = (intel.conversation_starters ?? [])
    .slice(0, 3)
    .map((s) => `- ${s}`)
    .join('\n')

  return [
    `LeadPulse Intel — Generated ${generated}`,
    '',
    `OUTREACH HOOK: ${prospect.outreach_hook ?? ''}`,
    '',
    `BUSINESS SUMMARY: ${intel.business_summary}`,
    '',
    `OWNER PROFILE: ${intel.owner_profile}`,
    '',
    `SOCIAL SIGNALS: ${intel.social_signals}`,
    '',
    'CONVERSATION STARTERS:',
    starters,
    '',
    `PAIN INDICATORS: ${intel.pain_indicators}`,
  ].join('\n')
}

async function createIntelNote(
  apiKey: string,
  prospect: Prospect,
  contactId: string,
  companyId: string
): Promise<string | null> {
  if (!prospect.intel) return null

  const res = await fetch(`${HUBSPOT_API_BASE}/engagements/v1/engagements`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      engagement: { active: true, type: 'NOTE' },
      associations: {
        contactIds: [parseInt(contactId, 10)],
        companyIds: [parseInt(companyId, 10)],
      },
      metadata: { body: formatNoteBody(prospect) },
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.engagement?.id != null ? String(data.engagement.id) : null
}

// ---- Main: sync one prospect through all steps ----

export interface ProspectSyncResult {
  contactId: string
  companyId: string
  noteId: string | null
}

export async function syncSingleProspect(
  apiKey: string,
  prospect: Prospect,
  listName: string,
  filterSummary: string
): Promise<ProspectSyncResult> {
  const companyId = await syncCompany(apiKey, prospect, listName, filterSummary)
  const contactId = await syncContact(apiKey, prospect, listName)
  await associateContactToCompany(apiKey, contactId, companyId)
  const noteId = await createIntelNote(apiKey, prospect, contactId, companyId)
  return { contactId, companyId, noteId }
}
