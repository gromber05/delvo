import { NextResponse } from "next/server"

const BACKEND_URL = (process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev").replace(/\/+$/, "")
const AUTH_COOKIE = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"

function getToken(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? ""
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=")
    if (name === AUTH_COOKIE) return decodeURIComponent(rest.join("=")) || null
  }
  return null
}

export async function GET(request: Request) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ detail: "No autenticado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const qs = new URLSearchParams()
  if (searchParams.get("time_min")) qs.set("time_min", searchParams.get("time_min")!)
  if (searchParams.get("time_max")) qs.set("time_max", searchParams.get("time_max")!)
  if (searchParams.get("max_results")) qs.set("max_results", searchParams.get("max_results")!)
  const q = qs.toString()

  const upstream = await fetch(
    `${BACKEND_URL}/api/v1/google-calendar/events${q ? `?${q}` : ""}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  ).catch(() => null)

  if (!upstream) return NextResponse.json({ detail: "Error de conexión" }, { status: 502 })

  const payload = await upstream.json().catch(() => null)
  return NextResponse.json(payload ?? {}, { status: upstream.status })
}
