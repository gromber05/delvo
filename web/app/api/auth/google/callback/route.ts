import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ""
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "")
const BACKEND_URL = (process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev").replace(/\/+$/, "")
const AUTH_COOKIE = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const cookieStore = await cookies()
  const savedState = cookieStore.get("google_oauth_state")?.value ?? ""
  cookieStore.delete("google_oauth_state")

  
  const lang = savedState.split(":")[1] ?? "es"
  const settingsUrl = `${APP_URL}/${lang}/settings`

  if (error || !code) {
    return NextResponse.redirect(`${settingsUrl}?google=error`)
  }

  if (!state || state !== savedState) {
    return NextResponse.redirect(`${settingsUrl}?google=error`)
  }

  
  const redirectUri = `${APP_URL}/api/auth/google/callback`
  let tokenData: Record<string, unknown>
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    })
    tokenData = (await tokenRes.json()) as Record<string, unknown>
    if (!tokenRes.ok) throw new Error(String(tokenData.error ?? "token exchange failed"))
  } catch {
    return NextResponse.redirect(`${settingsUrl}?google=error`)
  }

  const accessToken = String(tokenData.access_token ?? "")
  const refreshToken = tokenData.refresh_token ? String(tokenData.refresh_token) : null
  const expiresIn = typeof tokenData.expires_in === "number" ? tokenData.expires_in : 3600
  const expiry = new Date(Date.now() + expiresIn * 1000).toISOString()

  
  let googleEmail: string | null = null
  try {
    const infoRes = await fetch("https://www.googleapis.com/userinfo/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (infoRes.ok) {
      const info = (await infoRes.json()) as { email?: string }
      googleEmail = info.email ?? null
    }
  } catch {  }

  
  const sessionToken = cookieStore.get(AUTH_COOKIE)?.value ?? ""
  if (!sessionToken) {
    return NextResponse.redirect(`${settingsUrl}?google=unauth`)
  }

  try {
    const saveRes = await fetch(`${BACKEND_URL}/api/v1/auth/me/google-calendar`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        google_access_token: accessToken,
        google_refresh_token: refreshToken,
        google_token_expiry: expiry,
        google_email: googleEmail,
      }),
    })
    if (!saveRes.ok) throw new Error("backend save failed")
  } catch {
    return NextResponse.redirect(`${settingsUrl}?google=error`)
  }

  return NextResponse.redirect(`${settingsUrl}?google=ok`)
}
