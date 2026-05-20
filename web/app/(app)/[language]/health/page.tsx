import { headers } from "next/headers"
import { getDictionary } from "@/lib/dictionary"
import { normalizeLanguage } from "@/lib/language"

type HealthApiResponse = {
  status: "ok" | "error"
  service: "web"
  timestamp: string
  checks: {
    backend: {
      status: "ok" | "error"
      endpoint: string
      latency_ms?: number
      detail?: string
    }
  }
}

async function getHealth() {
  const headerStore = await headers()
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  const protocol = headerStore.get("x-forwarded-proto") ?? "http"
  const baseUrl = host ? `${protocol}://${host}` : "http://localhost:31667"

  const response = await fetch(`${baseUrl}/api/health`, {
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => null)) as HealthApiResponse | null

  return {
    httpStatus: response.status,
    payload,
  }
}

export default async function HealthPage({
  params,
}: {
  params: Promise<{ language: string }>
}) {
  const { language: rawLanguage } = await params
  const language = normalizeLanguage(rawLanguage)
  const dictionary = getDictionary(language)
  const { payload, httpStatus } = await getHealth()

  const isOk = payload?.status === "ok"
  const statusLabel = isOk ? "OK" : "ERROR"
  const statusClass = isOk
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700"

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-4 p-6 md:p-10">
      <header className="rounded-xl border bg-card p-5">
        <h1 className="text-2xl font-semibold">Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">{dictionary.sidebar.tagline}</p>
      </header>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Overall status</p>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">HTTP: {httpStatus}</p>
        <p className="mt-1 text-sm text-muted-foreground">Timestamp: {payload?.timestamp ?? "n/a"}</p>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Backend check</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Status: {payload?.checks.backend.status ?? "error"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Latency: {payload?.checks.backend.latency_ms ?? "n/a"} ms
        </p>
        {payload?.checks.backend.detail ? (
          <p className="mt-1 text-sm text-red-600">Detail: {payload.checks.backend.detail}</p>
        ) : null}
      </section>
    </main>
  )
}
