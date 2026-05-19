import type { IndustryTemplate } from '@/types'

export const FALLBACK_TEMPLATES: Omit<IndustryTemplate, 'created_at'>[] = [
  {
    id: 'med_spa',
    name: 'Med Spa / Aesthetics',
    slug: 'med_spa',
    sort_order: 1,
    default_keywords: [
      'Morpheus8', 'RF Microneedling', 'Fillers', 'Botox', 'Laser Resurfacing',
      'CoolSculpting', 'EmSculpt', 'Ultherapy', 'Kybella', 'PRP',
      'Sylfirm X', 'AviClear', 'Skinvive', 'Profhilo', 'Polynucleotides',
      'InstaLift', 'Sculptra', 'Renuvion', 'J-Plasma', 'Emface',
      'Exion', 'FaceTite', 'Thermage FLX', 'Sofwave', 'Genius RF',
      'Profound RF', 'Scarlet RF', 'Potenza RF Microneedling',
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
    id: 'restoration',
    name: 'Restoration / Remediation',
    slug: 'restoration',
    sort_order: 8,
    default_keywords: [
      'Water Damage Restoration', 'Fire Damage Restoration', 'Mold Remediation',
      'Smoke Damage Restoration', 'Flood Restoration', 'Storm Damage Restoration',
      'Disaster Restoration', 'Structural Drying', 'Contents Restoration', 'Biohazard Cleanup',
    ],
  },
  {
    id: 'custom',
    name: 'Other / Custom',
    slug: 'custom',
    sort_order: 9,
    default_keywords: [],
  },
]
