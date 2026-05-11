export interface AnalyticsDetection {
  analyticsPlatform: string | null
}

const ANALYTICS_PATTERNS: Array<{ pattern: string; name: string }> = [
  { pattern: 'googletagmanager.com', name: 'Google Tag Manager' },
  { pattern: '/gtag/js', name: 'Google Analytics' },
  { pattern: 'google-analytics.com', name: 'Google Analytics' },
  { pattern: 'cdn.mxpnl.com', name: 'Mixpanel' },
  { pattern: 'cdn.segment.com', name: 'Segment' },
  { pattern: 'static.hotjar.com', name: 'Hotjar' },
  { pattern: 'clarity.ms', name: 'Microsoft Clarity' },
  { pattern: 'cdn.heapanalytics.com', name: 'Heap' },
  { pattern: 'js.posthog.com', name: 'PostHog' },
  { pattern: 'plausible.io', name: 'Plausible' },
]

export function detectAnalytics(html: string): AnalyticsDetection {
  const lower = html.toLowerCase()

  for (const { pattern, name } of ANALYTICS_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) {
      return { analyticsPlatform: name }
    }
  }

  return { analyticsPlatform: null }
}
