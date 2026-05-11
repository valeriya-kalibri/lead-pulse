export interface CRMDetection {
  crmPlatform: string | null
}

const CRM_PATTERNS: Array<{ pattern: string; name: string }> = [
  { pattern: 'js.hs-scripts.com', name: 'HubSpot' },
  { pattern: 'hs-analytics.net', name: 'HubSpot' },
  { pattern: 'hubspot.com', name: 'HubSpot' },
  { pattern: 'pardot.com', name: 'Salesforce' },
  { pattern: 'salesforce.com', name: 'Salesforce' },
  { pattern: 'trackcmp.net', name: 'ActiveCampaign' },
  { pattern: 'activecampaign.com', name: 'ActiveCampaign' },
  { pattern: 'zoho.com', name: 'Zoho' },
  { pattern: 'infusionsoft.com', name: 'Keap' },
  { pattern: 'keap.com', name: 'Keap' },
  { pattern: 'msgsndr.com', name: 'GoHighLevel' },
  { pattern: 'highlevel.com', name: 'GoHighLevel' },
  { pattern: 'klaviyo.com', name: 'Klaviyo' },
]

export function detectCRM(html: string): CRMDetection {
  const lower = html.toLowerCase()

  for (const { pattern, name } of CRM_PATTERNS) {
    if (lower.includes(pattern)) return { crmPlatform: name }
  }

  return { crmPlatform: null }
}
