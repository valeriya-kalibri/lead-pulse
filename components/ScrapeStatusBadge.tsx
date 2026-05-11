import type { ScrapeStatus, ErrorType } from '@/types'

interface Props {
  status: ScrapeStatus
  errorType?: ErrorType | null
  errorMessage?: string | null
}

export default function ScrapeStatusBadge({ status, errorType, errorMessage }: Props) {
  const tooltip = errorType
    ? `${errorType}${errorMessage ? ': ' + errorMessage : ''}`
    : errorMessage ?? undefined

  if (status === 'complete') {
    return (
      <span
        title="Scraped successfully"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-600 text-[10px] font-bold shrink-0"
      >
        ✓
      </span>
    )
  }

  if (status === 'processing') {
    return (
      <span
        title="Processing…"
        className="inline-block w-3.5 h-3.5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin shrink-0"
      />
    )
  }

  if (status === 'error') {
    return (
      <span
        title={tooltip}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-500 text-[10px] font-bold shrink-0 cursor-help"
      >
        ✕
      </span>
    )
  }

  if (status === 'skipped') {
    return (
      <span
        title="Duplicate URL — skipped"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-xs font-bold shrink-0 cursor-help"
      >
        –
      </span>
    )
  }

  // pending — no badge
  return null
}
