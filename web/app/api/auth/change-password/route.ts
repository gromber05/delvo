import { NextResponse } from "next/server"

const backendUrl = process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev"
const normalizedBackendUrl = backendUrl.replace(/\/+$/, "")
const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? ""
  const tokenMatch = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${authCookieName}=`))
  const token = tokenMatch?.slice(`${authCookieName}=`.length) ?? ""

  if (!token) {
    return NextResponse.json({ detail: "No autenticado" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ detail: "Cuerpo inválido" }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${normalizedBackendUrl}/api/v1/auth/me/change-password`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json({ detail: "No se pudo conectar con el servidor" }, { status: 502 })
  }

  const payload = (await upstream.json().catch(() => null)) as { ok?: boolean; detail?: string } | null
  if (!upstream.ok) {
    return NextResponse.json(
      { detail: payload?.detail ?? "Error al cambiar la contraseña" },
      { status: upstream.status }
    )
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
