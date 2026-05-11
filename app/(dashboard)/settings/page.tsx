import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from './SettingsForm'
import type { Profile } from '@/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-xl font-semibold text-[#2E3A59] mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your account and integrations.</p>
      <SettingsForm profile={profile as Profile} />
    </div>
  )
}
