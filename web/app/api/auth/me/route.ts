import { NextResponse } from "next/server"

const backendUrl = process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev"
const normalizedBackendUrl = backendUrl.replace(/\/+$/, "")
const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"

type BackendMeResponse = {
  user?: {
    id: number
    name: string
    email: string
    profile_photo_base64?: string | null
  }
}

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
    upstream = await fetch(`${normalizedBackendUrl}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ detail: "No se pudo conectar con el servidor" }, { status: 502 })
  }

  const payload = (await upstream.json().catch(() => null)) as BackendMeResponse | null
  if (!upstream.ok) {
    return NextResponse.json(
      {
        detail:
          payload && typeof payload === "object" && "detail" in payload
            ? String((payload as { detail?: unknown }).detail ?? "No se pudo obtener el usuario")
            : "No se pudo obtener el usuario",
      },
      { status: upstream.status }
    )
  }

  return NextResponse.json({ user: payload?.user ?? null }, { status: 200 })
}
