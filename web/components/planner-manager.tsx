"use client"

import { cn } from "@/lib/utils"
import { getLanguageFromPathname } from "@/lib/language"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

type Tab = "tasks" | "meetings" | "events" | "notes"

type Task = {
  id: number
  title: string
  description?: string | null
  due_date?: string | null
  due_time?: string | null
  priority: "low" | "medium" | "high"
  status: "pending" | "in_progress" | "done"
}

type Meeting = {
  id: number
  title: string
  description?: string | null
  meeting_date: string
  meeting_time: string
  duration_minutes?: number | null
  location?: string | null
  participants: string[]
  status: "scheduled" | "completed" | "cancelled"
}

type Event = {
  id: number
  title: string
  description?: string | null
  event_date: string
  event_time?: string | null
  location?: string | null
  event_type: string
  gcal_event_id?: string | null
}

type Note = {
  id: number
  title: string
  content?: string | null
  status: "active" | "archived"
}

function normalizeDate(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 10) : ""
}

function normalizeTime(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.slice(0, 5)
}

function parseParticipants(value: string): string[] {
  return value.split(",").map((p) => p.trim()).filter(Boolean)
}

const PRIORITY_BADGE: Record<string, { bg: string; text: string; label: string; labelEs: string }> = {
  high:   { bg: "bg-red-500/15",    text: "text-red-400",    label: "HIGH",   labelEs: "ALTA"  },
  medium: { bg: "bg-amber-500/15",  text: "text-amber-400",  label: "MEDIUM", labelEs: "MEDIA" },
  low:    { bg: "bg-emerald-500/15",text: "text-emerald-400",label: "LOW",    labelEs: "BAJA"  },
}

type Props = { className?: string }

