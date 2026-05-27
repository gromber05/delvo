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
  status: "pending" | "done"
  due_date?: string
  due_time?: string
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
  return new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
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

function formatDue(dateStr: string, timeStr?: string, isSpanish?: boolean): string {
  const today = new Date().toISOString().split("T")[0]
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0]
  let label = dateStr
  if (dateStr === today) label = isSpanish ? "Hoy" : "Today"
  else if (dateStr === tomorrow) label = isSpanish ? "Mañana" : "Tomorrow"
  else {
    const parts = dateStr.split("-")
    const mm = parseInt(parts[1] ?? "1", 10)
    const dd = parseInt(parts[2] ?? "1", 10)
    const months = isSpanish
      ? ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]
      : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    label = `${dd} ${months[mm - 1] ?? ""}`
  }
  if (timeStr) label += `, ${timeStr.slice(0, 5)}`
  return label
}

const PRIORITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: "bg-red-500/15",    text: "text-red-400",    label: "ALTA" },
  medium: { bg: "bg-amber-500/15",  text: "text-amber-400",  label: "MEDIA" },
  low:    { bg: "bg-emerald-500/15",text: "text-emerald-400",label: "BAJA" },
}

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

      const tasks = Array.isArray(tasksData?.items) ? tasksData.items : []
      const meetings = Array.isArray(meetingsData?.items) ? meetingsData.items : []
      const rawEvents = Array.isArray(eventsData?.items) ? eventsData.items : []
      const seenSig = new Set<string>()
      const events = rawEvents.filter((e) => {
        const sig = `${String(e.title ?? "").trim().toLowerCase()}|${String(e.event_date ?? "").slice(0, 10)}`
        if (seenSig.has(sig)) return false
        seenSig.add(sig)
        return true
      })
      const notes = Array.isArray(notesData?.items) ? notesData.items : []

      setSummary({ tasks: tasks.length, meetings: meetings.length, events: events.length, notes: notes.length })
      setPendingTasks(
        tasks
          .filter((t) => t.status === "pending")
          .map((t) => ({
            id: Number(t.id),
            title: String(t.title ?? ""),
            priority: (t.priority === "high" || t.priority === "low" ? t.priority : "medium") as Task["priority"],
            status: "pending" as const,
            due_date: typeof t.due_date === "string" ? t.due_date : undefined,
            due_time: typeof t.due_time === "string" ? t.due_time : undefined,
          }))
      )
      setAgenda(buildAgenda(
        meetings as Array<{ id: number; title: string; meeting_date: string }>,
        events as Array<{ id: number; title: string; event_date: string }>
      ))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const refresh = () => load()
    window.addEventListener("planner:tasks-updated", refresh)
    return () => window.removeEventListener("planner:tasks-updated", refresh)
  }, [load])

  const visibleTasks = showAllTasks ? pendingTasks : pendingTasks.slice(0, 4)

  const metricCards = useMemo(() => [
    {
      label: isSpanish ? "Tareas pendientes" : "Pending Tasks",
      value: summary.tasks,
      timeLabel: isSpanish ? "Hoy" : "Today",
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-[#6c5ce7]/15 text-[#6c5ce7]",
    },
    {
      label: isSpanish ? "Reuniones" : "Meetings",
      value: summary.meetings,
      timeLabel: isSpanish ? "Hoy" : "Today",
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      iconBg: "bg-blue-500/15 text-blue-400",
    },
    {
      label: isSpanish ? "Eventos" : "Events",
      value: summary.events,
      timeLabel: isSpanish ? "Esta semana" : "This Week",
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      iconBg: "bg-emerald-500/15 text-emerald-400",
    },
    {
      label: isSpanish ? "Notas" : "Notes Drafted",
      value: summary.notes,
      timeLabel: isSpanish ? "Recientes" : "Recent",
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      iconBg: "bg-amber-500/15 text-amber-400",
    },
  ], [isSpanish, summary])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 pt-4">

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {isSpanish ? "Vista general" : "Overview"}
        </p>
        <h1 className="text-3xl font-black tracking-tight">
          {greeting(isSpanish)}{userName ? `, ${userName}.` : "."}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">{todayLabel(locale)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.label} className="relative rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className={`flex size-9 items-center justify-center rounded-xl ${card.iconBg}`}>
                {card.icon}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {card.timeLabel}
              </span>
            </div>
            <p className="text-4xl font-black">{loading ? "—" : card.value}</p>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-base font-bold">{isSpanish ? "Tareas pendientes" : "Pending Tasks"}</p>
            <a
              href={`/${language}/planner`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {isSpanish ? "Ver todas →" : "View All →"}
            </a>
          </div>
          <div className="space-y-1.5">
            {pendingTasks.length === 0 && !loading ? (
              <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
                <p className="text-sm text-muted-foreground">{isSpanish ? "Sin tareas pendientes" : "No pending tasks"}</p>
              </div>
            ) : (
              <>
                {visibleTasks.map((task) => {
                  const badge = PRIORITY_BADGE[task.priority]
                  return (
                    <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
                      <div className="size-5 shrink-0 rounded-full border-2 border-border/60" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        {task.due_date && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" />
                            </svg>
                            {isSpanish ? "Vence" : "Due"} {formatDue(task.due_date, task.due_time, isSpanish)}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-black tracking-wide ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                  )
                })}
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

        <section className="flex flex-col gap-4">
          <DashboardCalendar />
        </section>
      </div>
    </div>
  )
}
