import { NextResponse } from "next/server"

const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 })

  response.cookies.set({
    name: authCookieName,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return response
}
