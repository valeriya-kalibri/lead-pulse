export interface ContactFormDetection {
  hasContactForm: 'yes' | 'no'
}

// Signals that a form is a booking widget, not a contact form
const BOOKING_SIGNALS = [
  'vagaro.com', 'mindbodyonline.com', 'joinblvd.com', 'acuityscheduling.com',
  'janeapp.com', 'zenoti.com', 'patientnow.com', 'nextech.com', 'aestheticrecord.com',
  'calendly.com', 'book an appointment', 'schedule appointment', 'schedule now',
  'book now', 'book online', 'reserve a time', 'pick a time',
]

const CONTACT_SUBMIT_PHRASES = [
  'contact us', 'send message', 'send us a message', 'get in touch',
  'request appointment', 'reach out', 'message us', 'contact',
]

export function detectContactForm(html: string): ContactFormDetection {
  const formMatches = [...html.matchAll(/<form[\s\S]*?<\/form>/gi)]

  for (const [formHtml] of formMatches) {
    const fl = formHtml.toLowerCase()

    // Skip forms that are booking widgets
    if (BOOKING_SIGNALS.some((sig) => fl.includes(sig))) continue

    // Check for typical contact form input fields
    const hasEmail =
      /type=["']email["']|name=["']email["']|placeholder=["'][^"']*email/i.test(formHtml)
    const hasName =
      /name=["'](?:full[_-]?name|first[_-]?name|your[_-]?name|name)["']|placeholder=["'][^"']*\bname\b/i.test(
        formHtml
      )
    const hasPhone =
      /type=["']tel["']|name=["']phone["']|placeholder=["'][^"']*phone/i.test(formHtml)
    const hasMessage =
      /<textarea|name=["']message["']|placeholder=["'][^"']*message/i.test(formHtml)

    const fieldCount = [hasEmail, hasName, hasPhone, hasMessage].filter(Boolean).length
    if (fieldCount < 2) continue

    // Must have a submit element (contact-like button text or a generic submit input)
    const hasSubmit =
      CONTACT_SUBMIT_PHRASES.some((phrase) => fl.includes(phrase)) ||
      /type=["']submit["']/i.test(formHtml) ||
      /<button[^>]*>[\s\S]*?<\/button>/i.test(formHtml)

    if (hasSubmit) return { hasContactForm: 'yes' }
  }

  return { hasContactForm: 'no' }
}
