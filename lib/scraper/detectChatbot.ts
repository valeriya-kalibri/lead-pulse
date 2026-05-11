export interface ChatbotDetection {
  hasChat: 'yes' | 'no'
  platform: string | null
}

const CHAT_PATTERNS: Array<{ pattern: string; name: string }> = [
  { pattern: 'widget.intercom.io', name: 'Intercom' },
  { pattern: 'js.intercomcdn.com', name: 'Intercom' },
  { pattern: 'js.hs-scripts.com', name: 'HubSpot' },
  { pattern: 'js.driftt.com', name: 'Drift' },
  { pattern: 'drift.com/drift-frame', name: 'Drift' },
  { pattern: 'code.tidio.co', name: 'Tidio' },
  { pattern: 'cdn.livechatinc.com', name: 'LiveChat' },
  { pattern: 'static.zdassets.com', name: 'Zendesk' },
  { pattern: 'client.crisp.chat', name: 'Crisp' },
  { pattern: 'tawk.to', name: 'Tawk' },
  { pattern: 'embed.tawk.to', name: 'Tawk' },
]

const GENERIC_PATTERNS = ['window.__lc', 'window.Intercom(', 'window.HubSpotConversations']

export function detectChatbot(html: string): ChatbotDetection {
  const lower = html.toLowerCase()

  for (const { pattern, name } of CHAT_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) {
      return { hasChat: 'yes', platform: name }
    }
  }

  for (const pattern of GENERIC_PATTERNS) {
    if (html.includes(pattern)) {
      return { hasChat: 'yes', platform: 'Other' }
    }
  }

  return { hasChat: 'no', platform: null }
}
