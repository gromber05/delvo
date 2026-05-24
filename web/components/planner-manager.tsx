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

  // Edit modal state
  const [editTarget, setEditTarget] = useState<{ tab: Tab; item: Task | Meeting | Event | Note } | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [editSaving, setEditSaving] = useState(false)

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
              gcal_event_id: typeof item.gcal_event_id === "string" ? item.gcal_event_id : null,
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

  function openEdit(tab: Tab, item: Task | Meeting | Event | Note) {
    const form: Record<string, string> = {}
    if (tab === "tasks") {
      const t = item as Task
      form.title = t.title
      form.description = t.description ?? ""
      form.due_date = t.due_date ?? ""
      form.due_time = t.due_time ?? ""
      form.priority = t.priority
      form.status = t.status
    } else if (tab === "meetings") {
      const m = item as Meeting
      form.title = m.title
      form.description = m.description ?? ""
      form.meeting_date = m.meeting_date
      form.meeting_time = m.meeting_time
      form.duration_minutes = m.duration_minutes != null ? String(m.duration_minutes) : ""
      form.location = m.location ?? ""
      form.participants = m.participants.join(", ")
      form.status = m.status
    } else if (tab === "events") {
      const e = item as Event
      form.title = e.title
      form.description = e.description ?? ""
      form.event_date = e.event_date
      form.event_time = e.event_time ?? ""
      form.location = e.location ?? ""
      form.event_type = e.event_type
    } else {
      const n = item as Note
      form.title = n.title
      form.content = n.content ?? ""
      form.status = n.status
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
        if (!editForm.title?.trim()) throw new Error("El título es obligatorio")
        await requestJson(`/api/planner/tasks/${task.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: editForm.title.trim(),
            description: editForm.description?.trim() || null,
            due_date: editForm.due_date?.trim() || null,
            due_time: editForm.due_time?.trim() || null,
            priority: editForm.priority || task.priority,
            status: editForm.status || task.status,
          }),
        })
        window.dispatchEvent(new CustomEvent("planner:tasks-updated"))
      } else if (tab === "meetings") {
        const meeting = item as Meeting
        if (!editForm.title?.trim() || !editForm.meeting_date || !editForm.meeting_time) {
          throw new Error("Título, fecha y hora son obligatorios")
        }
        await requestJson(`/api/planner/meetings/${meeting.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: editForm.title.trim(),
            description: editForm.description?.trim() || null,
            meeting_date: editForm.meeting_date.trim(),
            meeting_time: editForm.meeting_time.trim(),
            duration_minutes: editForm.duration_minutes ? Number(editForm.duration_minutes) : null,
            location: editForm.location?.trim() || null,
            participants: parseParticipants(editForm.participants ?? ""),
            status: editForm.status || meeting.status,
          }),
        })
      } else if (tab === "events") {
        const event = item as Event
        if (!editForm.title?.trim() || !editForm.event_date) throw new Error("Título y fecha son obligatorios")
        await requestJson(`/api/planner/events/${event.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: editForm.title.trim(),
            description: editForm.description?.trim() || null,
            event_date: editForm.event_date.trim(),
            event_time: editForm.event_time?.trim() || null,
            location: editForm.location?.trim() || null,
            event_type: editForm.event_type?.trim() || event.event_type,
          }),
        })
      } else {
        const note = item as Note
        if (!editForm.title?.trim()) throw new Error("El título es obligatorio")
        await requestJson(`/api/planner/notes/${note.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: editForm.title.trim(),
            content: editForm.content?.trim() || null,
            status: editForm.status || note.status,
          }),
        })
      }
      await loadAll()
      setEditTarget(null)
      toast.success("Elemento actualizado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar")
    } finally {
      setEditSaving(false)
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
        {}
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
                      <Button size="sm" variant="outline" onClick={() => openEdit("tasks", item)}>Editar</Button>
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
                      <Button size="sm" variant="outline" onClick={() => openEdit("meetings", item)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete("meetings", item.id)} disabled={saving}>Borrar</Button>
                    </div>
                  </div>
                </div>
              ))
            : null}
          {activeTab === "events"
            ? visibleEvents.map((item) => (
                <div key={item.id} className="flex overflow-hidden rounded-xl border border-border/70 bg-card">
                  <div className={cn("w-1 shrink-0", item.event_type === "google_calendar" ? "bg-[#4285F4]" : "bg-amber-400")} />
                  <div className="flex-1 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      {item.event_type === "google_calendar" ? (
                        <span className="shrink-0 rounded-full bg-[#4285F4]/10 px-2 py-0.5 text-[10px] font-bold text-[#4285F4]">Google</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">Evento</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.event_date} {item.event_time ? `· ${item.event_time}` : ""} {item.location ? `· ${item.location}` : ""}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit("events", item)}>Editar</Button>
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
                      <Button size="sm" variant="outline" onClick={() => openEdit("notes", item)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete("notes", item.id)} disabled={saving}>Borrar</Button>
                    </div>
                  </div>
                </div>
              ))
            : null}
        </article>
      </div>

      {/* Edit modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => !editSaving && setEditTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-5 text-lg font-bold capitalize">
              Editar{" "}
              <span className="font-normal text-muted-foreground">
                — {editTarget.tab === "tasks" ? "Tarea" : editTarget.tab === "meetings" ? "Reunión" : editTarget.tab === "events" ? "Evento" : "Nota"}
              </span>
            </h3>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {/* Title — all types */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Título</label>
                <input
                  className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={editForm.title ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  disabled={editSaving}
                />
              </div>

              {/* Description — tasks, meetings, events */}
              {editTarget.tab !== "notes" && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Descripción</label>
                  <input
                    className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editForm.description ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    disabled={editSaving}
                  />
                </div>
              )}

              {/* Task-specific */}
              {editTarget.tab === "tasks" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Fecha</label>
                      <input type="date" className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.due_date ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))} disabled={editSaving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Hora</label>
                      <input type="time" className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.due_time ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, due_time: e.target.value }))} disabled={editSaving} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Prioridad</label>
                      <select className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.priority ?? "medium"} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))} disabled={editSaving}>
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Estado</label>
                      <select className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.status ?? "pending"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} disabled={editSaving}>
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En progreso</option>
                        <option value="done">Completada</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Meeting-specific */}
              {editTarget.tab === "meetings" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Fecha</label>
                      <input type="date" className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.meeting_date ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, meeting_date: e.target.value }))} disabled={editSaving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Hora</label>
                      <input type="time" className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.meeting_time ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, meeting_time: e.target.value }))} disabled={editSaving} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Duración (min)</label>
                      <input type="number" min={0} className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.duration_minutes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, duration_minutes: e.target.value }))} disabled={editSaving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Ubicación</label>
                      <input className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.location ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} disabled={editSaving} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Participantes (coma separados)</label>
                    <input className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.participants ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, participants: e.target.value }))} disabled={editSaving} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Estado</label>
                    <select className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.status ?? "scheduled"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} disabled={editSaving}>
                      <option value="scheduled">Programada</option>
                      <option value="completed">Completada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>
                </>
              )}

              {/* Event-specific */}
              {editTarget.tab === "events" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Fecha</label>
                      <input type="date" className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.event_date ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, event_date: e.target.value }))} disabled={editSaving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Hora</label>
                      <input type="time" className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.event_time ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, event_time: e.target.value }))} disabled={editSaving} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Ubicación</label>
                      <input className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.location ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} disabled={editSaving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Tipo</label>
                      <input className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.event_type ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, event_type: e.target.value }))} disabled={editSaving} />
                    </div>
                  </div>
                </>
              )}

              {/* Note-specific */}
              {editTarget.tab === "notes" && (
                <>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Contenido</label>
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={editForm.content ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                      disabled={editSaving}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Estado</label>
                    <select className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.status ?? "active"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} disabled={editSaving}>
                      <option value="active">Activa</option>
                      <option value="archived">Archivada</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={editSaving}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-accent disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={editSaving}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {editSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
