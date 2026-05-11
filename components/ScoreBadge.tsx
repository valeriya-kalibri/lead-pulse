import type { Score } from '@/types'

const config: Record<Score, { label: string; classes: string }> = {
  hot: { label: 'Hot', classes: 'bg-red-50 text-red-600 ring-red-200' },
  warm: { label: 'Warm', classes: 'bg-yellow-50 text-yellow-600 ring-yellow-200' },
  cold: { label: 'Cold', classes: 'bg-gray-100 text-gray-400 ring-gray-200' },
}

export default function ScoreBadge({ score }: { score: Score }) {
  const { label, classes } = config[score]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${classes}`}>
      {label}
    </span>
  )
}
