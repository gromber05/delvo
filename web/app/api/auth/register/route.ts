import { NextResponse } from "next/server"

const backendUrl = process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev"
const normalizedBackendUrl = backendUrl.replace(/\/+$/, "")
const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"
const authCookieMaxAge = Number(process.env.DELVO_AUTH_COOKIE_MAX_AGE ?? 60 * 60)

type RegisterRequestBody = {
  name?: string
  email?: string
  password?: string
}

type BackendAuthResponse = {
  access_token: string
  token_type: string
  user: {
    id: number
    name: string
    email: string
  }
}

function getDetailMessage(detail: unknown, fallback: string) {
  if (typeof detail === "string" && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item === "object" && "msg" in item
          ? String((item as { msg?: unknown }).msg ?? "")
          : ""
      )
      .filter((message) => message.length > 0)

    if (messages.length > 0) {
      return messages.join(". ")
    }
  }

  return fallback
}

export async function POST(request: Request) {
  let body: RegisterRequestBody

  try {
    body = (await request.json()) as RegisterRequestBody
  } catch {
    return NextResponse.json({ detail: "JSON invalido" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!name || !email || !password) {
    return NextResponse.json(
      { detail: "Nombre, email y password son obligatorios" },
      { status: 400 }
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(`${normalizedBackendUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      { detail: "No se pudo conectar con el servidor" },
      { status: 502 }
    )
  }

  const payload = await upstream.json().catch(() => null)

  if (!upstream.ok) {
    return NextResponse.json(
      {
        detail: getDetailMessage(
          payload && typeof payload === "object" ? (payload as { detail?: unknown }).detail : undefined,
          "No se pudo crear la cuenta"
        ),
      },
      { status: upstream.status }
    )
  }

  const data = payload as BackendAuthResponse

  const response = NextResponse.json(
    {
      ok: true,
      user: data.user,
      token_type: data.token_type,
    },
    { status: 201 }
  )

  response.cookies.set({
    name: authCookieName,
    value: data.access_token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: authCookieMaxAge,
  })

  return response
}

