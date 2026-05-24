"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { getLanguageFromPathname } from "@/lib/language"

const WEEKDAYS_ES = ["L", "M", "X", "J", "V", "S", "D"]
const WEEKDAYS_EN = ["M", "T", "W", "T", "F", "S", "S"]
const MONTH_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
}

type TaskData = {
  id: number
  title: string
  description?: string | null
  due_date: string | null
  due_time?: string | null
  priority: "low" | "medium" | "high"
  status: "pending" | "in_progress" | "done"
}

type GcalEvent = {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
}

type CalendarEntry = {
  id: string
  type: "event" | "meeting" | "task" | "gcal"
  rawId: number
  title: string
  date: string
  time: string
  priority?: "low" | "medium" | "high"
  status?: "pending" | "in_progress" | "done"
  taskData?: TaskData
}

function toISO(d: Date) {
  return d.toISOString().split("T")[0]
}

function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const dow = first.getDay()
  const shift = dow === 0 ? 6 : dow - 1
  const start = new Date(year, month, 1 - shift)
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  )
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export function CalendarView() {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const isSpanish = language === "es"
  const weekdays = isSpanish ? WEEKDAYS_ES : WEEKDAYS_EN
  const monthShort = isSpanish ? MONTH_ES : MONTH_EN
  const priorityLabel = isSpanish
    ? { high: "Alta", medium: "Media", low: "Baja" }
    : { high: "High", medium: "Medium", low: "Low" }

  const now = new Date()

  const [events, setEvents] = useState<Array<{ id: number; title: string; event_date: string; event_time?: string | null; event_type?: string; gcal_event_id?: string | null }>>([])
  const [meetings, setMeetings] = useState<Array<{ id: number; title: string; meeting_date: string; meeting_time: string }>>([])
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [gcalEvents, setGcalEvents] = useState<GcalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(toISO(now))

  const [pickerVisible, setPickerVisible] = useState(false)
  const [pickerYear, setPickerYear] = useState(now.getFullYear())

  
  const [editTarget, setEditTarget] = useState<CalendarEntry | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  
  const [completing, setCompleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [evRes, mtRes, tkRes] = await Promise.all([
        fetch("/api/planner/events", { cache: "no-store" }),
        fetch("/api/planner/meetings", { cache: "no-store" }),
        fetch("/api/planner/tasks", { cache: "no-store" }),
      ])
      const evData = evRes.ok ? await evRes.json().catch(() => ({})) : {}
      const mtData = mtRes.ok ? await mtRes.json().catch(() => ({})) : {}
      const tkData = tkRes.ok ? await tkRes.json().catch(() => ({})) : {}
      setEvents(Array.isArray(evData?.items) ? evData.items : [])
      setMeetings(Array.isArray(mtData?.items) ? mtData.items : [])
      setTasks(Array.isArray(tkData?.items) ? tkData.items : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : (isSpanish ? "Error al cargar." : "Load error."))
    } finally {
      setLoading(false)
    }
  }, [isSpanish])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const timeMin = new Date(year, month - 1, 1).toISOString()
    const timeMax = new Date(year, month + 2, 0, 23, 59, 59).toISOString()
    fetch(`/api/google-calendar/events?time_min=${encodeURIComponent(timeMin)}&time_max=${encodeURIComponent(timeMax)}&max_results=100`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (Array.isArray(data?.events)) setGcalEvents(data.events as GcalEvent[]) })
      .catch(() => undefined)
  }, [year, month])

  const entries: CalendarEntry[] = useMemo(() => {
    const userEvents = events.filter((e) => e.event_type !== "google_calendar")
    const localGcalIds = new Set(userEvents.filter((e) => e.gcal_event_id != null).map((e) => e.gcal_event_id as string))
    const localEventSignatures = new Set(
      userEvents.map((e) => `${e.title.trim().toLowerCase()}|${e.event_date}`)
    )
    return [
      ...events
        .filter((e) => e.event_type !== "google_calendar")
        .map((e) => ({
          id: `ev-${e.id}`,
          type: "event" as const,
          rawId: e.id,
          title: e.title,
          date: e.event_date,
          time: e.event_time ?? "",
        })),
      ...meetings.map((m) => ({
        id: `mt-${m.id}`,
        type: "meeting" as const,
        rawId: m.id,
        title: m.title,
        date: m.meeting_date,
        time: m.meeting_time,
      })),
      ...tasks
        .filter((t) => t.due_date)
        .map((t) => ({
          id: `tk-${t.id}`,
          type: "task" as const,
          rawId: t.id,
          title: t.title,
          date: t.due_date!,
          time: t.due_time ?? "",
          priority: t.priority,
          status: t.status,
          taskData: t,
        })),
      // Elimina los eventos de Google Calendar que ya han sido respondidos
      ...gcalEvents
        .filter((g) => {
          if (localGcalIds.has(g.id)) return false
          const dateStr = g.start.dateTime ? g.start.dateTime.split("T")[0] : (g.start.date ?? "")
          return !localEventSignatures.has(`${(g.summary ?? "").trim().toLowerCase()}|${dateStr}`)
        })
        .map((g) => {
          const dateStr = g.start.dateTime ? g.start.dateTime.split("T")[0] : (g.start.date ?? "")
          const timeStr = g.start.dateTime
            ? new Date(g.start.dateTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
            : ""
          return { id: `gc-${g.id}`, type: "gcal" as const, rawId: 0, title: g.summary ?? "(sin título)", date: dateStr, time: timeStr }
        }),
    ]
  }, [events, meetings, tasks, gcalEvents])

  const countsByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of entries) map[e.date] = (map[e.date] ?? 0) + 1
    return map
  }, [entries])

  const visible = useMemo(() => entries.filter((e) => e.date === selected), [entries, selected])
  const grid = useMemo(() => buildGrid(year, month), [year, month])
  const today = toISO(now)

  function fmtMonthYear() {
    return new Date(year, month, 1).toLocaleString(isSpanish ? "es-ES" : "en-US", {
      month: "long",
      year: "numeric",
    })
  }

  function shiftMonth(dir: number) {
    const d = new Date(year, month + dir, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  function openEdit(e: CalendarEntry) {
    setEditTarget(e)
    setEditTitle(e.title)
    setEditDate(e.date)
    setEditTime(e.time)
    setSaveError(null)
  }

  async function saveEdit() {
    if (!editTarget || !editTitle.trim() || !editDate.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      let url: string
      let body: Record<string, unknown>

      if (editTarget.type === "event") {
        url = `/api/planner/events/${editTarget.rawId}`
        body = { title: editTitle.trim(), event_date: editDate.trim(), event_time: editTime.trim() || undefined }
      } else if (editTarget.type === "meeting") {
        url = `/api/planner/meetings/${editTarget.rawId}`
        body = { title: editTitle.trim(), meeting_date: editDate.trim(), meeting_time: editTime.trim() || "09:00:00" }
      } else {
        
        url = `/api/planner/tasks/${editTarget.rawId}`
        body = {
          title: editTitle.trim(),
          description: editTarget.taskData?.description ?? null,
          due_date: editDate.trim() || null,
          due_time: editTime.trim() || null,
          priority: editTarget.taskData?.priority ?? "medium",
          status: editTarget.taskData?.status ?? "pending",
        }
      }

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(isSpanish ? "No se pudo guardar." : "Could not save.")
      setEditTarget(null)
      load()
      if (editTarget.type === "task") window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error")
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(entry: CalendarEntry) {
    setDeleting(true)
    setSaveError(null)
    try {
      const path = entry.type === "event" ? "events" : entry.type === "meeting" ? "meetings" : "tasks"
      const res = await fetch(`/api/planner/${path}/${entry.rawId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(isSpanish ? "No se pudo eliminar." : "Could not delete.")
      setEditTarget(null)
      load()
      if (entry.type === "task") window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error")
    } finally {
      setDeleting(false)
    }
  }

  async function markComplete(entry: CalendarEntry) {
    if (!entry.taskData || entry.status === "done") return
    setCompleting(entry.id)
    try {
      const res = await fetch(`/api/planner/tasks/${entry.rawId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entry.taskData.title,
          description: entry.taskData.description ?? null,
          due_date: entry.taskData.due_date,
          due_time: entry.taskData.due_time ?? null,
          priority: entry.taskData.priority,
          status: "done",
        }),
      })
      if (!res.ok) throw new Error(isSpanish ? "No se pudo completar." : "Could not complete.")
      load()
      window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setCompleting(null)
    }
  }

  function entryAccentClass(entry: CalendarEntry) {
    if (entry.type === "task") return PRIORITY_DOT[entry.priority ?? "medium"]
    if (entry.type === "event") return "bg-amber-400"
    if (entry.type === "gcal") return "bg-[#4285F4]"
    return "bg-primary"
  }

  function entryTypeLabel(entry: CalendarEntry) {
    if (entry.type === "task") return isSpanish ? "Tarea" : "Task"
    if (entry.type === "event") return isSpanish ? "Evento" : "Event"
    if (entry.type === "gcal") return "Google"
    return isSpanish ? "Reunión" : "Meeting"
  }

  function entryTypeLabelClass(entry: CalendarEntry) {
    if (entry.type === "task") return `text-${entry.priority === "high" ? "destructive" : entry.priority === "medium" ? "amber-500" : "emerald-500"}`
    if (entry.type === "event") return "text-amber-500"
    if (entry.type === "gcal") return "text-[#4285F4]"
    return "text-primary"
  }

  return (
    <div className="flex flex-col gap-4 p-4">

      {}
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-2 py-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-xl p-2.5 text-2xl leading-none text-primary hover:bg-accent"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => { setPickerYear(year); setPickerVisible(true) }}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 hover:bg-accent"
        >
          <span className="text-sm font-bold capitalize">{fmtMonthYear()}</span>
          <span className="text-xs text-primary">⌄</span>
        </button>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-xl p-2.5 text-2xl leading-none text-primary hover:bg-accent"
        >
          ›
        </button>
      </div>

      {}
      <div className="rounded-2xl border border-border/70 bg-card p-3">
        <div className="mb-1 grid grid-cols-7 text-center">
          {weekdays.map((d, i) => (
            <span key={i} className="py-1 text-[11px] font-bold text-muted-foreground">{d}</span>
          ))}
        </div>
        {chunk(grid, 7).map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const iso = toISO(day)
              const inMonth = day.getMonth() === month
              const isSelected = iso === selected
              const isToday = iso === today
              const count = countsByDate[iso] ?? 0
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelected(iso)}
                  className={[
                    "relative flex h-10 flex-col items-center justify-center rounded-xl m-0.5 transition-colors",
                    isSelected ? "bg-primary/15" : isToday ? "border border-primary" : "hover:bg-accent",
                    !inMonth ? "opacity-30" : "",
                  ].join(" ")}
                >
                  <span className={[
                    "text-sm",
                    isSelected ? "font-extrabold text-primary" : "text-foreground",
                    isToday && !isSelected ? "font-bold" : "",
                  ].join(" ")}>
                    {day.getDate()}
                  </span>
                  {count > 0 && (
                    <span className="mt-0.5 size-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{isSpanish ? "Cargando..." : "Loading..."}</p>}

      {}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {selected === today
            ? isSpanish ? "HOY" : "TODAY"
            : selected.slice(5).replace("-", "/")}
        </p>
        {visible.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
            <p className="text-sm text-muted-foreground">
              {isSpanish ? "Sin elementos este día" : "Nothing on this day"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((entry) => (
              <div key={entry.id} className="flex overflow-hidden rounded-xl border border-border/70 bg-card">
                <div className={`w-1 shrink-0 ${entryAccentClass(entry)}`} />
                <div className="flex-1 p-3.5">
                  {}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wide ${entryTypeLabelClass(entry)}`}>
                        {entryTypeLabel(entry)}
                      </span>
                      {}
                      {entry.type === "task" && entry.priority && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className={`size-1.5 rounded-full ${PRIORITY_DOT[entry.priority]}`} />
                          {priorityLabel[entry.priority]}
                        </span>
                      )}
                      {}
                      {entry.status === "done" && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {isSpanish ? "Completada" : "Done"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {entry.type === "task" && entry.status !== "done" && (
                        <button
                          type="button"
                          disabled={completing === entry.id}
                          onClick={() => markComplete(entry)}
                          className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400"
                        >
                          {completing === entry.id ? "..." : isSpanish ? "Completar ✓" : "Complete ✓"}
                        </button>
                      )}
                      {entry.type !== "gcal" && (
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isSpanish ? "Editar" : "Edit"}
                        </button>
                      )}
                    </div>
                  </div>

                  {}
                  <p className={`mt-1 text-sm font-semibold ${entry.status === "done" ? "line-through opacity-50" : ""}`}>
                    {entry.title}
                  </p>

                  {}
                  {entry.time && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.time}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {}
      {pickerVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPickerVisible(false)}
        >
          <div
            className="w-72 rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPickerYear((y) => y - 1)}
                className="rounded-xl p-2 text-xl text-primary hover:bg-accent"
              >
                ‹
              </button>
              <span className="text-xl font-extrabold">{pickerYear}</span>
              <button
                type="button"
                onClick={() => setPickerYear((y) => y + 1)}
                className="rounded-xl p-2 text-xl text-primary hover:bg-accent"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {monthShort.map((label, mi) => {
                const isActive = mi === month && pickerYear === year
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setYear(pickerYear); setMonth(mi); setPickerVisible(false) }}
                    className={[
                      "rounded-xl py-2.5 text-sm font-medium transition-colors",
                      isActive ? "bg-primary/15 font-bold text-primary" : "hover:bg-accent",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => !saving && !deleting && setEditTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-5 text-lg font-bold">
              {isSpanish ? "Editar" : "Edit"}{" "}
              <span className="font-normal text-muted-foreground capitalize">
                — {entryTypeLabel(editTarget)}
              </span>
            </h3>

            <div className="space-y-4">
              {[
                {
                  label: isSpanish ? "Título" : "Title",
                  value: editTitle,
                  set: setEditTitle,
                  placeholder: editTarget.title,
                },
                {
                  label: isSpanish
                    ? editTarget.type === "task" ? "Fecha de vencimiento (yyyy-MM-dd)" : "Fecha (yyyy-MM-dd)"
                    : editTarget.type === "task" ? "Due date (yyyy-MM-dd)" : "Date (yyyy-MM-dd)",
                  value: editDate,
                  set: setEditDate,
                  placeholder: "2026-05-20",
                },
                {
                  label: isSpanish ? "Hora (HH:mm:ss)" : "Time (HH:mm:ss)",
                  value: editTime,
                  set: setEditTime,
                  placeholder: "09:00:00",
                },
              ].map((f) => (
                <div key={f.label}>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {f.label}
                  </label>
                  <input
                    className="w-full rounded-xl border border-input bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={f.value}
                    placeholder={f.placeholder}
                    onChange={(e) => f.set(e.target.value)}
                    disabled={saving || deleting}
                  />
                </div>
              ))}

              {saveError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {saveError}
                </p>
              )}
            </div>

            {}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={saving || deleting}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-accent disabled:opacity-50"
              >
                {isSpanish ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving || deleting}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "..." : isSpanish ? "Guardar" : "Save"}
              </button>
            </div>

            {}
            <button
              type="button"
              onClick={() => deleteEntry(editTarget)}
              disabled={saving || deleting}
              className="mt-3 w-full rounded-xl border border-destructive/30 py-3 text-sm font-bold text-destructive hover:bg-destructive/5 disabled:opacity-50"
            >
              {deleting
                ? isSpanish ? "Eliminando..." : "Deleting..."
                : isSpanish ? "Eliminar" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
