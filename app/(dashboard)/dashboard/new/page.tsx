import { createClient } from '@/lib/supabase/server'
import NewListForm from './NewListForm'
import type { IndustryTemplate } from '@/types'
import { FALLBACK_TEMPLATES } from '@/lib/templates'

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
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2E3A59] mb-1">New Prospect List</h1>
        <p className="text-sm text-gray-500">Upload a CSV, pick your criteria, and let LeadPulse qualify each prospect automatically.</p>
      </div>
      <NewListForm templates={templates} />
    </div>
  )
}
