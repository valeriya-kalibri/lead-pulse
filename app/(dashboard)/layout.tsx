import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, plan, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-[#F5F7FF] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-[#2E3A59] text-white">
        <div className="px-5 py-5 border-b border-white/10">
          <span className="text-lg font-bold tracking-tight">LeadPulse</span>
          {profile?.plan === 'pro' && (
            <span className="ml-2 text-[10px] font-semibold bg-[#AABFFF] text-[#2E3A59] rounded-full px-1.5 py-0.5 uppercase">
              Pro
            </span>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 text-sm">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            </svg>
            My Lists
          </Link>
          <Link
            href="/debug"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Debug
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Help
          </Link>
          {profile?.role === 'admin' && (
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </Link>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 text-xs text-white/50">
          <p className="truncate">{profile?.full_name ?? user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
    </div>
  )
}
