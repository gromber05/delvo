import { NextResponse } from "next/server"

const backendUrl = process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev"
const normalizedBackendUrl = backendUrl.replace(/\/+$/, "")
const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"

type ChatRequestBody = {
  message?: string
  useRag?: boolean
  language?: string
  history?: Array<{
    role?: string
    content?: string
  }>
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

export async function POST(request: Request) {
  let body: ChatRequestBody

  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return NextResponse.json({ detail: "JSON invalido" }, { status: 400 })
  }

  const message = body.message?.trim()

  if (!message) {
    return NextResponse.json({ detail: "El mensaje es obligatorio" }, { status: 400 })
  }

  let upstream: Response
  try {
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (turn) =>
              (turn?.role === "user" || turn?.role === "assistant") &&
              typeof turn?.content === "string" &&
              turn.content.trim().length > 0
          )
          .map((turn) => ({
            role: turn.role as "user" | "assistant",
            content: turn.content!.trim(),
          }))
      : []

    upstream = await fetch(`${normalizedBackendUrl}/api/v1/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(request),
      },
      body: JSON.stringify({
        message,
        language: body.language ?? "es",
        use_rag: body.useRag ?? true,
        history,
      }),
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      { detail: "No se pudo conectar con el agente" },
      { status: 502 }
    )
  }

  const payload = await upstream.json().catch(() => null)

  if (!upstream.ok) {
    return NextResponse.json(
      { detail: payload?.detail ?? "Error en el asistente" },
      { status: upstream.status }
    )
  }

  return NextResponse.json(payload, { status: 200 })
}

