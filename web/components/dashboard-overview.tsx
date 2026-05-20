"use client"

import Link from "next/link"
import { DashboardCalendar } from "@/components/dashboard-calendar"
import { ProductChat } from "@/components/product-chat"
import { getLanguageFromPathname, withLanguagePrefix } from "@/lib/language"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

type PlannerSummary = {
  tasks: number
  meetings: number
  events: number
  notes: number
}

export function DashboardOverview() {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const isSpanish = language === "es"
  const [summary, setSummary] = useState<PlannerSummary>({
    tasks: 0,
    meetings: 0,
    events: 0,
    notes: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      setLoading(true)
      setError(null)
      try {
        const [tasksRes, meetingsRes, eventsRes, notesRes] = await Promise.all([
          fetch("/api/planner/tasks", { cache: "no-store" }),
          fetch("/api/planner/meetings", { cache: "no-store" }),
          fetch("/api/planner/events", { cache: "no-store" }),
          fetch("/api/planner/notes", { cache: "no-store" }),
        ])

        if (!tasksRes.ok || !meetingsRes.ok || !eventsRes.ok || !notesRes.ok) {
          throw new Error(
            isSpanish
              ? "No se pudo cargar el resumen del planner."
              : "Could not load planner overview."
          )
        }

        const [tasksData, meetingsData, eventsData, notesData] = await Promise.all([
          tasksRes.json().catch(() => ({})),
          meetingsRes.json().catch(() => ({})),
          eventsRes.json().catch(() => ({})),
          notesRes.json().catch(() => ({})),
        ])

        if (cancelled) return

        setSummary({
          tasks: Array.isArray(tasksData?.items) ? tasksData.items.length : 0,
          meetings: Array.isArray(meetingsData?.items) ? meetingsData.items.length : 0,
          events: Array.isArray(eventsData?.items) ? eventsData.items.length : 0,
          notes: Array.isArray(notesData?.items) ? notesData.items.length : 0,
        })
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : isSpanish
                ? "No se pudo cargar el resumen."
                : "Could not load overview."
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSummary().catch(() => undefined)
    const refresh = () => loadSummary().catch(() => undefined)
    window.addEventListener("planner:tasks-updated", refresh)
    return () => {
      cancelled = true
      window.removeEventListener("planner:tasks-updated", refresh)
    }
  }, [isSpanish])

  const cards = useMemo(
    () => [
      { label: isSpanish ? "Tareas" : "Tasks", value: summary.tasks },
      { label: isSpanish ? "Reuniones" : "Meetings", value: summary.meetings },
      { label: isSpanish ? "Eventos" : "Events", value: summary.events },
      { label: isSpanish ? "Notas" : "Notes", value: summary.notes },
    ],
    [isSpanish, summary]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
      <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{isSpanish ? "Panel general" : "Overview"}</h2>
            <p className="text-sm text-muted-foreground">
              {isSpanish
                ? "Vista rapida del estado del planner y accesos principales."
                : "Quick planner status view with primary shortcuts."}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={withLanguagePrefix("/planner", language)}
              className="rounded-md border border-border/80 bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              {isSpanish ? "Abrir planner" : "Open planner"}
            </Link>
          </div>
        </div>
        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-xl border border-border/70 bg-background/90 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold">
                {loading ? <span className="text-base text-muted-foreground">...</span> : card.value}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
        <DashboardCalendar />
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
          <ProductChat compact className="h-full min-h-0 flex-1 border-0" />
        </div>
      </section>
    </div>
  )
}
