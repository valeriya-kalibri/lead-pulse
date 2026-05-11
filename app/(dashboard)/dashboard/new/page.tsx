import { createClient } from '@/lib/supabase/server'
import NewListForm from './NewListForm'
import HowItWorks from './HowItWorks'
import type { IndustryTemplate } from '@/types'

const FALLBACK_TEMPLATES: Omit<IndustryTemplate, 'created_at'>[] = [
  {
    id: 'med_spa',
    name: 'Med Spa / Aesthetics',
    slug: 'med_spa',
    sort_order: 1,
    default_keywords: [
      'Morpheus8', 'RF Microneedling', 'Fillers', 'Botox', 'Laser Resurfacing',
      'CoolSculpting', 'EmSculpt', 'Ultherapy', 'Kybella', 'PRP',
    ],
  },
  {
    id: 'dental',
    name: 'Dental',
    slug: 'dental',
    sort_order: 2,
    default_keywords: [
      'Implants', 'Invisalign', 'Veneers', 'Full Mouth Reconstruction',
      'Smile Makeover', 'Teeth Whitening',
    ],
  },
  {
    id: 'legal',
    name: 'Legal',
    slug: 'legal',
    sort_order: 3,
    default_keywords: [
      'Personal Injury', 'Medical Malpractice', 'Immigration',
      'Criminal Defense', 'Estate Planning', 'Mass Tort',
    ],
  },
  {
    id: 'hvac',
    name: 'HVAC / Home Services',
    slug: 'hvac',
    sort_order: 4,
    default_keywords: [
      'Full System Replacement', 'Duct Replacement', 'Generator Install',
      'Whole-Home Repiping', 'Roof Replacement',
    ],
  },
  {
    id: 'real_estate',
    name: 'Real Estate',
    slug: 'real_estate',
    sort_order: 5,
    default_keywords: [
      'Luxury Listings', 'Commercial Properties', 'Property Management',
      'Investment Properties',
    ],
  },
  {
    id: 'wellness',
    name: 'Wellness / Chiro',
    slug: 'wellness',
    sort_order: 6,
    default_keywords: [
      'Spinal Decompression', 'Regenerative Therapy', 'IV Therapy',
      'Weight Loss Programs', 'Hormone Therapy',
    ],
  },
  {
    id: 'custom',
    name: 'Other / Custom',
    slug: 'custom',
    sort_order: 7,
    default_keywords: [],
  },
]

export default async function NewListPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('industry_templates')
    .select('*')
    .order('sort_order')

  const templates: IndustryTemplate[] =
    data && data.length > 0
      ? (data as IndustryTemplate[])
      : (FALLBACK_TEMPLATES as IndustryTemplate[])

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-[#2E3A59] mb-1">New Prospect List</h1>
      <p className="text-sm text-gray-500 mb-6">Upload a CSV of website URLs to qualify.</p>
      <HowItWorks />
      <NewListForm templates={templates} />
    </div>
  )
}
