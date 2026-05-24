import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { randomBytes } from "crypto"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ""
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "")
const SCOPES = ["email", "https://www.googleapis.com/auth/calendar"].join(" ")

export async function GET(request: Request) {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json({ detail: "Google OAuth no configurado" }, { status: 503 })
  }

  
  const referer = request.headers.get("referer") ?? ""
  const langMatch = referer.match(/\/(es|en)\//)
  const lang = langMatch ? langMatch[1] : "es"

  const state = randomBytes(16).toString("hex") + `:${lang}`
  const redirectUri = `${APP_URL}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  })

  const cookieStore = await cookies()
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, 
    path: "/",
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
