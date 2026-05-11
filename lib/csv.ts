import Papa from 'papaparse'
import type { Prospect } from '@/types'
import { ALL_CRITERIA } from '@/lib/criteria'

export interface ParsedRow {
  url: string
  business_name?: string
  employee_count?: string
  revenue_range?: string
  contact_name?: string
  phone?: string
  email?: string
  city?: string
  state?: string
}

// Strip everything except lowercase letters and digits — used on both header names
// and pattern strings so comparisons are purely structural.
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Return the first non-empty value from `row` whose normalized key matches any pattern.
function pick(row: Record<string, string>, ...patterns: string[]): string | undefined {
  for (const pattern of patterns) {
    const val = row[pattern]
    if (val?.trim()) return val.trim()
  }
  return undefined
}

// Apollo (and most CRM/enrichment tools) use inconsistent column names.
// Normalizing headers to bare alphanumeric lets a single pattern match all variants:
//   "# Employees", "Employee Count", "Num Employees" → "employees", "employeecount", "numemployees"
//   "Company Website URL", "Website", "Company Website" → "companywebsiteurl", "website", "companywebsite"

export function parseCSV(content: string): ParsedRow[] {
  const { data } = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => norm(h.trim()),
  })

  const rows: ParsedRow[] = []

  for (const row of data) {
    // ----- URL (required) -----
    const urlValue =
      pick(
        row,
        'website',
        'websiteurl',
        'companywebsite',
        'companywebsiteurl',
        'url',
        'domain',
        'site',
        'homepage',
        'webaddress',
        'companywebaddress',
      ) || Object.values(row).find((v) => /^https?:\/\//i.test(v?.trim() ?? ''))

    if (!urlValue?.trim()) continue

    let url = urlValue.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    // ----- Business / company name -----
    const business_name = pick(
      row,
      'company',
      'companyname',
      'accountname',
      'businessname',
      'organization',
      'orgname',
      'account',
    )

    // ----- Employee count -----
    // Apollo: "# Employees" → norm "employees"
    // Also handles: "Employee Count", "Number of Employees", "Headcount"
    const employee_count = pick(
      row,
      'employees',
      'employeecount',
      'numberofemployees',
      'numemployees',
      'headcount',
      'companysize',
      'teamsize',
      'staffcount',
    )

    // ----- Revenue -----
    // Apollo: "Annual Revenue" → norm "annualrevenue"
    const revenue_range = pick(
      row,
      'annualrevenue',
      'revenuerange',
      'revenue',
      'annualrev',
      'companyrevenue',
      'annualrevenuerange',
    )

    // ----- Contact name -----
    // Prefer an explicit full-name column; fall back to combining first + last.
    const explicitFullName = pick(row, 'fullname', 'contactname', 'contactfullname', 'personname')
    const firstName = pick(row, 'firstname', 'contactfirstname', 'fname') ?? ''
    const lastName = pick(row, 'lastname', 'contactlastname', 'lname', 'surname') ?? ''
    const combined = [firstName, lastName].filter(Boolean).join(' ')
    const contact_name = explicitFullName || combined || undefined

    // ----- Phone -----
    // Apollo exports: "Work Direct Phone", "Corporate Phone", "Direct Phone"
    const phone = pick(
      row,
      'workdirectphone',
      'directphone',
      'corporatephone',
      'phone',
      'phonenumber',
      'mobile',
      'mobilenumber',
      'telephone',
      'contactphone',
      'workphone',
      'businessphone',
    )

    // ----- Email -----
    const email = pick(
      row,
      'email',
      'emailaddress',
      'workemail',
      'contactemail',
      'businessemail',
      'primaryemail',
      'corporateemail',
    )

    // ----- City / State -----
    const city = pick(row, 'city', 'companycity', 'town')
    const state = pick(row, 'state', 'companystate', 'province', 'stateprovince', 'region')

    rows.push({
      url,
      business_name,
      employee_count,
      revenue_range,
      contact_name,
      phone,
      email,
      city,
      state,
    })
  }

  return rows
}

// Generate CSV export — criteria controls which scraped columns appear,
// but contact/enrichment fields are always included when present.
export function prospectsToCSV(prospects: Prospect[], criteria: string[] = ALL_CRITERIA): string {
  const rows = prospects.map((p) => {
    const base: Record<string, string | number | boolean | null> = {
      website_url: p.website_url,
      business_name: p.business_name ?? '',
      score: p.score,
      score_reason: p.score_reason ?? '',
      outreach_hook: p.outreach_hook ?? '',
      scraped_at: p.scraped_at ?? '',
    }

    // Contact / enrichment fields — always exported regardless of criteria
    base.contact_name = p.contact_name ?? ''
    base.email = p.email ?? ''
    base.phone = p.phone ?? ''

    // Criteria-gated scraped fields
    if (criteria.includes('chatbot')) {
      base.has_chatbot = p.has_chatbot ?? ''
      base.chatbot_platform = p.chatbot_platform ?? ''
    }
    if (criteria.includes('contact_form')) {
      base.has_contact_form = p.has_contact_form ?? ''
    }
    if (criteria.includes('services')) {
      base.high_ticket_services = (p.high_ticket_services ?? []).join(', ')
    }
    if (criteria.includes('crm_emr')) {
      base.crm_emr_platform = p.crm_emr_platform ?? ''
    }
    if (criteria.includes('crm')) {
      base.crm_platform = p.crm_platform ?? ''
    }
    if (criteria.includes('locations')) {
      base.location_count = p.location_count ?? ''
      base.is_multi_location = p.is_multi_location ?? ''
    }
    if (criteria.includes('online_booking')) {
      base.has_online_booking = p.has_online_booking ?? ''
    }
    if (criteria.includes('analytics')) {
      base.analytics_platform = p.analytics_platform ?? ''
    }
    if (criteria.includes('employee_count')) {
      base.employee_count = p.employee_count ?? ''
    }
    if (criteria.includes('revenue_range')) {
      base.revenue_range = p.revenue_range ?? ''
    }
    if (criteria.includes('city')) {
      base.city = p.city ?? ''
    }
    if (criteria.includes('state')) {
      base.state = p.state ?? ''
    }

    return base
  })

  return Papa.unparse(rows)
}
