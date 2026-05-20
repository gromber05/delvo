import { NextResponse } from "next/server"

const backendUrl = process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev"
const normalizedBackendUrl = backendUrl.replace(/\/+$/, "")
const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"

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

function getAccessToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader.split(";")
  for (const cookiePart of cookies) {
    const [rawName, ...rawValue] = cookiePart.trim().split("=")
    if (rawName === authCookieName) {
      const token = rawValue.join("=")
      return token ? decodeURIComponent(token) : null
    }
  }

  return null
}

function getAuthHeader(request: Request): Record<string, string> {
  const token = getAccessToken(request)
  if (!token) {
    return {}
  }

  return { Authorization: `Bearer ${token}` }
}

export async function GET(request: Request) {
  const upstream = await fetch(`${normalizedBackendUrl}/api/v1/planner/events`, {
    method: "GET",
    headers: {
      ...getAuthHeader(request),
    },
    cache: "no-store",
  }).catch(() => null)

  if (!upstream) {
    return NextResponse.json({ detail: "No se pudo conectar con el servidor" }, { status: 502 })
  }

  const payload = await upstream.json().catch(() => null)

  if (!upstream.ok) {
    return NextResponse.json(
      {
        detail: getDetailMessage(
          payload && typeof payload === "object" ? (payload as { detail?: unknown }).detail : undefined,
          "No se pudieron listar los eventos"
        ),
      },
      { status: upstream.status }
    )
  }

  return NextResponse.json(payload, { status: 200 })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "JSON invalido" }, { status: 400 })
  }

  const upstream = await fetch(`${normalizedBackendUrl}/api/v1/planner/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(request),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null)

  if (!upstream) {
    return NextResponse.json({ detail: "No se pudo conectar con el servidor" }, { status: 502 })
  }

  const payload = await upstream.json().catch(() => null)

  if (!upstream.ok) {
    return NextResponse.json(
      {
        detail: getDetailMessage(
          payload && typeof payload === "object" ? (payload as { detail?: unknown }).detail : undefined,
          "No se pudo crear el evento"
        ),
      },
      { status: upstream.status }
    )
  }

  return NextResponse.json(payload, { status: 201 })
}

