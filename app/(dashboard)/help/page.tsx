import HowItWorks from '@/components/HowItWorks'
import HowListsWork from '@/components/HowListsWork'
import HowCSVImportWorks from '@/components/HowCSVImportWorks'
import HowEmailSequencingWorks from '@/components/HowEmailSequencingWorks'
import HubSpotApolloFieldGuide from '@/components/HubSpotApolloFieldGuide'

export default function HelpPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#2E3A59]">Help</h1>
        <p className="text-sm text-gray-500 mt-0.5">How LeadPulse works, email sequencing, and HubSpot &amp; Apollo field setup.</p>
      </div>

      <HowItWorks />
      <HowListsWork />
      <HowCSVImportWorks />
      <HowEmailSequencingWorks />
      <HubSpotApolloFieldGuide />
    </div>
  )
}
