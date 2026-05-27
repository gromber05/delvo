import { NextResponse } from "next/server"

const backendUrl = (process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev").replace(/\/+$/, "")
const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"

function getAccessToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawVal] = part.trim().split("=")
    if (rawName === authCookieName) {
      const token = rawVal.join("=")
      return token ? decodeURIComponent(token) : null
    }
  }
  return null
}

export async function GET(request: Request) {
  const token = getAccessToken(request)
  if (!token) return NextResponse.json({ items: [] }, { status: 200 })

  const res = await fetch(`${backendUrl}/api/v1/conversations/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({ items: [] }))
  return NextResponse.json(data, { status: res.ok ? 200 : res.status })
}
