export interface PlatformsDetection {
  bookingPlatform: string | null
  emrPlatform: string | null
}

const BOOKING_PLATFORMS: Array<{ pattern: string; name: string }> = [
  { pattern: 'vagaro.com', name: 'Vagaro' },
  { pattern: 'mindbodyonline.com', name: 'Mindbody' },
  { pattern: 'booker.com', name: 'Mindbody' },
  { pattern: 'joinblvd.com', name: 'Boulevard' },
  { pattern: 'acuityscheduling.com', name: 'Acuity' },
  { pattern: 'squareup.com/appointments', name: 'Square' },
  { pattern: 'janeapp.com', name: 'Jane App' },
  { pattern: 'calendly.com', name: 'Calendly' },
]

const EMR_PLATFORMS: Array<{ pattern: string; name: string }> = [
  { pattern: 'aestheticrecord.com', name: 'Aesthetic Record' },
  { pattern: 'patientnow.com', name: 'PatientNOW' },
  { pattern: 'zenoti.com', name: 'Zenoti' },
  { pattern: 'boulevard', name: 'Boulevard' },
]

export function detectPlatforms(html: string): PlatformsDetection {
  const lower = html.toLowerCase()

  let bookingPlatform: string | null = null
  for (const { pattern, name } of BOOKING_PLATFORMS) {
    if (lower.includes(pattern)) {
      bookingPlatform = name
      break
    }
  }

  let emrPlatform: string | null = null
  for (const { pattern, name } of EMR_PLATFORMS) {
    if (lower.includes(pattern)) {
      emrPlatform = name
      break
    }
  }

  return { bookingPlatform, emrPlatform }
}
