import { NextResponse } from "next/server"

const backendUrl = process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev"
const normalizedBackendUrl = backendUrl.replace(/\/+$/, "")
const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"
const authCookieMaxAge = Number(process.env.DELVO_AUTH_COOKIE_MAX_AGE ?? 60 * 60)
const refreshCookieName = process.env.DELVO_REFRESH_COOKIE_NAME ?? "refresh_token"
const refreshCookieMaxAge = Number(process.env.DELVO_REFRESH_COOKIE_MAX_AGE ?? 60 * 60 * 24 * 7)

type BackendRefreshResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

function extractCookie(cookieHeader: string, name: string): string {
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
  return match?.slice(`${name}=`.length) ?? ""
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? ""
  const refreshToken = extractCookie(cookieHeader, refreshCookieName)

  if (!refreshToken) {
    return NextResponse.json({ detail: "No hay token de refresco" }, { status: 401 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${normalizedBackendUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ detail: "No se pudo conectar con el servidor" }, { status: 502 })
  }

  const payload = await upstream.json().catch(() => null)

  if (!upstream.ok) {
    return NextResponse.json(
      {
        detail:
          payload && typeof payload === "object" && "detail" in payload
            ? String((payload as { detail?: unknown }).detail ?? "Token de refresco inválido")
            : "Token de refresco inválido",
      },
      { status: upstream.status }
    )
  }

  const data = payload as BackendRefreshResponse

  const response = NextResponse.json({ ok: true, token_type: data.token_type }, { status: 200 })

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  }

  response.cookies.set({ ...cookieOptions, name: authCookieName, value: data.access_token, maxAge: authCookieMaxAge })
  response.cookies.set({ ...cookieOptions, name: refreshCookieName, value: data.refresh_token, maxAge: refreshCookieMaxAge })

  return response
}
