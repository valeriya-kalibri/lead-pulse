export interface ServicesDetection {
  services: string[]
}

export function detectServices(html: string, keywords: string[]): ServicesDetection {
  const lower = html.toLowerCase()
  const services = keywords.filter((kw) => lower.includes(kw.toLowerCase()))
  return { services }
}
