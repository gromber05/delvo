"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useCallback, useEffect, useMemo, useState } from "react"
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
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
}

type Props = {
  className?: string
}

export function PlannerManager({ className }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("tasks")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [tasks, setTasks] = useState<Task[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    due_date: "",
    due_time: "",
    priority: "medium" as Task["priority"],
    status: "pending" as Task["status"],
  })
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    meeting_date: "",
    meeting_time: "",
    duration_minutes: "",
    location: "",
    participants: "",
    status: "scheduled" as Meeting["status"],
  })
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
    event_type: "general",
  })
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    status: "active" as Note["status"],
  })

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
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
        (taskRes.items ?? [])
          .map<Task | null>((item) => {
            const id = Number(item.id)
            const title = typeof item.title === "string" ? item.title : ""
            if (!id || !title) return null
            return {
              id,
              title,
              description: typeof item.description === "string" ? item.description : null,
              due_date: normalizeDate(item.due_date) || null,
              due_time: normalizeTime(item.due_time) || null,
              priority: item.priority === "low" || item.priority === "high" ? item.priority : "medium",
              status: item.status === "in_progress" || item.status === "done" ? item.status : "pending",
            }
          })
          .filter((item): item is Task => item !== null)
      )

      setMeetings(
        (meetingRes.items ?? [])
          .map<Meeting | null>((item) => {
            const id = Number(item.id)
            const title = typeof item.title === "string" ? item.title : ""
            const meetingDate = normalizeDate(item.meeting_date)
            const meetingTime = normalizeTime(item.meeting_time)
            if (!id || !title || !meetingDate || !meetingTime) return null
            return {
              id,
              title,
              description: typeof item.description === "string" ? item.description : null,
              meeting_date: meetingDate,
              meeting_time: meetingTime,
              duration_minutes: Number(item.duration_minutes) || null,
              location: typeof item.location === "string" ? item.location : null,
              participants: Array.isArray(item.participants)
                ? item.participants.filter((value): value is string => typeof value === "string")
                : [],
              status:
                item.status === "completed" || item.status === "cancelled" ? item.status : "scheduled",
            }
          })
          .filter((item): item is Meeting => item !== null)
      )

      setEvents(
        (eventRes.items ?? [])
          .map<Event | null>((item) => {
            const id = Number(item.id)
            const title = typeof item.title === "string" ? item.title : ""
            const eventDate = normalizeDate(item.event_date)
            if (!id || !title || !eventDate) return null
            return {
              id,
              title,
              description: typeof item.description === "string" ? item.description : null,
              event_date: eventDate,
              event_time: normalizeTime(item.event_time) || null,
              location: typeof item.location === "string" ? item.location : null,
              event_type: typeof item.event_type === "string" ? item.event_type : "general",
            }
          })
          .filter((item): item is Event => item !== null)
      )

      setNotes(
        (noteRes.items ?? [])
          .map<Note | null>((item) => {
            const id = Number(item.id)
            const title = typeof item.title === "string" ? item.title : ""
            if (!id || !title) return null
            return {
              id,
              title,
              content: typeof item.content === "string" ? item.content : null,
              status: item.status === "archived" ? "archived" : "active",
            }
          })
          .filter((item): item is Note => item !== null)
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el gestor")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll().catch(() => undefined)
  }, [loadAll])

  const counters = useMemo(
    () => ({
      tasks: tasks.length,
      meetings: meetings.length,
      events: events.length,
      notes: notes.length,
    }),
    [tasks.length, meetings.length, events.length, notes.length]
  )

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const visibleTasks = useMemo(
    () =>
      normalizedSearch
        ? tasks.filter(
            (item) =>
              item.title.toLowerCase().includes(normalizedSearch) ||
              (item.description ?? "").toLowerCase().includes(normalizedSearch)
          )
        : tasks,
    [normalizedSearch, tasks]
  )
  const visibleMeetings = useMemo(
    () =>
      normalizedSearch
        ? meetings.filter(
            (item) =>
              item.title.toLowerCase().includes(normalizedSearch) ||
              (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
              (item.location ?? "").toLowerCase().includes(normalizedSearch)
          )
        : meetings,
    [meetings, normalizedSearch]
  )
  const visibleEvents = useMemo(
    () =>
      normalizedSearch
        ? events.filter(
            (item) =>
              item.title.toLowerCase().includes(normalizedSearch) ||
              (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
              (item.location ?? "").toLowerCase().includes(normalizedSearch)
          )
        : events,
    [events, normalizedSearch]
  )
  const visibleNotes = useMemo(
    () =>
      normalizedSearch
        ? notes.filter(
            (item) =>
              item.title.toLowerCase().includes(normalizedSearch) ||
              (item.content ?? "").toLowerCase().includes(normalizedSearch)
          )
        : notes,
    [normalizedSearch, notes]
  )

  async function handleDelete(tab: Tab, id: number) {
    setSaving(true)
    try {
      await requestJson(`/api/planner/${tab}/${id}`, { method: "DELETE" })
      await loadAll()
      if (tab === "tasks") window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
      toast.success("Elemento eliminado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar")
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate() {
    setSaving(true)
    try {
      if (activeTab === "tasks") {
        if (!taskForm.title.trim()) throw new Error("El titulo de la tarea es obligatorio")
        await requestJson("/api/planner/tasks", {
          method: "POST",
          body: JSON.stringify({
            title: taskForm.title.trim(),
            description: taskForm.description.trim() || null,
            due_date: taskForm.due_date || null,
            due_time: taskForm.due_time || null,
            priority: taskForm.priority,
            status: taskForm.status,
          }),
        })
        setTaskForm({ title: "", description: "", due_date: "", due_time: "", priority: "medium", status: "pending" })
        window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
      }
      if (activeTab === "meetings") {
        if (!meetingForm.title.trim() || !meetingForm.meeting_date || !meetingForm.meeting_time) {
          throw new Error("Titulo, fecha y hora son obligatorios en reuniones")
        }
        await requestJson("/api/planner/meetings", {
          method: "POST",
          body: JSON.stringify({
            title: meetingForm.title.trim(),
            description: meetingForm.description.trim() || null,
            meeting_date: meetingForm.meeting_date,
            meeting_time: meetingForm.meeting_time,
            duration_minutes: meetingForm.duration_minutes ? Number(meetingForm.duration_minutes) : null,
            location: meetingForm.location.trim() || null,
            participants: parseParticipants(meetingForm.participants),
            status: meetingForm.status,
          }),
        })
        setMeetingForm({
          title: "",
          description: "",
          meeting_date: "",
          meeting_time: "",
          duration_minutes: "",
          location: "",
          participants: "",
          status: "scheduled",
        })
      }
      if (activeTab === "events") {
        if (!eventForm.title.trim() || !eventForm.event_date) throw new Error("Titulo y fecha son obligatorios en eventos")
        await requestJson("/api/planner/events", {
          method: "POST",
          body: JSON.stringify({
            title: eventForm.title.trim(),
            description: eventForm.description.trim() || null,
            event_date: eventForm.event_date,
            event_time: eventForm.event_time || null,
            location: eventForm.location.trim() || null,
            event_type: eventForm.event_type.trim() || "general",
          }),
        })
        setEventForm({ title: "", description: "", event_date: "", event_time: "", location: "", event_type: "general" })
      }
      if (activeTab === "notes") {
        if (!noteForm.title.trim()) throw new Error("El titulo de la nota es obligatorio")
        await requestJson("/api/planner/notes", {
          method: "POST",
          body: JSON.stringify({
            title: noteForm.title.trim(),
            content: noteForm.content.trim() || null,
            status: noteForm.status,
          }),
        })
        setNoteForm({ title: "", content: "", status: "active" })
      }
      await loadAll()
      toast.success("Elemento creado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear")
    } finally {
      setSaving(false)
    }
  }

  async function handleQuickEdit(tab: Tab, item: Task | Meeting | Event | Note) {
    try {
      if (tab === "tasks") {
        const task = item as Task
        const title = window.prompt("Titulo", task.title)
        if (title === null || !title.trim()) return
        const description = window.prompt("Descripcion", task.description ?? "")
        if (description === null) return
        const dueDate = window.prompt("Fecha (YYYY-MM-DD)", task.due_date ?? "")
        if (dueDate === null) return
        const dueTime = window.prompt("Hora (HH:MM)", task.due_time ?? "")
        if (dueTime === null) return
        const priority = window.prompt("Prioridad (low|medium|high)", task.priority)
        if (priority === null) return
        const status = window.prompt("Estado (pending|in_progress|done)", task.status)
        if (status === null) return
        await requestJson(`/api/planner/tasks/${task.id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...task,
            title: title.trim(),
            description: description.trim() || null,
            due_date: dueDate.trim() || null,
            due_time: dueTime.trim() || null,
            priority: priority.trim() || task.priority,
            status: status.trim() || task.status,
          }),
        })
        window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
      }
      if (tab === "meetings") {
        const meeting = item as Meeting
        const title = window.prompt("Titulo", meeting.title)
        if (title === null || !title.trim()) return
        const description = window.prompt("Descripcion", meeting.description ?? "")
        if (description === null) return
        const meetingDate = window.prompt("Fecha (YYYY-MM-DD)", meeting.meeting_date)
        if (meetingDate === null || !meetingDate.trim()) return
        const meetingTime = window.prompt("Hora (HH:MM)", meeting.meeting_time)
        if (meetingTime === null || !meetingTime.trim()) return
        const location = window.prompt("Ubicacion", meeting.location ?? "")
        if (location === null) return
        const participants = window.prompt(
          "Participantes separados por coma",
          meeting.participants.join(", ")
        )
        if (participants === null) return
        const status = window.prompt("Estado (scheduled|completed|cancelled)", meeting.status)
        if (status === null) return
        await requestJson(`/api/planner/meetings/${meeting.id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...meeting,
            title: title.trim(),
            description: description.trim() || null,
            meeting_date: meetingDate.trim(),
            meeting_time: meetingTime.trim(),
            location: location.trim() || null,
            participants: parseParticipants(participants),
            status: status.trim() || meeting.status,
          }),
        })
      }
      if (tab === "events") {
        const event = item as Event
        const title = window.prompt("Titulo", event.title)
        if (title === null || !title.trim()) return
        const description = window.prompt("Descripcion", event.description ?? "")
        if (description === null) return
        const eventDate = window.prompt("Fecha (YYYY-MM-DD)", event.event_date)
        if (eventDate === null || !eventDate.trim()) return
        const eventTime = window.prompt("Hora (HH:MM)", event.event_time ?? "")
        if (eventTime === null) return
        const location = window.prompt("Ubicacion", event.location ?? "")
        if (location === null) return
        const eventType = window.prompt("Tipo", event.event_type)
        if (eventType === null) return
        await requestJson(`/api/planner/events/${event.id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...event,
            title: title.trim(),
            description: description.trim() || null,
            event_date: eventDate.trim(),
            event_time: eventTime.trim() || null,
            location: location.trim() || null,
            event_type: eventType.trim() || event.event_type,
          }),
        })
      }
      if (tab === "notes") {
        const note = item as Note
        const title = window.prompt("Titulo", note.title)
        if (title === null || !title.trim()) return
        const content = window.prompt("Contenido", note.content ?? "")
        if (content === null) return
        const status = window.prompt("Estado (active|archived)", note.status)
        if (status === null) return
        await requestJson(`/api/planner/notes/${note.id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...note,
            title: title.trim(),
            content: content.trim() || null,
            status: status.trim() || note.status,
          }),
        })
      }
      await loadAll()
      toast.success("Elemento actualizado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar")
    }
  }

  const tabItems: Array<{ key: Tab; label: string; count: number }> = [
    { key: "tasks", label: "Tareas", count: counters.tasks },
    { key: "meetings", label: "Reuniones", count: counters.meetings },
    { key: "events", label: "Eventos", count: counters.events },
    { key: "notes", label: "Notas", count: counters.notes },
  ]

  const TAB_ICONS: Record<Tab, string> = { tasks: "✓", meetings: "◉", events: "◆", notes: "≡" }
  const PRIORITY_DOT: Record<string, string> = { high: "bg-destructive", medium: "bg-amber-500", low: "bg-emerald-500" }
  const PRIORITY_LABEL: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" }

  return (
    <section className={cn("flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur", className)}>
      <header className="border-b border-border/70 px-4 py-4">
        {/* Type tab bar — mobile style */}
        <div className="mb-3 flex gap-2 rounded-2xl bg-muted/60 p-1.5">
          {tabItems.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 text-xs transition-colors",
                  active ? "bg-primary/15 font-bold text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-base">{TAB_ICONS[tab.key]}</span>
                <span>{tab.label}</span>
                <span className={cn("text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar..."
          className="bg-background/90"
        />
      </header>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 xl:grid-cols-[1.1fr_1.3fr]">
        <article className="space-y-3 overflow-auto rounded-2xl border border-border/70 bg-background/90 p-4 shadow-sm">
          {activeTab === "tasks" ? (
            <>
              <Input placeholder="Titulo" value={taskForm.title} onChange={(e) => setTaskForm((v) => ({ ...v, title: e.target.value }))} />
              <Input placeholder="Descripcion" value={taskForm.description} onChange={(e) => setTaskForm((v) => ({ ...v, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((v) => ({ ...v, due_date: e.target.value }))} />
                <Input type="time" value={taskForm.due_time} onChange={(e) => setTaskForm((v) => ({ ...v, due_time: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm((v) => ({ ...v, priority: e.target.value as Task["priority"] }))}
                >
                  <option value="low">Prioridad baja</option>
                  <option value="medium">Prioridad media</option>
                  <option value="high">Prioridad alta</option>
                </select>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={taskForm.status}
                  onChange={(e) => setTaskForm((v) => ({ ...v, status: e.target.value as Task["status"] }))}
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="done">Completada</option>
                </select>
              </div>
            </>
          ) : null}
          {activeTab === "meetings" ? (
            <>
              <Input placeholder="Titulo" value={meetingForm.title} onChange={(e) => setMeetingForm((v) => ({ ...v, title: e.target.value }))} />
              <Input placeholder="Descripcion" value={meetingForm.description} onChange={(e) => setMeetingForm((v) => ({ ...v, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={meetingForm.meeting_date} onChange={(e) => setMeetingForm((v) => ({ ...v, meeting_date: e.target.value }))} />
                <Input type="time" value={meetingForm.meeting_time} onChange={(e) => setMeetingForm((v) => ({ ...v, meeting_time: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Duracion (min)" type="number" min={0} value={meetingForm.duration_minutes} onChange={(e) => setMeetingForm((v) => ({ ...v, duration_minutes: e.target.value }))} />
                <Input placeholder="Ubicacion" value={meetingForm.location} onChange={(e) => setMeetingForm((v) => ({ ...v, location: e.target.value }))} />
              </div>
              <Input placeholder="Participantes: ana@email.com, pepe@email.com" value={meetingForm.participants} onChange={(e) => setMeetingForm((v) => ({ ...v, participants: e.target.value }))} />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={meetingForm.status}
                onChange={(e) => setMeetingForm((v) => ({ ...v, status: e.target.value as Meeting["status"] }))}
              >
                <option value="scheduled">Programada</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </>
          ) : null}
          {activeTab === "events" ? (
            <>
              <Input placeholder="Titulo" value={eventForm.title} onChange={(e) => setEventForm((v) => ({ ...v, title: e.target.value }))} />
              <Input placeholder="Descripcion" value={eventForm.description} onChange={(e) => setEventForm((v) => ({ ...v, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={eventForm.event_date} onChange={(e) => setEventForm((v) => ({ ...v, event_date: e.target.value }))} />
                <Input type="time" value={eventForm.event_time} onChange={(e) => setEventForm((v) => ({ ...v, event_time: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Ubicacion" value={eventForm.location} onChange={(e) => setEventForm((v) => ({ ...v, location: e.target.value }))} />
                <Input placeholder="Tipo (general, social...)" value={eventForm.event_type} onChange={(e) => setEventForm((v) => ({ ...v, event_type: e.target.value }))} />
              </div>
            </>
          ) : null}
          {activeTab === "notes" ? (
            <>
              <Input placeholder="Titulo" value={noteForm.title} onChange={(e) => setNoteForm((v) => ({ ...v, title: e.target.value }))} />
              <textarea className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" placeholder="Contenido" value={noteForm.content} onChange={(e) => setNoteForm((v) => ({ ...v, content: e.target.value }))} />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={noteForm.status}
                onChange={(e) => setNoteForm((v) => ({ ...v, status: e.target.value as Note["status"] }))}
              >
                <option value="active">Activa</option>
                <option value="archived">Archivada</option>
              </select>
            </>
          ) : null}
          <Button onClick={() => handleCreate()} disabled={saving || loading} className="w-full">
            {saving ? "Guardando..." : "Crear"}
          </Button>
        </article>

        <article className="space-y-2 overflow-auto rounded-2xl border border-border/70 bg-background/90 p-4 shadow-sm">
          {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : null}
          {!loading && activeTab === "tasks" && visibleTasks.length === 0 ? <p className="text-sm text-muted-foreground">Sin resultados.</p> : null}
          {!loading && activeTab === "meetings" && visibleMeetings.length === 0 ? <p className="text-sm text-muted-foreground">Sin resultados.</p> : null}
          {!loading && activeTab === "events" && visibleEvents.length === 0 ? <p className="text-sm text-muted-foreground">Sin resultados.</p> : null}
          {!loading && activeTab === "notes" && visibleNotes.length === 0 ? <p className="text-sm text-muted-foreground">Sin resultados.</p> : null}

          {activeTab === "tasks"
            ? visibleTasks.map((item) => (
                <div key={item.id} className="flex overflow-hidden rounded-xl border border-border/70 bg-card">
                  <div className={cn("w-1 shrink-0", PRIORITY_DOT[item.priority])} />
                  <div className="flex-1 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {PRIORITY_LABEL[item.priority]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.due_date || "Sin fecha"} {item.due_time ? `· ${item.due_time}` : ""} · {item.status}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleQuickEdit("tasks", item)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete("tasks", item.id)} disabled={saving}>Borrar</Button>
                    </div>
                  </div>
                </div>
              ))
            : null}
          {activeTab === "meetings"
            ? visibleMeetings.map((item) => (
                <div key={item.id} className="flex overflow-hidden rounded-xl border border-border/70 bg-card">
                  <div className="w-1 shrink-0 bg-primary" />
                  <div className="flex-1 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Reunión</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.meeting_date} · {item.meeting_time} {item.location ? `· ${item.location}` : ""}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleQuickEdit("meetings", item)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete("meetings", item.id)} disabled={saving}>Borrar</Button>
                    </div>
                  </div>
                </div>
              ))
            : null}
          {activeTab === "events"
            ? visibleEvents.map((item) => (
                <div key={item.id} className="flex overflow-hidden rounded-xl border border-border/70 bg-card">
                  <div className="w-1 shrink-0 bg-amber-400" />
                  <div className="flex-1 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">Evento</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.event_date} {item.event_time ? `· ${item.event_time}` : ""} {item.location ? `· ${item.location}` : ""}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleQuickEdit("events", item)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete("events", item.id)} disabled={saving}>Borrar</Button>
                    </div>
                  </div>
                </div>
              ))
            : null}
          {activeTab === "notes"
            ? visibleNotes.map((item) => (
                <div key={item.id} className="flex overflow-hidden rounded-xl border border-border/70 bg-card">
                  <div className="w-1 shrink-0 bg-muted-foreground/40" />
                  <div className="flex-1 px-3 py-2.5">
                    <p className="text-sm font-semibold">{item.title}</p>
                    {item.content && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.content}</p>}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleQuickEdit("notes", item)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete("notes", item.id)} disabled={saving}>Borrar</Button>
                    </div>
                  </div>
                </div>
              ))
            : null}
        </article>
      </div>
    </section>
  )
}
