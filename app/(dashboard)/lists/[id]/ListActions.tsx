'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import HubSpotPullModal from '@/components/HubSpotPullModal'
import StartScrapingModal from '@/components/StartScrapingModal'
import { OFFERS, otherOffer } from '@/lib/offers'
import type { OfferType } from '@/types'

interface Props {
  listId: string
  listName: string
  userId: string
  prospectIds: string[]
  isPro: boolean
  hasHubspotKey: boolean
  hasPendingProspects: boolean
  isJobActive: boolean
  listKeywords: string[]
  listCriteria: string[]
  offerType: OfferType
  hasScrapedProspects: boolean
}

export default function ListActions({
  listId,
  listName,
  userId,
  prospectIds,
  isPro,
  hasHubspotKey,
  hasPendingProspects,
  isJobActive,
  listKeywords,
  listCriteria,
  offerType,
  hasScrapedProspects,
}: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [showScrapingModal, setShowScrapingModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number; errors: Array<{ prospectId: string; error: string }> } | null>(null)
  const [cloning, setCloning] = useState(false)

  const targetOfferType = otherOffer(offerType)
  const targetOfferLabel = OFFERS[targetOfferType].label

  async function handleStartScraping(keywords: string[], criteria: string[]) {
    setScraping(true)
    try {
      const res = await fetch(`/api/lists/${listId}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, criteria }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        alert(error ?? 'Failed to start scraping')
        return
      }
      setShowScrapingModal(false)
      router.refresh()
    } finally {
      setScraping(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${listName}"? This will permanently remove all prospects and results. This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/lists/${listId}`, { method: 'DELETE' })
      if (!res.ok) {
        const { error } = await res.json()
        alert(`Failed to delete: ${error}`)
        return
      }
      router.push('/dashboard')
    } finally {
      setDeleting(false)
    }
  }

  async function handleHubspotSync() {
    if (prospectIds.length === 0) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/hubspot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectIds, userId }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error ?? 'HubSpot sync failed.')
        return
      }
      setSyncResult({ synced: json.synced, failed: json.failed, errors: json.errors ?? [] })
    } finally {
      setSyncing(false)
    }
  }

  async function handleClone() {
    if (!confirm(`Clone this list as "${listName} — ${targetOfferLabel}"?\n\nAll scraped prospect data will be copied and re-scored for the ${targetOfferLabel} offer. Intel cards and email sequences will be cleared — generate them fresh from the new list.`)) return
    setCloning(true)
    try {
      const res = await fetch(`/api/lists/${listId}/clone`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error ?? 'Clone failed.')
        return
      }
      router.push(`/lists/${json.list_id}`)
    } finally {
      setCloning(false)
    }
  }

  const canSync = isPro && hasHubspotKey
  const syncDisabledReason = !isPro
    ? 'Pro plan required'
    : !hasHubspotKey
    ? 'Connect HubSpot in Settings'
    : null

  return (
    <>
      <StartScrapingModal
        isOpen={showScrapingModal}
        onClose={() => setShowScrapingModal(false)}
        listName={listName}
        initialKeywords={listKeywords}
        initialCriteria={listCriteria}
        onConfirm={handleStartScraping}
        confirming={scraping}
      />

    <div className="flex items-center gap-2 flex-wrap">
      {/* Start Scraping — shown for HubSpot-imported lists with unscraped prospects */}
      {hasPendingProspects && !isJobActive && (
        <button
          onClick={() => setShowScrapingModal(true)}
          disabled={scraping}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2E3A59] px-3 py-2 text-sm font-medium text-white hover:bg-[#3a4a6e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
          </svg>
          Start Scraping
        </button>
      )}

      {/* Clone for New Offer — shown when list has scraped prospects */}
      {hasScrapedProspects && (
        <button
          onClick={handleClone}
          disabled={cloning}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#AABFFF] bg-[#AABFFF]/10 px-3 py-2 text-sm font-medium text-[#2E3A59] hover:bg-[#AABFFF]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
          {cloning ? 'Cloning…' : `Clone as ${targetOfferLabel}`}
        </button>
      )}

      {/* HubSpot refresh */}
      <HubSpotPullModal
        listId={listId}
        listName={listName}
        userId={userId}
        isPro={isPro}
        hasHubspotKey={hasHubspotKey}
      />

      {/* HubSpot sync */}
      {syncResult ? (
        <div className="flex flex-col gap-1">
          <div className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${syncResult.failed > 0 && syncResult.synced === 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={syncResult.failed > 0 && syncResult.synced === 0 ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7'} />
            </svg>
            {syncResult.synced} synced{syncResult.failed > 0 ? `, ${syncResult.failed} failed` : ''}
            <button onClick={() => setSyncResult(null)} className="ml-1 opacity-50 hover:opacity-100 text-xs">✕</button>
          </div>
          {(syncResult.errors?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 space-y-0.5 max-w-sm">
              {syncResult.errors.map((e) => (
                <p key={e.prospectId} className="truncate" title={e.error}><span className="font-medium">Error:</span> {e.error}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="relative group">
          <button
            onClick={handleHubspotSync}
            disabled={!canSync || syncing || prospectIds.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.164 7.931A5.973 5.973 0 0018.5 6a6 6 0 00-9.5-4.863A4.002 4.002 0 001 5a4 4 0 003 3.874V9a9 9 0 009 9v2h2v-2.051A9.003 9.003 0 0021 9V8a3 3 0 00-2.836-2.069zM13 16.938A7.006 7.006 0 017 10V8.126A4.002 4.002 0 004.268 5.6 2 2 0 015 3a2 2 0 012 2v.268A6.001 6.001 0 0112.732 9H14a4 4 0 014 4v.126A7.046 7.046 0 0113 16.938z" />
            </svg>
            {syncing ? `Syncing ${prospectIds.length}…` : 'Sync to HubSpot'}
          </button>
          {syncDisabledReason && (
            <div className="absolute right-0 top-full mt-1.5 z-10 hidden group-hover:block whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs text-white shadow-lg">
              {syncDisabledReason}
            </div>
          )}
        </div>
      )}

      {/* Export CSV */}
      <a
        href={`/api/prospects/export?list_id=${listId}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:border-[#2E3A59] hover:text-[#2E3A59] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export CSV
      </a>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-40"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        {deleting ? 'Deleting…' : 'Delete List'}
      </button>
    </div>
    </>
  )
}
