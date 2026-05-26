"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { getLanguageFromPathname } from "@/lib/language"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const MONTH_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]
const MONTH_ES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const MONTH_EN_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

const DAY_HOURS = Array.from({ length: 17 }, (_, i) => i + 7)

type CalViewMode = "month" | "week" | "day"

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

function shiftDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + n)
  return toISO(d)
}

function getWeekStart(iso: string): Date {
  const d = new Date(iso + "T00:00:00")
  const dow = d.getDay()
  const shift = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - shift)
  return d
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

function parseHour(timeStr: string): number | null {
  if (!timeStr) return null
  const h = parseInt(timeStr.split(":")[0] ?? "", 10)
  return isNaN(h) ? null : h
}

function entryChipClass(entry: CalendarEntry): string {
  if (entry.type === "meeting") return "bg-[#6c5ce7]/20 text-[#6c5ce7]"
  if (entry.type === "gcal") return "bg-[#4285F4]/20 text-[#4285F4]"
  if (entry.type === "task") {
    if (entry.priority === "high") return "bg-red-500/20 text-red-400"
    if (entry.priority === "low") return "bg-emerald-500/20 text-emerald-400"
    return "bg-amber-500/20 text-amber-400"
  }
  return "bg-amber-500/20 text-amber-400"
}

function entryAccentBg(entry: CalendarEntry): string {
  if (entry.type === "meeting") return "bg-[#6c5ce7]"
  if (entry.type === "gcal") return "bg-[#4285F4]"
  if (entry.type === "task") {
    if (entry.priority === "high") return "bg-red-500"
    if (entry.priority === "low") return "bg-emerald-500"
    return "bg-amber-500"
  }
  return "bg-amber-500"
}

