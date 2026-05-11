'use client'

interface Props {
  listId: string
  listName: string
}

export default function ListActions({ listId }: Props) {
  return (
    <div className="flex items-center gap-2">
      <a
        href={`/api/prospects/export?list_id=${listId}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:border-[#2E3A59] hover:text-[#2E3A59] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export CSV
      </a>
    </div>
  )
}
