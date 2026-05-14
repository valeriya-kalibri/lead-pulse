'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  isActive: boolean
  intervalMs?: number
}

export default function JobPoller({ isActive, intervalMs = 5000 }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [isActive, intervalMs, router])

  return null
}
