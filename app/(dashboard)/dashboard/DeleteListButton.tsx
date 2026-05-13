'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  listId: string
  listName: string
  redirectTo?: string
}

export default function DeleteListButton({ listId, listName, redirectTo }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${listName}"? This will permanently remove all prospects and results. This cannot be undone.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/lists/${listId}`, { method: 'DELETE' })
      if (!res.ok) {
        const { error } = await res.json()
        alert(`Failed to delete: ${error}`)
        return
      }
      if (redirectTo) router.push(redirectTo)
      else router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      title="Delete list"
      className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {busy && <span className="sr-only">Deleting…</span>}
    </button>
  )
}
