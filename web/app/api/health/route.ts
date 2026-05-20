import { NextResponse } from "next/server"

const backendUrl = process.env.DELVO_BACKEND_URL ?? "https://apidelvo.gromber05.dev"
const normalizedBackendUrl = backendUrl.replace(/\/+$/, "")

type HealthStatus = "ok" | "error"

type HealthPayload = {
  status: HealthStatus
  service: "web"
  timestamp: string
  checks: {
    backend: {
      status: HealthStatus
      endpoint: string
      latency_ms?: number
      detail?: string
    }
  }
}

export async function GET() {
  const startedAt = Date.now()
  const backendEndpoint = `${normalizedBackendUrl}/health`

  const payload: HealthPayload = {
    status: "ok",
    service: "web",
    timestamp: new Date().toISOString(),
    checks: {
      backend: {
        status: "error",
        endpoint: backendEndpoint,
      },
    },
  }

  try {
    const upstream = await fetch(backendEndpoint, {
      method: "GET",
      cache: "no-store",
    })

    payload.checks.backend.latency_ms = Date.now() - startedAt

    if (!upstream.ok) {
      payload.status = "error"
      payload.checks.backend.status = "error"
      payload.checks.backend.detail = `backend_status_${upstream.status}`
      return NextResponse.json(payload, { status: 502 })
    }

    const backendPayload = (await upstream.json().catch(() => null)) as
      | { status?: string }
      | null

    if (backendPayload?.status === "ok") {
      payload.checks.backend.status = "ok"
      return NextResponse.json(payload, { status: 200 })
    }

    payload.status = "error"
    payload.checks.backend.status = "error"
    payload.checks.backend.detail = "backend_invalid_health_payload"
    return NextResponse.json(payload, { status: 502 })
  } catch {
    payload.status = "error"
    payload.checks.backend.status = "error"
    payload.checks.backend.latency_ms = Date.now() - startedAt
    payload.checks.backend.detail = "backend_unreachable"
    return NextResponse.json(payload, { status: 502 })
  }
}

