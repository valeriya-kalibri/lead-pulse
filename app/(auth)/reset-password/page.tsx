'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('Invalid or expired reset link. Please request a new one.')
      setExchanging(false)
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError('This reset link has expired or already been used. Please request a new one.')
      } else {
        setReady(true)
      }
      setExchanging(false)
    })
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        {exchanging ? (
          <p className="text-sm text-center text-gray-500">Verifying reset link…</p>
        ) : !ready ? (
          <div className="space-y-4">
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            <Link
              href="/forgot-password"
              className="block w-full text-center rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3a4a6e] transition-colors"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand mb-1">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                autoFocus
                minLength={8}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-brand placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-transparent"
                placeholder="Min 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-brand mb-1">
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-brand placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-transparent"
                placeholder="Repeat password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3a4a6e] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>

      {ready && (
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      )}
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand">LeadPulse</h1>
          <p className="text-sm text-gray-500 mt-1">Set a new password</p>
        </div>
        <Suspense fallback={<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8"><p className="text-sm text-center text-gray-500">Loading…</p></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