export function PlannerManager({ className }: Props) {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const isSpanish = language === "es"

  const [activeTab, setActiveTab] = useState<Tab>("tasks")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [quickAddText, setQuickAddText] = useState("")

  const [editTarget, setEditTarget] = useState<{ tab: Tab; item: Task | Meeting | Event | Note } | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [editSaving, setEditSaving] = useState(false)

  const [tasks, setTasks] = useState<Task[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  const [taskForm, setTaskForm] = useState({
    title: "", description: "", due_date: "", due_time: "",
    priority: "medium" as Task["priority"], status: "pending" as Task["status"],
  })
  const [meetingForm, setMeetingForm] = useState({
    title: "", description: "", meeting_date: "", meeting_time: "",
    duration_minutes: "", location: "", participants: "", status: "scheduled" as Meeting["status"],
  })
  const [eventForm, setEventForm] = useState({
    title: "", description: "", event_date: "", event_time: "", location: "", event_type: "general",
  })
  const [noteForm, setNoteForm] = useState({
    title: "", content: "", status: "active" as Note["status"],
  })

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(
        payload && typeof payload === "object" && "detail" in payload
          ? String((payload as { detail?: unknown }).detail ?? "Error")
          : "Error"
      )
    }
    return payload as T
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [taskRes, meetingRes, eventRes, noteRes] = await Promise.all([
        requestJson<{ items?: Array<Record<string, unknown>> }>("/api/planner/tasks", { method: "GET", headers: {} }),
        requestJson<{ items?: Array<Record<string, unknown>> }>("/api/planner/meetings", { method: "GET", headers: {} }),
        requestJson<{ items?: Array<Record<string, unknown>> }>("/api/planner/events", { method: "GET", headers: {} }),
        requestJson<{ items?: Array<Record<string, unknown>> }>("/api/planner/notes", { method: "GET", headers: {} }),
      ])
      setTasks(
        (taskRes.items ?? []).map<Task | null>((item) => {
          const id = Number(item.id); const title = typeof item.title === "string" ? item.title : ""
          if (!id || !title) return null
          return {
            id, title,
            description: typeof item.description === "string" ? item.description : null,
            due_date: normalizeDate(item.due_date) || null,
            due_time: normalizeTime(item.due_time) || null,
            priority: item.priority === "low" || item.priority === "high" ? item.priority : "medium",
            status: item.status === "in_progress" || item.status === "done" ? item.status : "pending",
          }
        }).filter((item): item is Task => item !== null)
      )
      setMeetings(
        (meetingRes.items ?? []).map<Meeting | null>((item) => {
          const id = Number(item.id); const title = typeof item.title === "string" ? item.title : ""
          const meetingDate = normalizeDate(item.meeting_date); const meetingTime = normalizeTime(item.meeting_time)
          if (!id || !title || !meetingDate || !meetingTime) return null
          return {
            id, title,
            description: typeof item.description === "string" ? item.description : null,
            meeting_date: meetingDate, meeting_time: meetingTime,
            duration_minutes: Number(item.duration_minutes) || null,
            location: typeof item.location === "string" ? item.location : null,
            participants: Array.isArray(item.participants)
              ? item.participants.filter((v): v is string => typeof v === "string") : [],
            status: item.status === "completed" || item.status === "cancelled" ? item.status : "scheduled",
          }
        }).filter((item): item is Meeting => item !== null)
      )
      setEvents(
        (eventRes.items ?? []).map<Event | null>((item) => {
          const id = Number(item.id); const title = typeof item.title === "string" ? item.title : ""
          const eventDate = normalizeDate(item.event_date)
          if (!id || !title || !eventDate) return null
          return {
            id, title,
            description: typeof item.description === "string" ? item.description : null,
            event_date: eventDate, event_time: normalizeTime(item.event_time) || null,
            location: typeof item.location === "string" ? item.location : null,
            event_type: typeof item.event_type === "string" ? item.event_type : "general",
            gcal_event_id: typeof item.gcal_event_id === "string" ? item.gcal_event_id : null,
          }
        }).filter((item): item is Event => item !== null)
      )
      setNotes(
        (noteRes.items ?? []).map<Note | null>((item) => {
          const id = Number(item.id); const title = typeof item.title === "string" ? item.title : ""
          if (!id || !title) return null
          return { id, title, content: typeof item.content === "string" ? item.content : null, status: item.status === "archived" ? "archived" : "active" }
        }).filter((item): item is Note => item !== null)
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isSpanish ? "Error al cargar" : "Load error"))
    } finally { setLoading(false) }
  }, [isSpanish])

  useEffect(() => { loadAll().catch(() => undefined) }, [loadAll])

  const counters = useMemo(() => ({
    tasks: tasks.length, meetings: meetings.length, events: events.length, notes: notes.length,
  }), [tasks.length, meetings.length, events.length, notes.length])

  const visibleTasks = useMemo(() => tasks, [tasks])
  const visibleMeetings = useMemo(() => meetings, [meetings])
  const visibleEvents = useMemo(() => events, [events])
  const visibleNotes = useMemo(() => notes, [notes])

  async function handleDelete(tab: Tab, id: number) {
    setSaving(true)
    try {
      await requestJson(`/api/planner/${tab}/${id}`, { method: "DELETE" })
      await loadAll()
      if (tab === "tasks") window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
      toast.success(isSpanish ? "Eliminado" : "Deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isSpanish ? "No se pudo eliminar" : "Could not delete"))
    } finally { setSaving(false) }
  }

  async function handleCreate(): Promise<boolean> {
    setSaving(true)
    try {
      if (activeTab === "tasks") {
        if (!taskForm.title.trim()) throw new Error(isSpanish ? "El título es obligatorio" : "Title is required")
        await requestJson("/api/planner/tasks", {
          method: "POST",
          body: JSON.stringify({
            title: taskForm.title.trim(), description: taskForm.description.trim() || null,
            due_date: taskForm.due_date || null, due_time: taskForm.due_time || null,
            priority: taskForm.priority, status: taskForm.status,
          }),
        })
        setTaskForm({ title: "", description: "", due_date: "", due_time: "", priority: "medium", status: "pending" })
        window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
      }
      if (activeTab === "meetings") {
        if (!meetingForm.title.trim() || !meetingForm.meeting_date || !meetingForm.meeting_time) {
          throw new Error(isSpanish ? "Título, fecha y hora son obligatorios" : "Title, date and time are required")
        }
        await requestJson("/api/planner/meetings", {
          method: "POST",
          body: JSON.stringify({
            title: meetingForm.title.trim(), description: meetingForm.description.trim() || null,
            meeting_date: meetingForm.meeting_date, meeting_time: meetingForm.meeting_time,
            duration_minutes: meetingForm.duration_minutes ? Number(meetingForm.duration_minutes) : null,
            location: meetingForm.location.trim() || null,
            participants: parseParticipants(meetingForm.participants),
            status: meetingForm.status,
          }),
        })
        setMeetingForm({ title: "", description: "", meeting_date: "", meeting_time: "", duration_minutes: "", location: "", participants: "", status: "scheduled" })
      }
      if (activeTab === "events") {
        if (!eventForm.title.trim() || !eventForm.event_date) throw new Error(isSpanish ? "Título y fecha son obligatorios" : "Title and date are required")
        await requestJson("/api/planner/events", {
          method: "POST",
          body: JSON.stringify({
            title: eventForm.title.trim(), description: eventForm.description.trim() || null,
            event_date: eventForm.event_date, event_time: eventForm.event_time || null,
            location: eventForm.location.trim() || null, event_type: eventForm.event_type.trim() || "general",
          }),
        })
        setEventForm({ title: "", description: "", event_date: "", event_time: "", location: "", event_type: "general" })
      }
      if (activeTab === "notes") {
        if (!noteForm.title.trim()) throw new Error(isSpanish ? "El título es obligatorio" : "Title is required")
        await requestJson("/api/planner/notes", {
          method: "POST",
          body: JSON.stringify({ title: noteForm.title.trim(), content: noteForm.content.trim() || null, status: noteForm.status }),
        })
        setNoteForm({ title: "", content: "", status: "active" })
      }
      await loadAll()
      toast.success(isSpanish ? "Creado" : "Created")
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isSpanish ? "No se pudo crear" : "Could not create"))
      return false
    } finally { setSaving(false) }
  }

  async function handleQuickAdd() {
    const text = quickAddText.trim()
    if (!text) return
    if (activeTab === "meetings" || activeTab === "events") {
      if (activeTab === "meetings") setMeetingForm((v) => ({ ...v, title: text }))
      if (activeTab === "events") setEventForm((v) => ({ ...v, title: text }))
      setQuickAddText("")
      setShowNewModal(true)
      return
    }
    setSaving(true)
    try {
      if (activeTab === "tasks") {
        await requestJson("/api/planner/tasks", {
          method: "POST",
          body: JSON.stringify({ title: text, priority: "medium", status: "pending" }),
        })
        window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
      } else {
        await requestJson("/api/planner/notes", {
          method: "POST",
          body: JSON.stringify({ title: text, status: "active" }),
        })
      }
      setQuickAddText("")
      await loadAll()
      toast.success(isSpanish ? "Creado" : "Created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
    } finally { setSaving(false) }
  }

  async function markTaskDone(task: Task) {
    if (task.status === "done") return
    setSaving(true)
    try {
      await requestJson(`/api/planner/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: task.title, description: task.description ?? null,
          due_date: task.due_date ?? null, due_time: task.due_time ?? null,
          priority: task.priority, status: "done",
        }),
      })
      await loadAll()
      window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
    } catch {}
    finally { setSaving(false) }
  }

  function formatDue(dateStr: string | null | undefined, timeStr?: string | null): string {
    if (!dateStr) return "—"
    const today = new Date().toISOString().split("T")[0]
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0]
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0]
    if (dateStr === today) return isSpanish ? "Hoy" : "Today"
    if (dateStr === tomorrow) return isSpanish ? "Mañana" : "Tomorrow"
    if (dateStr === yesterday) return isSpanish ? "Ayer" : "Yesterday"
    const parts = dateStr.split("-")
    const mm = parseInt(parts[1] ?? "1", 10)
    const dd = parseInt(parts[2] ?? "1", 10)
    const months = isSpanish
      ? ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]
      : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    let label = `${dd} ${months[mm - 1] ?? ""}`
    if (timeStr) label += `, ${timeStr.slice(0, 5)}`
    return label
  }

  function openEdit(tab: Tab, item: Task | Meeting | Event | Note) {
    const form: Record<string, string> = {}
    if (tab === "tasks") {
      const t = item as Task
      form.title = t.title; form.description = t.description ?? ""
      form.due_date = t.due_date ?? ""; form.due_time = t.due_time ?? ""
      form.priority = t.priority; form.status = t.status
    } else if (tab === "meetings") {
      const m = item as Meeting
      form.title = m.title; form.description = m.description ?? ""
      form.meeting_date = m.meeting_date; form.meeting_time = m.meeting_time
      form.duration_minutes = m.duration_minutes != null ? String(m.duration_minutes) : ""
      form.location = m.location ?? ""; form.participants = m.participants.join(", ")
      form.status = m.status
    } else if (tab === "events") {
      const e = item as Event
      form.title = e.title; form.description = e.description ?? ""
      form.event_date = e.event_date; form.event_time = e.event_time ?? ""
      form.location = e.location ?? ""; form.event_type = e.event_type
    } else {
      const n = item as Note
      form.title = n.title; form.content = n.content ?? ""; form.status = n.status
    }
    setEditForm(form)
    setEditTarget({ tab, item })
  }

  async function saveEdit() {
    if (!editTarget) return
    setEditSaving(true)
    try {
      const { tab, item } = editTarget
      if (tab === "tasks") {
        const task = item as Task
        if (!editForm.title?.trim()) throw new Error(isSpanish ? "El título es obligatorio" : "Title is required")
        await requestJson(`/api/planner/tasks/${task.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: editForm.title.trim(), description: editForm.description?.trim() || null,
            due_date: editForm.due_date?.trim() || null, due_time: editForm.due_time?.trim() || null,
            priority: editForm.priority || task.priority, status: editForm.status || task.status,
          }),
        })
        window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
      } else if (tab === "meetings") {
        const meeting = item as Meeting
        if (!editForm.title?.trim() || !editForm.meeting_date || !editForm.meeting_time) {
          throw new Error(isSpanish ? "Título, fecha y hora son obligatorios" : "Title, date and time are required")
        }
        await requestJson(`/api/planner/meetings/${meeting.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: editForm.title.trim(), description: editForm.description?.trim() || null,
            meeting_date: editForm.meeting_date.trim(), meeting_time: editForm.meeting_time.trim(),
            duration_minutes: editForm.duration_minutes ? Number(editForm.duration_minutes) : null,
            location: editForm.location?.trim() || null,
            participants: parseParticipants(editForm.participants ?? ""),
            status: editForm.status || meeting.status,
          }),
        })
      } else if (tab === "events") {
        const event = item as Event
        if (!editForm.title?.trim() || !editForm.event_date) throw new Error(isSpanish ? "Título y fecha son obligatorios" : "Title and date are required")
        await requestJson(`/api/planner/events/${event.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: editForm.title.trim(), description: editForm.description?.trim() || null,
            event_date: editForm.event_date.trim(), event_time: editForm.event_time?.trim() || null,
            location: editForm.location?.trim() || null,
            event_type: editForm.event_type?.trim() || event.event_type,
          }),
        })
      } else {
        const note = item as Note
        if (!editForm.title?.trim()) throw new Error(isSpanish ? "El título es obligatorio" : "Title is required")
        await requestJson(`/api/planner/notes/${note.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: editForm.title.trim(), content: editForm.content?.trim() || null,
            status: editForm.status || note.status,
          }),
        })
      }
      await loadAll()
      setEditTarget(null)
      toast.success(isSpanish ? "Actualizado" : "Updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isSpanish ? "No se pudo actualizar" : "Could not update"))
    } finally { setEditSaving(false) }
  }

  const tabItems = [
    { key: "tasks" as Tab,    label: isSpanish ? "Tareas"    : "Tasks",    count: counters.tasks    },
    { key: "meetings" as Tab, label: isSpanish ? "Reuniones" : "Meetings", count: counters.meetings },
    { key: "events" as Tab,   label: isSpanish ? "Eventos"   : "Events",   count: counters.events   },
    { key: "notes" as Tab,    label: isSpanish ? "Notas"     : "Notes",    count: counters.notes    },
  ]

  const inputCls = "w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60"
  const selectCls = "w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto p-6 pt-4", className)}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {isSpanish ? "Gestor" : "Manager"}
          </p>
          <h1 className="text-3xl font-black tracking-tight">Planner</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSpanish ? "Gestiona tus tareas, reuniones, eventos y notas" : "Manage your tasks, meetings, events and notes"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {isSpanish ? "Nuevo" : "New Entry"}
        </button>
      </div>

      <div className="mb-4 flex border-b border-border">
        {tabItems.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 pb-3 -mb-px text-sm font-semibold transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
              )}
            >
              {tab.label}
              <span className={cn(
                "rounded-full px-1.5 text-[10px] font-black",
                active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-2.5">
        <svg className="size-4 shrink-0 text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          placeholder={
            activeTab === "tasks"
              ? (isSpanish ? "Añadir tarea rápida... (ej. 'Revisar informe mañana a las 10h')" : "Quick add task... (e.g. 'Review Q3 report tomorrow at 10am')")
              : activeTab === "notes"
              ? (isSpanish ? "Añadir nota rápida..." : "Quick add note...")
              : (isSpanish ? "Escribe un título y pulsa Añadir..." : "Type a title and press Add...")
          }
          value={quickAddText}
          onChange={(e) => setQuickAddText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd() }}
          disabled={saving}
        />
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={saving || !quickAddText.trim()}
          className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSpanish ? "Añadir" : "Add"}
        </button>
      </div>

      <div className="space-y-1.5">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {isSpanish ? "Cargando..." : "Loading..."}
          </div>
        ) : (
          <>
            {activeTab === "tasks" && (
              <>
                {visibleTasks.length === 0 ? (
                  <div className="rounded-xl border border-border/70 bg-card px-4 py-4 text-sm text-muted-foreground">
                    {isSpanish ? "Sin tareas" : "No tasks"}
                  </div>
                ) : (
                  <>
                    <div className="mb-1 grid grid-cols-[20px_1fr_100px_72px] items-center gap-4 px-4 py-1">
                      <div />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{isSpanish ? "Tarea" : "Task"}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{isSpanish ? "Vence" : "Due"}</span>
                      <span className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{isSpanish ? "Acciones" : "Actions"}</span>
                    </div>
                    {visibleTasks.map((task) => {
                      const badge = PRIORITY_BADGE[task.priority]
                      const isDone = task.status === "done"
                      return (
                        <div key={task.id} className="grid grid-cols-[20px_1fr_100px_72px] items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-3 hover:bg-accent/30 transition-colors">
                          <button
                            type="button"
                            disabled={saving || isDone}
                            onClick={() => markTaskDone(task)}
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                              isDone ? "border-emerald-500 bg-emerald-500" : "border-border/60 hover:border-primary"
                            )}
                          >
                            {isDone && (
                              <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                          <div className="flex min-w-0 items-center gap-2">
                            <p className={cn("truncate text-sm font-medium", isDone && "line-through text-muted-foreground")}>{task.title}</p>
                            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black tracking-wide", badge.bg, badge.text)}>
                              {isSpanish ? badge.labelEs : badge.label}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDue(task.due_date, task.due_time)}</span>
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => openEdit("tasks", task)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                            <button type="button" disabled={saving} onClick={() => handleDelete("tasks", task.id)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </>
            )}

            {activeTab === "meetings" && (
              <>
                {visibleMeetings.length === 0 ? (
                  <div className="rounded-xl border border-border/70 bg-card px-4 py-4 text-sm text-muted-foreground">
                    {isSpanish ? "Sin reuniones" : "No meetings"}
                  </div>
                ) : visibleMeetings.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-3 hover:bg-accent/30 transition-colors">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                      <svg className="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDue(item.meeting_date)} · {item.meeting_time.slice(0, 5)}
                        {item.location ? ` · ${item.location}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {item.status === "scheduled" ? (isSpanish ? "Programada" : "Scheduled") : item.status === "completed" ? (isSpanish ? "Completada" : "Completed") : (isSpanish ? "Cancelada" : "Cancelled")}
                    </span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit("meetings", item)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button type="button" disabled={saving} onClick={() => handleDelete("meetings", item.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === "events" && (
              <>
                {visibleEvents.length === 0 ? (
                  <div className="rounded-xl border border-border/70 bg-card px-4 py-4 text-sm text-muted-foreground">
                    {isSpanish ? "Sin eventos" : "No events"}
                  </div>
                ) : visibleEvents.map((item) => {
                  const isGcal = item.event_type === "google_calendar"
                  return (
                    <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-3 hover:bg-accent/30 transition-colors">
                      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", isGcal ? "bg-[#4285F4]/15" : "bg-amber-500/15")}>
                        <svg className={cn("size-4", isGcal ? "text-[#4285F4]" : "text-amber-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDue(item.event_date, item.event_time)}
                          {item.location ? ` · ${item.location}` : ""}
                        </p>
                      </div>
                      {isGcal ? (
                        <span className="shrink-0 rounded-md bg-[#4285F4]/10 px-2 py-0.5 text-[10px] font-bold text-[#4285F4]">Google</span>
                      ) : (
                        <span className="shrink-0 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">{isSpanish ? "Evento" : "Event"}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit("events", item)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                        </button>
                        <button type="button" disabled={saving} onClick={() => handleDelete("events", item.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {activeTab === "notes" && (
              <>
                {visibleNotes.length === 0 ? (
                  <div className="rounded-xl border border-border/70 bg-card px-4 py-4 text-sm text-muted-foreground">
                    {isSpanish ? "Sin notas" : "No notes"}
                  </div>
                ) : visibleNotes.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-3 hover:bg-accent/30 transition-colors">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                      <svg className="size-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      {item.content && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.content}</p>}
                    </div>
                    <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold",
                      item.status === "archived" ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-500")}>
                      {item.status === "archived" ? (isSpanish ? "Archivada" : "Archived") : (isSpanish ? "Activa" : "Active")}
                    </span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit("notes", item)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button type="button" disabled={saving} onClick={() => handleDelete("notes", item.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => !saving && setShowNewModal(false)}>
          <div className="w-full max-w-lg rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">{isSpanish ? "Nuevo elemento" : "New Entry"}</h3>
              <button type="button" onClick={() => setShowNewModal(false)}
                className="rounded-full p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-5 flex gap-1 rounded-xl bg-muted/50 p-1">
              {tabItems.map((tab) => (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
                    activeTab === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {activeTab === "tasks" && (
                <>
                  <input className={inputCls} placeholder={isSpanish ? "Título" : "Title"} value={taskForm.title} onChange={(e) => setTaskForm((v) => ({ ...v, title: e.target.value }))} />
                  <input className={inputCls} placeholder={isSpanish ? "Descripción" : "Description"} value={taskForm.description} onChange={(e) => setTaskForm((v) => ({ ...v, description: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className={inputCls} value={taskForm.due_date} onChange={(e) => setTaskForm((v) => ({ ...v, due_date: e.target.value }))} />
                    <input type="time" className={inputCls} value={taskForm.due_time} onChange={(e) => setTaskForm((v) => ({ ...v, due_time: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select className={selectCls} value={taskForm.priority} onChange={(e) => setTaskForm((v) => ({ ...v, priority: e.target.value as Task["priority"] }))}>
                      <option value="low">{isSpanish ? "Prioridad baja" : "Low priority"}</option>
                      <option value="medium">{isSpanish ? "Prioridad media" : "Medium priority"}</option>
                      <option value="high">{isSpanish ? "Prioridad alta" : "High priority"}</option>
                    </select>
                    <select className={selectCls} value={taskForm.status} onChange={(e) => setTaskForm((v) => ({ ...v, status: e.target.value as Task["status"] }))}>
                      <option value="pending">{isSpanish ? "Pendiente" : "Pending"}</option>
                      <option value="in_progress">{isSpanish ? "En progreso" : "In progress"}</option>
                      <option value="done">{isSpanish ? "Completada" : "Done"}</option>
                    </select>
                  </div>
                </>
              )}
              {activeTab === "meetings" && (
                <>
                  <input className={inputCls} placeholder={isSpanish ? "Título" : "Title"} value={meetingForm.title} onChange={(e) => setMeetingForm((v) => ({ ...v, title: e.target.value }))} />
                  <input className={inputCls} placeholder={isSpanish ? "Descripción" : "Description"} value={meetingForm.description} onChange={(e) => setMeetingForm((v) => ({ ...v, description: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className={inputCls} value={meetingForm.meeting_date} onChange={(e) => setMeetingForm((v) => ({ ...v, meeting_date: e.target.value }))} />
                    <input type="time" className={inputCls} value={meetingForm.meeting_time} onChange={(e) => setMeetingForm((v) => ({ ...v, meeting_time: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} placeholder={isSpanish ? "Duración (min)" : "Duration (min)"} type="number" min={0} value={meetingForm.duration_minutes} onChange={(e) => setMeetingForm((v) => ({ ...v, duration_minutes: e.target.value }))} />
                    <input className={inputCls} placeholder={isSpanish ? "Ubicación" : "Location"} value={meetingForm.location} onChange={(e) => setMeetingForm((v) => ({ ...v, location: e.target.value }))} />
                  </div>
                  <input className={inputCls} placeholder={isSpanish ? "Participantes (separados por coma)" : "Participants (comma-separated)"} value={meetingForm.participants} onChange={(e) => setMeetingForm((v) => ({ ...v, participants: e.target.value }))} />
                </>
              )}
              {activeTab === "events" && (
                <>
                  <input className={inputCls} placeholder={isSpanish ? "Título" : "Title"} value={eventForm.title} onChange={(e) => setEventForm((v) => ({ ...v, title: e.target.value }))} />
                  <input className={inputCls} placeholder={isSpanish ? "Descripción" : "Description"} value={eventForm.description} onChange={(e) => setEventForm((v) => ({ ...v, description: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className={inputCls} value={eventForm.event_date} onChange={(e) => setEventForm((v) => ({ ...v, event_date: e.target.value }))} />
                    <input type="time" className={inputCls} value={eventForm.event_time} onChange={(e) => setEventForm((v) => ({ ...v, event_time: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} placeholder={isSpanish ? "Ubicación" : "Location"} value={eventForm.location} onChange={(e) => setEventForm((v) => ({ ...v, location: e.target.value }))} />
                    <input className={inputCls} placeholder={isSpanish ? "Tipo" : "Type"} value={eventForm.event_type} onChange={(e) => setEventForm((v) => ({ ...v, event_type: e.target.value }))} />
                  </div>
                </>
              )}
              {activeTab === "notes" && (
                <>
                  <input className={inputCls} placeholder={isSpanish ? "Título" : "Title"} value={noteForm.title} onChange={(e) => setNoteForm((v) => ({ ...v, title: e.target.value }))} />
                  <textarea className={cn(inputCls, "min-h-28 resize-none")} placeholder={isSpanish ? "Contenido" : "Content"} value={noteForm.content} onChange={(e) => setNoteForm((v) => ({ ...v, content: e.target.value }))} />
                </>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowNewModal(false)} disabled={saving}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-accent disabled:opacity-50 transition-colors">
                {isSpanish ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  const ok = await handleCreate()
                  if (ok) setShowNewModal(false)
                }}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saving ? "..." : isSpanish ? "Crear" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => !editSaving && setEditTarget(null)}>
          <div className="w-full max-w-lg rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-5 text-lg font-bold">
              {isSpanish ? "Editar" : "Edit"}{" "}
              <span className="font-normal text-muted-foreground">
                — {editTarget.tab === "tasks" ? (isSpanish ? "Tarea" : "Task") : editTarget.tab === "meetings" ? (isSpanish ? "Reunión" : "Meeting") : editTarget.tab === "events" ? (isSpanish ? "Evento" : "Event") : (isSpanish ? "Nota" : "Note")}
              </span>
            </h3>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Título" : "Title"}</label>
                <input className={inputCls} value={editForm.title ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} disabled={editSaving} />
              </div>

              {editTarget.tab !== "notes" && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Descripción" : "Description"}</label>
                  <input className={inputCls} value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} disabled={editSaving} />
                </div>
              )}

              {editTarget.tab === "tasks" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Fecha" : "Date"}</label>
                      <input type="date" className={inputCls} value={editForm.due_date ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))} disabled={editSaving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Hora" : "Time"}</label>
                      <input type="time" className={inputCls} value={editForm.due_time ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, due_time: e.target.value }))} disabled={editSaving} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Prioridad" : "Priority"}</label>
                      <select className={selectCls} value={editForm.priority ?? "medium"} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))} disabled={editSaving}>
                        <option value="low">{isSpanish ? "Baja" : "Low"}</option>
                        <option value="medium">{isSpanish ? "Media" : "Medium"}</option>
                        <option value="high">{isSpanish ? "Alta" : "High"}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Estado" : "Status"}</label>
                      <select className={selectCls} value={editForm.status ?? "pending"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} disabled={editSaving}>
                        <option value="pending">{isSpanish ? "Pendiente" : "Pending"}</option>
                        <option value="in_progress">{isSpanish ? "En progreso" : "In progress"}</option>
                        <option value="done">{isSpanish ? "Completada" : "Done"}</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {editTarget.tab === "meetings" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Fecha" : "Date"}</label>
                      <input type="date" className={inputCls} value={editForm.meeting_date ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, meeting_date: e.target.value }))} disabled={editSaving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Hora" : "Time"}</label>
                      <input type="time" className={inputCls} value={editForm.meeting_time ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, meeting_time: e.target.value }))} disabled={editSaving} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Duración (min)" : "Duration (min)"}</label>
                      <input type="number" min={0} className={inputCls} value={editForm.duration_minutes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, duration_minutes: e.target.value }))} disabled={editSaving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Ubicación" : "Location"}</label>
                      <input className={inputCls} value={editForm.location ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} disabled={editSaving} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Participantes" : "Participants"}</label>
                    <input className={inputCls} value={editForm.participants ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, participants: e.target.value }))} disabled={editSaving} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Estado" : "Status"}</label>
                    <select className={selectCls} value={editForm.status ?? "scheduled"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} disabled={editSaving}>
                      <option value="scheduled">{isSpanish ? "Programada" : "Scheduled"}</option>
                      <option value="completed">{isSpanish ? "Completada" : "Completed"}</option>
                      <option value="cancelled">{isSpanish ? "Cancelada" : "Cancelled"}</option>
                    </select>
                  </div>
                </>
              )}

              {editTarget.tab === "events" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Fecha" : "Date"}</label>
                      <input type="date" className={inputCls} value={editForm.event_date ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, event_date: e.target.value }))} disabled={editSaving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Hora" : "Time"}</label>
                      <input type="time" className={inputCls} value={editForm.event_time ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, event_time: e.target.value }))} disabled={editSaving} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Ubicación" : "Location"}</label>
                    <input className={inputCls} value={editForm.location ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} disabled={editSaving} />
                  </div>
                </>
              )}

              {editTarget.tab === "notes" && (
                <>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Contenido" : "Content"}</label>
                    <textarea className={cn(inputCls, "min-h-24 resize-none")} value={editForm.content ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))} disabled={editSaving} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{isSpanish ? "Estado" : "Status"}</label>
                    <select className={selectCls} value={editForm.status ?? "active"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} disabled={editSaving}>
                      <option value="active">{isSpanish ? "Activa" : "Active"}</option>
                      <option value="archived">{isSpanish ? "Archivada" : "Archived"}</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setEditTarget(null)} disabled={editSaving}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-accent disabled:opacity-50 transition-colors">
                {isSpanish ? "Cancelar" : "Cancel"}
              </button>
              <button type="button" onClick={saveEdit} disabled={editSaving}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {editSaving ? "..." : isSpanish ? "Guardar" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
