'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export default function SettingsForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [companyName, setCompanyName] = useState(profile.company_name ?? '')
  const [hubspotKey, setHubspotKey] = useState(profile.hubspot_api_key ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

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
        hubspot_api_key: profile.plan === 'pro' ? hubspotKey || null : profile.hubspot_api_key,
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
          <label className="block text-xs font-medium text-gray-500 mb-1">HubSpot API key</label>
          <input
            type="password"
            value={hubspotKey}
            onChange={(e) => setHubspotKey(e.target.value)}
            disabled={profile.plan !== 'pro'}
            placeholder={profile.plan !== 'pro' ? 'Upgrade to Pro to use HubSpot sync' : 'pat-na1-xxxxxxxx'}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{message}</p>
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
