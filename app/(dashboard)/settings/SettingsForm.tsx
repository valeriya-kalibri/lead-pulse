'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export default function SettingsForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [companyName, setCompanyName] = useState(profile.company_name ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageIsError, setMessageIsError] = useState(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('hs_connected') === '1') {
      setMessage('HubSpot connected successfully.')
      setMessageIsError(false)
    } else if (params.get('hs_error') === 'denied') {
      setMessage('HubSpot connection was cancelled.')
      setMessageIsError(true)
    } else if (params.get('hs_error')) {
      setMessage('Failed to connect HubSpot. Please try again.')
      setMessageIsError(true)
    }
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        company_name: companyName,
      })
      .eq('id', profile.id)

    setMessage(error ? error.message : 'Settings saved.')
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Account */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#2E3A59]">Account</h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-[#2E3A59] text-white capitalize">
            {profile.plan}
          </span>
        </div>
      </div>

      {/* HubSpot */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#2E3A59]">HubSpot Integration</h2>
          {profile.plan !== 'pro' && (
            <span className="text-xs text-gray-400">Pro plan only</span>
          )}
        </div>

        <div>
          {profile.plan === 'pro' ? (
            profile.hubspot_access_token ? (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-green-700">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                  HubSpot connected
                </span>
                <a
                  href="/api/hubspot/auth"
                  className="text-xs text-gray-400 hover:text-[#2E3A59] underline transition-colors"
                >
                  Reconnect
                </a>
              </div>
            ) : (
              <a
                href="/api/hubspot/auth"
                className="flex w-full items-center justify-center rounded-lg border border-[#ff7a59] bg-white px-4 py-2.5 text-sm font-medium text-[#ff7a59] hover:bg-[#fff5f3] transition-colors"
              >
                Connect HubSpot
              </a>
            )
          ) : (
            <p className="text-xs text-gray-400">Upgrade to Pro to connect HubSpot.</p>
          )}
        </div>
      </div>

      {message && (
        <p className={`text-sm rounded-lg px-3 py-2 ${messageIsError ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-[#2E3A59] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3a4a6e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
