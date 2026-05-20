"use client"

import { getDictionary } from "@/lib/dictionary"
import { getLanguageFromPathname } from "@/lib/language"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

type TaskItem = {
  title: string
  date: string
  time: string
  state: string
  priority: "low" | "medium" | "high"
}

function formatLongDate(isoDate: string, locale: string) {
  const parsed = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return isoDate

  const formatted = parsed.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function getTaskStateLabel(state: string, language: "es" | "en") {
  if (language === "es") {
    if (state === "done") return "Completada"
    if (state === "in_progress") return "En progreso"
    return "Pendiente"
  }

  if (state === "done") return "Done"
  if (state === "in_progress") return "In progress"
  return "Pending"
}

function getPriorityLabel(priority: TaskItem["priority"], language: "es" | "en") {
  if (language === "es") {
    if (priority === "high") return "Alta"
    if (priority === "low") return "Baja"
    return "Media"
  }

  if (priority === "high") return "High"
  if (priority === "low") return "Low"
  return "Medium"
}

function getStateBadgeClass(state: string) {
  if (state === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (state === "in_progress") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function getPriorityDotClass(priority: TaskItem["priority"]) {
  if (priority === "high") return "bg-rose-500"
  if (priority === "low") return "bg-sky-500"
  return "bg-amber-500"
}

function buildCalendar(reference: Date, dateLocale: string) {
  const year = reference.getFullYear()
  const month = reference.getMonth()
  const monthName = reference.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })

  const firstDay = new Date(year, month, 1)
  const firstDayIndex = (firstDay.getDay() + 6) % 7
  const totalDays = new Date(year, month + 1, 0).getDate()

  const cells: Array<number | null> = []
  for (let i = 0; i < firstDayIndex; i += 1) cells.push(null)
  for (let day = 1; day <= totalDays; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)

  return { monthName, cells, today: reference.getDate(), year, month: month + 1 }
}

export function DashboardCalendar() {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const dictionary = getDictionary(language)
  const now = new Date()
  const { monthName, cells, today, year, month } = buildCalendar(now, dictionary.dashboard.dateLocale)
  const noTimeLabel = dictionary.dashboard.noTime
  const languageCode: "es" | "en" = language === "en" ? "en" : "es"

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)

  function formatIsoDate(day: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  function countTasksByDate(date: string) {
    return tasks.filter((task) => task.date === date).length
  }

  const todayTasks = tasks.filter((task) => task.date === formatIsoDate(today))
  const selectedDayTasks = selectedDate ? tasks.filter((task) => task.date === selectedDate) : []
  const selectedDayLabel = selectedDate
    ? formatLongDate(selectedDate, dictionary.dashboard.dateLocale)
    : ""

  useEffect(() => {
    let cancelled = false

    async function loadTasks() {
      const response = await fetch("/api/planner/tasks", { cache: "no-store" }).catch(() => null)
      if (!response || !response.ok) return []
      const payload = (await response.json().catch(() => null)) as { items?: Array<Record<string, unknown>> } | null
      const items = Array.isArray(payload?.items) ? payload.items : []
      return items
        .map<TaskItem | null>((item) => {
          const title = typeof item.title === "string" ? item.title : ""
          const date = typeof item.due_date === "string" ? item.due_date : ""
          if (!title || !date) return null
          const rawTime = typeof item.due_time === "string" ? item.due_time : ""
          const state = typeof item.status === "string" ? item.status : "pending"
          const priority =
            item.priority === "high" || item.priority === "low" ? item.priority : "medium"

          return {
            title,
            date,
            time: rawTime ? rawTime.slice(0, 5) : noTimeLabel,
            state,
            priority,
          }
        })
        .filter((item): item is TaskItem => item !== null)
    }

    loadTasks()
      .then((items) => {
        if (!cancelled) setTasks(items)
      })
      .catch(() => undefined)

    function onTasksUpdated() {
      loadTasks()
        .then((items) => {
          if (!cancelled) setTasks(items)
        })
        .catch(() => undefined)
    }

    window.addEventListener("planner:tasks-updated", onTasksUpdated)
    return () => {
      cancelled = true
      window.removeEventListener("planner:tasks-updated", onTasksUpdated)
    }
  }, [noTimeLabel])

  return (
    <article className="min-h-0 overflow-auto rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{dictionary.dashboard.calendar}</h3>
          <p className="text-sm text-muted-foreground">{dictionary.dashboard.calendarHint}</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize text-muted-foreground">{monthName}</span>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
        {dictionary.dashboard.weekDays.map((day, index) => (
          <div key={`${day}-${index}`} className="py-1">{day}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-2">
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="min-h-14 rounded-lg border border-transparent" />
          const date = formatIsoDate(day)
          const isToday = day === today
          const taskCount = countTasksByDate(date)
          return (
            <button
              key={`${day}-${index}`}
              type="button"
              onClick={() => {
                setSelectedDate(date)
                setIsDayModalOpen(true)
              }}
              className={
                isToday
                  ? "min-h-14 rounded-lg border border-primary/20 bg-primary/10 px-1 py-2 text-primary"
                  : "min-h-14 rounded-lg border bg-background px-1 py-2 hover:bg-accent"
              }
            >
              <div className="text-sm">{day}</div>
              {taskCount > 0 ? (
                <div className="mx-auto mt-1 w-fit rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">{taskCount}</div>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mt-4 rounded-lg border bg-background p-3">
        <h4 className="text-sm font-semibold">{dictionary.dashboard.todayAgenda}</h4>
        {todayTasks.length > 0 ? (
          <div className="mt-2 space-y-2">
            {todayTasks.map((task) => (
              <div key={`${task.date}-${task.title}-${task.time}`} className="rounded-md border bg-muted/30 px-3 py-2">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{task.title}</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStateBadgeClass(task.state)}`}
                  >
                    {getTaskStateLabel(task.state, languageCode)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{task.time} - {getPriorityLabel(task.priority, languageCode)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{dictionary.dashboard.noTasksToday}</p>
        )}
      </div>

      {isDayModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsDayModalOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card p-0 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-border/70 bg-gradient-to-r from-primary/8 via-accent/20 to-transparent px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold leading-tight">
                  {dictionary.dashboard.dayTasksTitle} {selectedDayLabel}
                </h3>
                <button type="button" onClick={() => setIsDayModalOpen(false)} className="rounded-md px-2 py-1 text-sm hover:bg-accent">
                  {dictionary.dashboard.close}
                </button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedDayTasks.length} {selectedDayTasks.length === 1 ? dictionary.dashboard.taskSingular : dictionary.dashboard.taskPlural}
              </p>
            </div>
            <div className="max-h-[55vh] space-y-3 overflow-auto px-5 py-4">
              {selectedDayTasks.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedDayTasks.map((task) => (
                    <div key={`${task.date}-${task.title}-${task.time}`} className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{task.title}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{task.time}</span>
                            <span className={`inline-block size-1.5 rounded-full ${getPriorityDotClass(task.priority)}`} />
                            <span>{getPriorityLabel(task.priority, languageCode)}</span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getStateBadgeClass(task.state)}`}
                        >
                          {getTaskStateLabel(task.state, languageCode)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">{dictionary.dashboard.noTasksForDay}</p>
                </div>
              )}
            </div>
            <div className="border-t border-border/70 px-5 py-3">
              <button type="button" onClick={() => setIsDayModalOpen(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                {dictionary.dashboard.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}