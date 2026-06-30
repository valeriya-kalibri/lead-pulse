import HowItWorks from '@/components/HowItWorks'
import HowListsWork from '@/components/HowListsWork'
import HowCSVImportWorks from '@/components/HowCSVImportWorks'
import HowEmailSequencingWorks from '@/components/HowEmailSequencingWorks'
import HubSpotApolloFieldGuide from '@/components/HubSpotApolloFieldGuide'
import PlansOverview from '@/components/PlansOverview'

export default function HelpPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-brand">Help</h1>
        <p className="text-sm text-gray-500 mt-0.5">How LeadPulse works, email sequencing, and HubSpot &amp; Apollo field setup.</p>
      </div>

      <HowItWorks />
      <HowListsWork />
      <HowCSVImportWorks />
      <HowEmailSequencingWorks />
      <HubSpotApolloFieldGuide />
      <PlansOverview />
    </div>
  )
}
