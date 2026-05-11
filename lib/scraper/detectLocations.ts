export interface LocationsDetection {
  locationCount: number
  isMultiLocation: boolean
}

const MULTI_LOCATION_TEXT = [
  'our locations',
  'find a location',
  'all locations',
  'location near',
  'nearest location',
  'find us near',
  'multiple locations',
]

export function detectLocations(html: string): LocationsDetection {
  const lower = html.toLowerCase()

  const hasLocationPageLink = /href=["'][^"']*\/locations[^"']*["']/i.test(html)
  const hasLocationText = MULTI_LOCATION_TEXT.some((t) => lower.includes(t))

  // Count nav/footer links that look like location entries
  const locationLinkMatches = html.match(/href=["'][^"']*\/location[s]?\/[^"']+["']/gi) ?? []
  const locationCount = locationLinkMatches.length > 1 ? locationLinkMatches.length : hasLocationText || hasLocationPageLink ? 2 : 1

  return {
    locationCount,
    isMultiLocation: locationCount > 1 || hasLocationText || hasLocationPageLink,
  }
}
