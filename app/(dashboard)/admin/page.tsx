import { notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import HubSpotReference from './HubSpotReference'
import DevNotes from './DevNotes'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Verify admin role
  const { data: self } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (self?.role !== 'admin') notFound()

  // Fetch all data using service client (bypasses RLS)
  const db = createServiceClient()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [{ data: profiles }, { data: listCounts }, { data: prospectCounts }, { data: usage }] =
    await Promise.all([
      db.from('profiles').select('*').order('created_at', { ascending: false }),
      db.from('prospect_lists').select('user_id, id'),
      db.from('prospects').select('user_id, id'),
      db.from('usage').select('user_id, prospects_scraped, hubspot_synced').eq('month', currentMonth),
    ])

  // Aggregate counts per user
  const listCountMap = (listCounts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.user_id] = (acc[r.user_id] ?? 0) + 1
    return acc
  }, {})
  const prospectCountMap = (prospectCounts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.user_id] = (acc[r.user_id] ?? 0) + 1
    return acc
  }, {})
  const usageMap = (usage ?? []).reduce<Record<string, { scraped: number; synced: number }>>(
    (acc, r) => {
      acc[r.user_id] = { scraped: r.prospects_scraped ?? 0, synced: r.hubspot_synced ?? 0 }
      return acc
    },
    {}
  )

  const clients = (profiles ?? []).filter((p) => p.id !== user.id || self?.role === 'admin')

  // Summary stats
  const totalClients = clients.length
  const proClients = clients.filter((p) => p.plan === 'pro').length
  const hubspotConnected = clients.filter((p) => p.hubspot_access_token).length
  const totalScrapedThisMonth = Object.values(usageMap).reduce((s, u) => s + u.scraped, 0)

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#2E3A59]">Admin</h1>
        <p className="text-sm text-gray-500 mt-0.5">All clients and account metrics.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total clients', value: totalClients },
          { label: 'Pro accounts', value: proClients },
          { label: 'HubSpot connected', value: hubspotConnected },
          { label: 'Prospects scraped this month', value: totalScrapedThisMonth },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-[#2E3A59] mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Client table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">HubSpot</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Lists</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Prospects</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">This month</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">HS synced</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.map((client) => {
              const initials = (client.full_name ?? client.email ?? '?')
                .split(' ')
                .map((w: string) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
              const u = usageMap[client.id]
              return (
                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#AABFFF]/30 flex items-center justify-center text-[10px] font-semibold text-[#2E3A59] flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium text-[#2E3A59] leading-tight">
                          {client.full_name ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{client.company_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        client.plan === 'pro'
                          ? 'bg-[#2E3A59] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {client.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {client.hubspot_access_token ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        {client.hubspot_portal_id
                          ? `Portal ${client.hubspot_portal_id}`
                          : 'Connected'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        Not connected
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {listCountMap[client.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {prospectCountMap[client.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {u?.scraped ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {u?.synced ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(client.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              )
            })}
            {clients.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <HubSpotReference />
      <DevNotes />
    </div>
  )
}
