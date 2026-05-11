export interface Criterion {
  id: string
  label: string
  description: string
}

export const CRITERIA_LIST: Criterion[] = [
  {
    id: 'chatbot',
    label: 'Chatbot Detection',
    description: 'Checks for existing live chat or chatbot widgets',
  },
  {
    id: 'services',
    label: 'High-Ticket Services',
    description: 'Detects service keywords from the list',
  },
  {
    id: 'contact_form',
    label: 'Contact Form Detection',
    description: 'Detects lead capture forms that are not booking widgets',
  },
  {
    id: 'crm_emr',
    label: 'CRM / EMR Platform',
    description: 'Identifies practice management or booking software in use',
  },
  {
    id: 'locations',
    label: 'Number of Locations',
    description: 'Single vs multi-location detection',
  },
  {
    id: 'online_booking',
    label: 'Online Booking Present',
    description: 'Booking button or scheduling link on site',
  },
  {
    id: 'analytics',
    label: 'Analytics Platform',
    description: 'Detects GA, GTM, or BI tools',
  },
  {
    id: 'crm',
    label: 'CRM Detection',
    description: 'Identifies which CRM they are running',
  },
  {
    id: 'employee_count',
    label: 'Employee Count',
    description: 'Manual field — shows as editable column in results',
  },
  {
    id: 'revenue_range',
    label: 'Revenue Range',
    description: 'Manual field — shows as editable column in results',
  },
  {
    id: 'city',
    label: 'City',
    description: 'Auto-detected from CSV — filter prospects by city',
  },
  {
    id: 'state',
    label: 'State',
    description: 'Auto-detected from CSV — filter prospects by state',
  },
]

export const ALL_CRITERIA = CRITERIA_LIST.map((c) => c.id)
