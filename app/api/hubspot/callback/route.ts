import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const base = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code) {
    return NextResponse.redirect(`${base}/settings?hs_error=denied`)
  }

  const savedState = req.cookies.get('hubspot_oauth_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${base}/settings?hs_error=state_mismatch`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      redirect_uri: `${base}/api/hubspot/callback`,
      code,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/settings?hs_error=token_failed`)
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json()
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

  // Get portal ID
  let portalId: string | null = null
  const infoRes = await fetch('https://api.hubapi.com/account-info/v3/details', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (infoRes.ok) {
    const info = await infoRes.json()
    portalId = info.portalId != null ? String(info.portalId) : null
  }

  // Save to profile
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${base}/login`)
  }

  await supabase.from('profiles').update({
    hubspot_access_token: access_token,
    hubspot_refresh_token: refresh_token,
    hubspot_token_expires_at: expiresAt,
    ...(portalId ? { hubspot_portal_id: portalId } : {}),
  }).eq('id', user.id)

  const response = NextResponse.redirect(`${base}/settings?hs_connected=1`)
  response.cookies.delete('hubspot_oauth_state')
  return response
}
