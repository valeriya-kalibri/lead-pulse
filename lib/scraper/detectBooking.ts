export interface BookingDetection {
  hasOnlineBooking: 'yes' | 'no'
}

const BOOKING_CTAS = [
  'book now',
  'book appointment',
  'book online',
  'book a visit',
  'schedule now',
  'schedule appointment',
  'schedule online',
  'request appointment',
  'reserve now',
  'book a consultation',
  'schedule a consultation',
  'book your',
]

const BOOKING_EMBEDS = [
  'acuityscheduling.com/embed',
  'calendly.com/inline',
  'vagaro.com/widget',
  'squareup.com/appointments/buyer/widget',
  'mindbodyonline.com/widget',
]

export function detectBooking(html: string): BookingDetection {
  const lower = html.toLowerCase()
  const hasCTA = BOOKING_CTAS.some((kw) => lower.includes(kw))
  const hasEmbed = BOOKING_EMBEDS.some((kw) => lower.includes(kw))
  return { hasOnlineBooking: hasCTA || hasEmbed ? 'yes' : 'no' }
}
