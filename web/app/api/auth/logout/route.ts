import { NextResponse } from "next/server"

const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"
const refreshCookieName = process.env.DELVO_REFRESH_COOKIE_NAME ?? "refresh_token"

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 })

  const clearOptions = {
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  }

  response.cookies.set({ name: authCookieName, ...clearOptions })
  response.cookies.set({ name: refreshCookieName, ...clearOptions })

  return response
}
