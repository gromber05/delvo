"use client"

import { DashboardCalendar } from "@/components/dashboard-calendar"
import { ProductChat } from "@/components/product-chat"
import { getLanguageFromPathname } from "@/lib/language"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

type Task = {
  id: number
  title: string
  priority: "low" | "medium" | "high"
  status: "pending" | "in_progress" | "done"
}

type AgendaItem = {
  id: string
  date: string
  title: string
  type: "meeting" | "event"
}

function greeting(isSpanish: boolean): string {
  const h = new Date().getHours()
  if (isSpanish) {
    if (h < 13) return "Buenos días"
    if (h < 20) return "Buenas tardes"
    return "Buenas noches"
  }
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

function todayLabel(locale: string): string {
  return new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

function buildAgenda(
  meetings: Array<{ id: number; title: string; meeting_date: string }>,
  events: Array<{ id: number; title: string; event_date: string }>
): AgendaItem[] {
  const today = new Date().toISOString().split("T")[0]
  const items: AgendaItem[] = []
  for (const m of meetings) {
    if (m.meeting_date >= today)
      items.push({ id: `m-${m.id}`, date: m.meeting_date, title: m.title, type: "meeting" })
  }
  for (const e of events) {
    if (e.event_date >= today)
      items.push({ id: `e-${e.id}`, date: e.event_date, title: e.title, type: "event" })
  }
  return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
}

const METRIC_ACCENT = [
  "bg-primary",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-muted-foreground/40",
]

export function DashboardOverview() {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const isSpanish = language === "es"
  const locale = isSpanish ? "es-ES" : "en-US"

  const [userName, setUserName] = useState<string | null>(null)
  const [summary, setSummary] = useState({ tasks: 0, meetings: 0, events: 0, notes: 0 })
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllTasks, setShowAllTasks] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [meRes, tasksRes, meetingsRes, eventsRes, notesRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/planner/tasks", { cache: "no-store" }),
        fetch("/api/planner/meetings", { cache: "no-store" }),
        fetch("/api/planner/events", { cache: "no-store" }),
        fetch("/api/planner/notes", { cache: "no-store" }),
      ])

      if (meRes.ok) {
        const me = await meRes.json().catch(() => null)
        if (me?.user?.name) setUserName((me.user.name as string).split(" ")[0])
      }

      type ApiResponse = { items?: Record<string, unknown>[] }
      const [tasksData, meetingsData, eventsData, notesData] = await Promise.all([
        tasksRes.ok ? tasksRes.json().catch(() => ({} as ApiResponse)) : ({} as ApiResponse),
        meetingsRes.ok ? meetingsRes.json().catch(() => ({} as ApiResponse)) : ({} as ApiResponse),
        eventsRes.ok ? eventsRes.json().catch(() => ({} as ApiResponse)) : ({} as ApiResponse),
        notesRes.ok ? notesRes.json().catch(() => ({} as ApiResponse)) : ({} as ApiResponse),
      ]) as [ApiResponse, ApiResponse, ApiResponse, ApiResponse]

      const tasks: Record<string, unknown>[] = Array.isArray(tasksData?.items) ? tasksData.items : []
      const meetings: Record<string, unknown>[] = Array.isArray(meetingsData?.items) ? meetingsData.items : []
      const rawEvents: Record<string, unknown>[] = Array.isArray(eventsData?.items) ? eventsData.items : []
      // Eliminar eventos duplicados (mismo título+fecha): un evento de Delvo y su copia
      // sincronizada de Google pueden coexistir localmente.
      const seenEventSig = new Set<string>()
      const events = rawEvents.filter((e) => {
        const sig = `${String(e.title ?? "").trim().toLowerCase()}|${String(e.event_date ?? "").slice(0, 10)}`
        if (seenEventSig.has(sig)) return false
        seenEventSig.add(sig)
        return true
      })
      const notes: Record<string, unknown>[] = Array.isArray(notesData?.items) ? notesData.items : []

      setSummary({ tasks: tasks.length, meetings: meetings.length, events: events.length, notes: notes.length })
      setPendingTasks(
        tasks
          .filter((t) => t.status === "pending")
          .map((t) => ({
            id: Number(t.id),
            title: String(t.title ?? ""),
            priority: (t.priority === "high" || t.priority === "low" ? t.priority : "medium") as Task["priority"],
            status: "pending" as const,
          }))
      )
      setAgenda(
        buildAgenda(
          meetings as Array<{ id: number; title: string; meeting_date: string }>,
          events as Array<{ id: number; title: string; event_date: string }>
        )
      )
    } catch {
      
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const refresh = () => load()
    window.addEventListener("planner:tasks-updated", refresh)
    return () => window.removeEventListener("planner:tasks-updated", refresh)
  }, [load])

  const visibleTasks = showAllTasks ? pendingTasks : pendingTasks.slice(0, 4)

  const priorityLabel = useMemo(
    () =>
      isSpanish
        ? { high: "Alta", medium: "Media", low: "Baja" }
        : { high: "High", medium: "Medium", low: "Low" },
    [isSpanish]
  )

  const metricCards = useMemo(
    () => [
      { label: isSpanish ? "Tareas" : "Tasks", value: summary.tasks, accent: METRIC_ACCENT[0] },
      { label: isSpanish ? "Reuniones" : "Meetings", value: summary.meetings, accent: METRIC_ACCENT[1] },
      { label: isSpanish ? "Eventos" : "Events", value: summary.events, accent: METRIC_ACCENT[2] },
      { label: isSpanish ? "Notas" : "Notes", value: summary.notes, accent: METRIC_ACCENT[3] },
    ],
    [isSpanish, summary]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 pt-3">

      {}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {greeting(isSpanish)}{userName ? `, ${userName}` : ""}
        </h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">{todayLabel(locale)}</p>
      </div>

      {}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.label} className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className={`absolute inset-x-0 top-0 h-1 ${card.accent}`} />
            <div className="p-4 pt-5">
              <p className="text-3xl font-extrabold">{loading ? "—" : card.value}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {isSpanish ? "Pendientes" : "Pending"}
          </p>
          <a
            href={`/${language}/planner`}
            className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            + {isSpanish ? "Crear" : "Create"}
          </a>
        </div>
        <div className="space-y-2">
          {pendingTasks.length === 0 && !loading ? (
            <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">{isSpanish ? "Sin tareas pendientes" : "No pending tasks"}</p>
            </div>
          ) : (
            <>
              {visibleTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
                  <div className={`size-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                  <span className="flex-1 truncate text-sm font-medium">{task.title}</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                    {priorityLabel[task.priority]}
                  </span>
                </div>
              ))}
              {pendingTasks.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllTasks((v) => !v)}
                  className="w-full py-1.5 text-center text-sm font-semibold text-primary hover:underline"
                >
                  {showAllTasks
                    ? isSpanish ? "Ver menos" : "Show less"
                    : `${isSpanish ? "Ver" : "Show"} ${pendingTasks.length - 4} ${isSpanish ? "más" : "more"}`}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {}
      <section>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {isSpanish ? "Agenda próxima" : "Upcoming"}
        </p>
        <div className="space-y-2">
          {agenda.length === 0 && !loading ? (
            <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">{isSpanish ? "Sin eventos próximos" : "No upcoming events"}</p>
            </div>
          ) : (
            agenda.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
                <div className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1.5">
                  <span className="text-xs font-bold text-primary">{item.date.slice(5).replace("-", "/")}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className={`text-xs font-semibold ${item.type === "meeting" ? "text-primary" : "text-amber-500"}`}>
                    {item.type === "meeting"
                      ? isSpanish ? "Reunión" : "Meeting"
                      : isSpanish ? "Evento" : "Event"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {}
      <section className="grid shrink-0 gap-4 xl:grid-cols-[1.45fr_1fr]">
        <DashboardCalendar />
        <div className="flex min-h-130 flex-col overflow-hidden rounded-xl border bg-card">
          <ProductChat compact className="h-full min-h-0 flex-1 border-0" />
        </div>
      </section>
    </div>
  )
}
