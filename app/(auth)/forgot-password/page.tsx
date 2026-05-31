'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from './actions'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await forgotPassword(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FF]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#2E3A59]">LeadPulse</h1>
          <p className="text-sm text-gray-500 mt-1">Reset your password</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#2E3A59]">Check your inbox</p>
              <p className="text-sm text-gray-500">
                We sent a password reset link to your email. The link expires in 1 hour.
              </p>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#2E3A59] mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2E3A59] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#AABFFF] focus:border-transparent"
                  placeholder="you@company.com"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#2E3A59] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3a4a6e] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-[#2E3A59] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