export function CalendarView() {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const isSpanish = language === "es"
  const weekdays = isSpanish ? WEEKDAYS_ES : WEEKDAYS_EN

  const now = new Date()
  const today = toISO(now)

  const [calViewMode, setCalViewMode] = useState<CalViewMode>("month")
  const [events, setEvents] = useState<Array<{ id: number; title: string; event_date: string; event_time?: string | null; event_type?: string; gcal_event_id?: string | null }>>([])
  const [meetings, setMeetings] = useState<Array<{ id: number; title: string; meeting_date: string; meeting_time: string }>>([])
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [gcalEvents, setGcalEvents] = useState<GcalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(today)

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

  const [showNewEvent, setShowNewEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: "", event_date: today, event_time: "", location: "" })
  const [creatingEvent, setCreatingEvent] = useState(false)

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
    const localEventSignatures = new Set(userEvents.map((e) => `${e.title.trim().toLowerCase()}|${e.event_date}`))
    return [
      ...userEvents.map((e) => ({
        id: `ev-${e.id}`, type: "event" as const, rawId: e.id,
        title: e.title, date: e.event_date, time: e.event_time ?? "",
      })),
      ...meetings.map((m) => ({
        id: `mt-${m.id}`, type: "meeting" as const, rawId: m.id,
        title: m.title, date: m.meeting_date, time: m.meeting_time,
      })),
      ...tasks.filter((t) => t.due_date).map((t) => ({
        id: `tk-${t.id}`, type: "task" as const, rawId: t.id,
        title: t.title, date: t.due_date!, time: t.due_time ?? "",
        priority: t.priority, status: t.status, taskData: t,
      })),
      ...gcalEvents
        .filter((g) => {
          if (localGcalIds.has(g.id)) return false
          const dateStr = g.start.dateTime ? g.start.dateTime.split("T")[0] : (g.start.date ?? "")
          return !localEventSignatures.has(`${(g.summary ?? "").trim().toLowerCase()}|${dateStr}`)
        })
        .map((g) => {
          const dateStr = g.start.dateTime ? g.start.dateTime.split("T")[0] : (g.start.date ?? "")
          const timeStr = g.start.dateTime
            ? new Date(g.start.dateTime).toLocaleTimeString(isSpanish ? "es-ES" : "en-US", { hour: "2-digit", minute: "2-digit" })
            : ""
          return { id: `gc-${g.id}`, type: "gcal" as const, rawId: 0, title: g.summary ?? (isSpanish ? "(sin título)" : "(no title)"), date: dateStr, time: timeStr }
        }),
    ]
  }, [events, meetings, tasks, gcalEvents, isSpanish])

  const entriesByDate = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {}
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [entries])

  const grid = useMemo(() => buildGrid(year, month), [year, month])
  const weekDays = useMemo(() => {
    const ws = getWeekStart(selected)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [selected])
  function shiftView(dir: number) {
    if (calViewMode === "month") {
      const d = new Date(year, month + dir, 1)
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    } else if (calViewMode === "week") {
      const next = shiftDays(selected, dir * 7)
      setSelected(next)
      const d = new Date(next + "T00:00:00")
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    } else {
      const next = shiftDays(selected, dir)
      setSelected(next)
      const d = new Date(next + "T00:00:00")
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    }
  }

  function goToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setSelected(today)
  }
  function fmtLabel(): string {
    if (calViewMode === "month") {
      return new Date(year, month, 1).toLocaleString(isSpanish ? "es-ES" : "en-US", { month: "long", year: "numeric" })
    }
    if (calViewMode === "week") {
      const ws = getWeekStart(selected)
      const we = new Date(ws); we.setDate(we.getDate() + 6)
      const wsISO = toISO(ws); const weISO = toISO(we)
      const wsM = parseInt(wsISO.split("-")[1] ?? "1", 10) - 1
      const weM = parseInt(weISO.split("-")[1] ?? "1", 10) - 1
      const wsD = parseInt(wsISO.split("-")[2] ?? "1", 10)
      const weD = parseInt(weISO.split("-")[2] ?? "1", 10)
      const months = isSpanish ? MONTH_ES_SHORT : MONTH_EN_SHORT
      if (wsM === weM) return `${months[wsM]} ${wsD} - ${weD}, ${ws.getFullYear()}`
      return `${months[wsM]} ${wsD} - ${months[weM]} ${weD}, ${we.getFullYear()}`
    }
    const d = new Date(selected + "T00:00:00")
    const dd = d.getDate()
    const mm = d.getMonth()
    const yyyy = d.getFullYear()
    const months = isSpanish ? MONTH_ES : MONTH_EN_SHORT
    if (isSpanish) {
      const wd = d.toLocaleDateString("es-ES", { weekday: "long" })
      return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${dd} de ${months[mm]} de ${yyyy}`
    }
    const wd = d.toLocaleDateString("en-US", { weekday: "long" })
    return `${wd}, ${months[mm]} ${dd}, ${yyyy}`
  }

  function openEdit(e: CalendarEntry) {
    setEditTarget(e); setEditTitle(e.title); setEditDate(e.date); setEditTime(e.time); setSaveError(null)
  }

  async function saveEdit() {
    if (!editTarget || !editTitle.trim() || !editDate.trim()) return
    setSaving(true); setSaveError(null)
    try {
      let url: string; let body: Record<string, unknown>
      if (editTarget.type === "event") {
        url = `/api/planner/events/${editTarget.rawId}`
        body = { title: editTitle.trim(), event_date: editDate.trim(), event_time: editTime.trim() || undefined }
      } else if (editTarget.type === "meeting") {
        url = `/api/planner/meetings/${editTarget.rawId}`
        body = { title: editTitle.trim(), meeting_date: editDate.trim(), meeting_time: editTime.trim() || "09:00:00" }
      } else {
        url = `/api/planner/tasks/${editTarget.rawId}`
        body = {
          title: editTitle.trim(), description: editTarget.taskData?.description ?? null,
          due_date: editDate.trim() || null, due_time: editTime.trim() || null,
          priority: editTarget.taskData?.priority ?? "medium", status: editTarget.taskData?.status ?? "pending",
        }
      }
      const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(isSpanish ? "No se pudo guardar." : "Could not save.")
      setEditTarget(null); load()
      if (editTarget.type === "task") window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
    } catch (e) { setSaveError(e instanceof Error ? e.message : "Error") }
    finally { setSaving(false) }
  }

  async function deleteEntry(entry: CalendarEntry) {
    setDeleting(true); setSaveError(null)
    try {
      const path = entry.type === "event" ? "events" : entry.type === "meeting" ? "meetings" : "tasks"
      const res = await fetch(`/api/planner/${path}/${entry.rawId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(isSpanish ? "No se pudo eliminar." : "Could not delete.")
      setEditTarget(null); load()
      if (entry.type === "task") window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
    } catch (e) { setSaveError(e instanceof Error ? e.message : "Error") }
    finally { setDeleting(false) }
  }

  async function markComplete(entry: CalendarEntry) {
    if (!entry.taskData || entry.status === "done") return
    setCompleting(entry.id)
    try {
      const res = await fetch(`/api/planner/tasks/${entry.rawId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entry.taskData.title, description: entry.taskData.description ?? null,
          due_date: entry.taskData.due_date, due_time: entry.taskData.due_time ?? null,
          priority: entry.taskData.priority, status: "done",
        }),
      })
      if (!res.ok) throw new Error(isSpanish ? "No se pudo completar." : "Could not complete.")
      load(); window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
    } catch (e) { setError(e instanceof Error ? e.message : "Error") }
    finally { setCompleting(null) }
  }

  async function createEvent() {
    if (!newEvent.title.trim() || !newEvent.event_date) return
    setCreatingEvent(true)
    try {
      const res = await fetch("/api/planner/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvent.title.trim(), event_date: newEvent.event_date,
          event_time: newEvent.event_time || null, location: newEvent.location.trim() || null, event_type: "general",
        }),
      })
      if (!res.ok) throw new Error()
      setShowNewEvent(false)
      setNewEvent({ title: "", event_date: today, event_time: "", location: "" })
      load()
      toast.success(isSpanish ? "Evento creado" : "Event created")
    } catch {
      toast.error(isSpanish ? "No se pudo crear el evento" : "Could not create event")
    } finally { setCreatingEvent(false) }
  }

  function entryTypeLabel(entry: CalendarEntry) {
    if (entry.type === "task") return isSpanish ? "Tarea" : "Task"
    if (entry.type === "event") return isSpanish ? "Evento" : "Event"
    if (entry.type === "gcal") return "Google"
    return isSpanish ? "Reunión" : "Meeting"
  }

  const inputCls = "w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60"
  const MONTH_SHORT = isSpanish ? MONTH_ES_SHORT : MONTH_EN_SHORT

  const dayEntries = entriesByDate[selected] ?? []
  const timedEntries = dayEntries.filter((e) => parseHour(e.time) !== null)
  const allDayEntries = dayEntries.filter((e) => parseHour(e.time) === null)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 pt-4">

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shiftView(-1)}
            className="flex size-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button type="button" onClick={goToday}
            className="rounded-lg border border-border/70 px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors">
            {isSpanish ? "Hoy" : "Today"}
          </button>
          <button type="button" onClick={() => shiftView(1)}
            className="flex size-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {calViewMode === "month" ? (
          <button type="button" onClick={() => { setPickerYear(year); setPickerVisible(true) }}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors">
            <h2 className="text-xl font-black capitalize">{fmtLabel()}</h2>
            <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        ) : (
          <h2 className="px-2 text-xl font-black capitalize">{fmtLabel()}</h2>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-lg border border-[#4285F4]/30 bg-[#4285F4]/5 px-3 py-1.5 sm:flex">
            <span className="size-1.5 rounded-full bg-[#4285F4]" />
            <span className="text-[11px] font-semibold text-[#4285F4]">
              {isSpanish ? "Sincronizado con Google Calendar" : "Synced with Google Calendar"}
            </span>
          </div>

          <div className="flex rounded-lg border border-border/70 overflow-hidden">
            {(["month", "week", "day"] as CalViewMode[]).map((v) => (
              <button key={v} type="button" onClick={() => setCalViewMode(v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold transition-colors",
                  calViewMode === v ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}>
                {v === "month" ? (isSpanish ? "Mes" : "Month") : v === "week" ? (isSpanish ? "Sem." : "Week") : (isSpanish ? "Día" : "Day")}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => { setNewEvent((v) => ({ ...v, event_date: selected })); setShowNewEvent(true) }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {isSpanish ? "Nuevo evento" : "New Event"}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {calViewMode === "month" && (
        <>
          <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border/70">
              {weekdays.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-bold text-muted-foreground">{d}</div>
              ))}
            </div>
            {chunk(grid, 7).map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-border/70 last:border-0">
                {week.map((day) => {
                  const iso = toISO(day)
                  const inMonth = day.getMonth() === month
                  const isSelected = iso === selected
                  const isToday = iso === today
                  const dayEnts = entriesByDate[iso] ?? []
                  return (
                    <button key={iso} type="button" onClick={() => setSelected(iso)}
                      className={cn(
                        "flex min-h-20 flex-col items-start border-r border-border/70 last:border-0 p-1.5 text-left transition-colors",
                        isSelected ? "bg-primary/10" : isToday ? "bg-primary/5" : "hover:bg-accent/40",
                        !inMonth && "opacity-40"
                      )}>
                      <span className={cn(
                        "mb-1 flex size-6 items-center justify-center rounded-full text-xs font-bold leading-none",
                        isSelected ? "bg-primary text-white" : isToday ? "text-primary" : "text-foreground"
                      )}>
                        {day.getDate()}
                      </span>
                      {dayEnts.slice(0, 3).map((entry) => (
                        <div key={entry.id} className={cn(
                          "mb-0.5 w-full truncate rounded px-1 py-0.5 text-[9px] font-semibold leading-tight",
                          entryChipClass(entry)
                        )}>
                          {entry.time ? `${entry.time.slice(0, 5)} ` : ""}{entry.title}
                        </div>
                      ))}
                      {dayEnts.length > 3 && (
                        <span className="text-[9px] font-medium text-muted-foreground">+{dayEnts.length - 3}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {selected === today
                ? isSpanish ? "HOY" : "TODAY"
                : new Date(selected + "T00:00:00").toLocaleDateString(isSpanish ? "es-ES" : "en-US", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {loading ? (
              <p className="text-sm text-muted-foreground">{isSpanish ? "Cargando..." : "Loading..."}</p>
            ) : dayEntries.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
                <p className="text-sm text-muted-foreground">{isSpanish ? "Sin elementos este día" : "Nothing on this day"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} isSpanish={isSpanish}
                    completing={completing} onEdit={openEdit} onComplete={markComplete} entryTypeLabel={entryTypeLabel} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {calViewMode === "week" && (
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border/70">
            {weekDays.map((day) => {
              const iso = toISO(day)
              const isToday = iso === today
              const isSelected = iso === selected
              const wd = isSpanish ? WEEKDAYS_ES[weekDays.indexOf(day)] : WEEKDAYS_EN[weekDays.indexOf(day)]
              return (
                <button key={iso} type="button"
                  onClick={() => { setSelected(iso); setCalViewMode("day") }}
                  className={cn(
                    "flex flex-col items-center gap-0.5 border-r border-border/70 last:border-0 py-3 transition-colors hover:bg-accent/40",
                    isSelected && "bg-primary/10"
                  )}>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{wd}</span>
                  <span className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-black",
                    isToday ? "bg-primary text-white" : isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {day.getDate()}
                  </span>
                  {(entriesByDate[iso] ?? []).length > 0 && (
                    <span className="size-1 rounded-full bg-primary/50" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-7 divide-x divide-border/70 min-h-75">
            {weekDays.map((day) => {
              const iso = toISO(day)
              const isToday = iso === today
              const isSelected = iso === selected
              const dayEnts = entriesByDate[iso] ?? []
              return (
                <div key={iso}
                  className={cn(
                    "flex flex-col gap-1 p-2 cursor-pointer transition-colors hover:bg-accent/20",
                    isSelected && "bg-primary/5",
                    isToday && !isSelected && "bg-primary/3"
                  )}
                  onClick={() => setSelected(iso)}
                >
                  {dayEnts.length === 0 ? null : dayEnts.map((entry) => (
                    <button key={entry.id} type="button"
                      onClick={(e) => { e.stopPropagation(); openEdit(entry) }}
                      className={cn(
                        "w-full truncate rounded-md px-2 py-1 text-left text-[10px] font-semibold leading-tight transition-colors hover:brightness-110",
                        entryChipClass(entry)
                      )}>
                      {entry.time ? `${entry.time.slice(0, 5)} ` : ""}{entry.title}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {calViewMode === "day" && (
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
          {allDayEntries.length > 0 && (
            <div className="flex items-start gap-3 border-b border-border/70 px-4 py-2">
              <span className="w-14 shrink-0 pt-0.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {isSpanish ? "Todo el día" : "All day"}
              </span>
              <div className="flex flex-1 flex-wrap gap-1">
                {allDayEntries.map((entry) => (
                  <button key={entry.id} type="button" onClick={() => openEdit(entry)}
                    className={cn("rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors hover:brightness-110", entryChipClass(entry))}>
                    {entry.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-150">
            {DAY_HOURS.map((hour) => {
              const hourEntries = timedEntries.filter((e) => parseHour(e.time) === hour)
              const isCurrentHour = toISO(now) === selected && now.getHours() === hour
              return (
                <div key={hour} className={cn(
                  "flex min-h-14 items-start gap-3 border-b border-border/70 px-4 last:border-0",
                  isCurrentHour && "bg-primary/3"
                )}>
                  <span className={cn(
                    "w-14 shrink-0 pt-3.5 text-right text-[11px] font-semibold tabular-nums",
                    isCurrentHour ? "text-primary font-bold" : "text-muted-foreground"
                  )}>
                    {String(hour).padStart(2, "0")}:00
                  </span>
                  <div className="flex flex-1 flex-wrap gap-1.5 py-2">
                    {isCurrentHour && (
                      <div className="mb-1 flex w-full items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" />
                        <div className="h-px flex-1 bg-primary/30" />
                      </div>
                    )}
                    {hourEntries.map((entry) => (
                      <button key={entry.id} type="button" onClick={() => openEdit(entry)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors hover:brightness-110",
                          entryChipClass(entry)
                        )}>
                        <span className={cn("size-1.5 shrink-0 rounded-full", entryAccentBg(entry))} />
                        <span className="font-normal opacity-80 mr-0.5">{entry.time.slice(0, 5)}</span>
                        {entry.title}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {loading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{isSpanish ? "Cargando..." : "Loading..."}</p>
          ) : dayEntries.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {isSpanish ? "Sin elementos este día" : "Nothing scheduled for this day"}
            </p>
          ) : null}
        </div>
      )}

      {pickerVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPickerVisible(false)}>
          <div className="w-72 rounded-2xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => setPickerYear((y) => y - 1)}
                className="rounded-xl p-2 text-muted-foreground hover:bg-accent">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <span className="text-xl font-extrabold">{pickerYear}</span>
              <button type="button" onClick={() => setPickerYear((y) => y + 1)}
                className="rounded-xl p-2 text-muted-foreground hover:bg-accent">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MONTH_SHORT.map((label, mi) => {
                const isActive = mi === month && pickerYear === year
                return (
                  <button key={label} type="button"
                    onClick={() => { setYear(pickerYear); setMonth(mi); setPickerVisible(false) }}
                    className={cn("rounded-xl py-2.5 text-sm font-medium transition-colors",
                      isActive ? "bg-primary/15 font-bold text-primary" : "hover:bg-accent")}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {showNewEvent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => !creatingEvent && setShowNewEvent(false)}>
          <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">{isSpanish ? "Nuevo evento" : "New Event"}</h3>
              <button type="button" onClick={() => setShowNewEvent(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Título" : "Title"}</label>
                <input className={inputCls} placeholder={isSpanish ? "Nombre del evento" : "Event name"} value={newEvent.title} onChange={(e) => setNewEvent((v) => ({ ...v, title: e.target.value }))} disabled={creatingEvent} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Fecha" : "Date"}</label>
                  <input type="date" className={inputCls} value={newEvent.event_date} onChange={(e) => setNewEvent((v) => ({ ...v, event_date: e.target.value }))} disabled={creatingEvent} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Hora" : "Time"}</label>
                  <input type="time" className={inputCls} value={newEvent.event_time} onChange={(e) => setNewEvent((v) => ({ ...v, event_time: e.target.value }))} disabled={creatingEvent} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Ubicación" : "Location"}</label>
                <input className={inputCls} placeholder={isSpanish ? "Opcional" : "Optional"} value={newEvent.location} onChange={(e) => setNewEvent((v) => ({ ...v, location: e.target.value }))} disabled={creatingEvent} />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowNewEvent(false)} disabled={creatingEvent}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-accent disabled:opacity-50 transition-colors">
                {isSpanish ? "Cancelar" : "Cancel"}
              </button>
              <button type="button" onClick={createEvent} disabled={creatingEvent || !newEvent.title.trim() || !newEvent.event_date}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {creatingEvent ? "..." : isSpanish ? "Crear" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => !saving && !deleting && setEditTarget(null)}>
          <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-5 text-lg font-bold">
              {isSpanish ? "Editar" : "Edit"}{" "}
              <span className="font-normal text-muted-foreground capitalize">- {entryTypeLabel(editTarget)}</span>
            </h3>
            <div className="space-y-4">
              {[
                { label: isSpanish ? "Título" : "Title", value: editTitle, set: setEditTitle, placeholder: editTarget.title },
                {
                  label: editTarget.type === "task" ? (isSpanish ? "Fecha de vencimiento" : "Due date") : (isSpanish ? "Fecha" : "Date"),
                  value: editDate, set: setEditDate, placeholder: "2026-05-20",
                },
                { label: isSpanish ? "Hora" : "Time", value: editTime, set: setEditTime, placeholder: "09:00:00" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{f.label}</label>
                  <input className={inputCls} value={f.value} placeholder={f.placeholder}
                    onChange={(e) => f.set(e.target.value)} disabled={saving || deleting} />
                </div>
              ))}
              {saveError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError}</p>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setEditTarget(null)} disabled={saving || deleting}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-accent disabled:opacity-50 transition-colors">
                {isSpanish ? "Cancelar" : "Cancel"}
              </button>
              <button type="button" onClick={saveEdit} disabled={saving || deleting}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? "..." : isSpanish ? "Guardar" : "Save"}
              </button>
            </div>
            <button type="button" onClick={() => deleteEntry(editTarget)} disabled={saving || deleting}
              className="mt-3 w-full rounded-xl border border-destructive/30 py-3 text-sm font-bold text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors">
              {deleting ? (isSpanish ? "Eliminando..." : "Deleting...") : (isSpanish ? "Eliminar" : "Delete")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EntryCard({
  entry, isSpanish, completing, onEdit, onComplete, entryTypeLabel,
}: {
  entry: CalendarEntry
  isSpanish: boolean
  completing: string | null
  onEdit: (e: CalendarEntry) => void
  onComplete: (e: CalendarEntry) => void
  entryTypeLabel: (e: CalendarEntry) => string
}) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className={cn("w-1 shrink-0", entryChipClass(entry).split(" ")[0])} />
      <div className="flex-1 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("text-[11px] font-bold uppercase tracking-wide", entryChipClass(entry).split(" ")[1])}>
              {entryTypeLabel(entry)}
            </span>
            {entry.status === "done" && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                {isSpanish ? "Completada" : "Done"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {entry.type === "task" && entry.status !== "done" && (
              <button type="button" disabled={completing === entry.id} onClick={() => onComplete(entry)}
                className="text-xs font-semibold text-emerald-500 hover:underline disabled:opacity-50">
                {completing === entry.id ? "..." : isSpanish ? "Completar ✓" : "Complete ✓"}
              </button>
            )}
            {entry.type !== "gcal" && (
              <button type="button" onClick={() => onEdit(entry)} className="text-xs text-muted-foreground hover:text-foreground">
                {isSpanish ? "Editar" : "Edit"}
              </button>
            )}
          </div>
        </div>
        <p className={cn("mt-1 text-sm font-semibold", entry.status === "done" ? "line-through opacity-50" : "")}>
          {entry.title}
        </p>
        {entry.time && <p className="mt-0.5 text-xs text-muted-foreground">{entry.time.slice(0, 5)}</p>}
      </div>
    </div>
  )
}
