import { NextResponse } from "next/server"

const backendUrl = process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev"
const normalizedBackendUrl = backendUrl.replace(/\/+$/, "")
const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? ""
  const tokenMatch = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${authCookieName}=`))
  const token = tokenMatch?.slice(`${authCookieName}=`.length) ?? ""

  if (!token) {
    return NextResponse.json({ detail: "No autenticado" }, { status: 401 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${normalizedBackendUrl}/api/v1/auth/me/export`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ detail: "No se pudo conectar con el servidor" }, { status: 502 })
  }

  if (!upstream.ok) {
    const payload = (await upstream.json().catch(() => null)) as { detail?: string } | null
    return NextResponse.json(
      { detail: payload?.detail ?? "Error al exportar datos" },
      { status: upstream.status }
    )
  }

  const data = await upstream.json()
  return NextResponse.json(data, { status: 200 })
}
