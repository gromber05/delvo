import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ""
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "")
const BACKEND_URL = (process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev").replace(/\/+$/, "")
const AUTH_COOKIE = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"
const REFRESH_COOKIE = process.env.DELVO_REFRESH_COOKIE_NAME ?? "refresh_token"
const AUTH_COOKIE_MAX_AGE = Number(process.env.DELVO_AUTH_COOKIE_MAX_AGE ?? 3600)
const REFRESH_COOKIE_MAX_AGE = Number(process.env.DELVO_REFRESH_COOKIE_MAX_AGE ?? 60 * 60 * 24 * 7)

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
  const homeUrl = `${APP_URL}/${lang}/home`

  if (error || !code) {
    return NextResponse.redirect(`${settingsUrl}?google=error`)
  }

  if (!state || state !== savedState) {
    return NextResponse.redirect(`${settingsUrl}?google=error`)
  }

  // Intercambiar código por tokens de Google
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

  // Obtener info del usuario de Google
  let googleEmail: string | null = null
  let googleName: string | null = null
  try {
    const infoRes = await fetch("https://www.googleapis.com/userinfo/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (infoRes.ok) {
      const info = (await infoRes.json()) as { email?: string; name?: string }
      googleEmail = info.email ?? null
      googleName = info.name ?? null
    }
  } catch { /* ignorar */ }

  const sessionToken = cookieStore.get(AUTH_COOKIE)?.value ?? ""
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  }

  if (!sessionToken) {
    // ── FLUJO LOGIN / REGISTRO CON GOOGLE ──────────────────────────────
    if (!googleEmail) {
      return NextResponse.redirect(`${settingsUrl}?google=error`)
    }
    try {
      const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google_access_token: accessToken,
          google_refresh_token: refreshToken,
          google_token_expiry: expiry,
          google_email: googleEmail,
          google_name: googleName,
        }),
      })
      if (!loginRes.ok) throw new Error("google-login failed")
      const data = (await loginRes.json()) as {
        access_token: string
        refresh_token: string
        user: { id: number; name: string; email: string }
      }
      const response = NextResponse.redirect(homeUrl)
      response.cookies.set({ ...cookieOptions, name: AUTH_COOKIE, value: data.access_token, maxAge: AUTH_COOKIE_MAX_AGE })
      response.cookies.set({ ...cookieOptions, name: REFRESH_COOKIE, value: data.refresh_token, maxAge: REFRESH_COOKIE_MAX_AGE })
      return response
    } catch {
      return NextResponse.redirect(`${settingsUrl}?google=error`)
    }
  }

  // ── FLUJO CONECTAR GOOGLE CALENDAR (usuario ya logueado) ──────────────
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
