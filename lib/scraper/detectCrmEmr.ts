export interface CrmEmrDetection {
  crmEmrPlatform: string | null
}

const PLATFORMS: Array<{ pattern: string; name: string }> = [
  { pattern: 'vagaro.com', name: 'Vagaro' },
  { pattern: 'mindbodyonline.com', name: 'Mindbody' },
  { pattern: 'booker.com', name: 'Mindbody' },
  { pattern: 'joinblvd.com', name: 'Boulevard' },
  { pattern: 'aestheticrecord.com', name: 'Aesthetic Record' },
  { pattern: 'janeapp.com', name: 'Jane App' },
  { pattern: 'zenoti.com', name: 'Zenoti' },
  { pattern: 'patientnow.com', name: 'PatientNow' },
  { pattern: 'nextech.com', name: 'Nextech' },
  { pattern: 'acuityscheduling.com', name: 'Acuity' },
]

export function detectCrmEmr(html: string): CrmEmrDetection {
  const lower = html.toLowerCase()

  for (const { pattern, name } of PLATFORMS) {
    if (lower.includes(pattern)) return { crmEmrPlatform: name }
  }

  return { crmEmrPlatform: null }
}
