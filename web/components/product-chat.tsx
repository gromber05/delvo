"use client"

import * as React from "react"
import { getDictionary } from "@/lib/dictionary"
import { getLanguageFromPathname } from "@/lib/language"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

type Role = "user" | "assistant"

type Message = {
  id: string
  role: Role
  content: string
  contextUsed?: string[]
  feedback?: "up" | "down" | null
}

type ChatTurn = { role: Role; content: string }

type ChatApiResponse = {
  intent?: string
  data?: Record<string, unknown>
  message?: string
  context_used?: string[]
  detail?: string
}

function buildId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const TYPING_STEP = 2
const TYPING_DELAY_MS = 14

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type ProductChatProps = {
  compact?: boolean
  className?: string
}

const SparkleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
)

export function ProductChat({ compact = false, className }: ProductChatProps) {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const dictionary = getDictionary(language)
  const isSpanish = language === "es"

  const [messages, setMessages] = React.useState<Message[]>([
    { id: "welcome", role: "assistant", content: dictionary.chat.welcome },
  ])
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [isTyping, setIsTyping] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, loading])

  async function typeMessage(id: string, fullText: string, contextUsed?: string[]) {
    setMessages((prev) => [...prev, { id, role: "assistant", content: "", contextUsed }])
    for (let i = TYPING_STEP; i <= fullText.length; i += TYPING_STEP) {
      const partial = fullText.slice(0, i)
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: partial } : m))
      await wait(TYPING_DELAY_MS)
    }
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: fullText } : m))
  }

  async function send(text?: string) {
    const msgText = (text ?? input).trim()
    if (!msgText || loading || isTyping) return
    const userMsg: Message = { id: buildId("user"), role: "user", content: msgText }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgText, language, useRag: true,
          history: messages.filter((m) => m.id !== "welcome").slice(-12)
            .map<ChatTurn>((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as ChatApiResponse
      if (!res.ok) throw new Error(data.detail ?? dictionary.chat.assistantError)
      if (data.intent === "create_task" || data.intent === "update_task") {
        window.dispatchEvent(new CustomEvent("planner:tasks-updated", { detail: { source: "assistant", intent: data.intent } }))
      }
      const assistantId = buildId("assistant")
      const assistantText = data.message?.trim() || dictionary.chat.noModelResponse
      setLoading(false)
      setIsTyping(true)
      await typeMessage(assistantId, assistantText, data.context_used)
      setIsTyping(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dictionary.chat.unexpectedError)
    } finally {
      setLoading(false)
      setIsTyping(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await send()
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content)
      .then(() => toast.success(isSpanish ? "Copiado" : "Copied"))
      .catch(() => {})
  }

  function setFeedback(id: string, value: "up" | "down") {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, feedback: m.feedback === value ? null : value } : m))
  }

  const suggestions = isSpanish
    ? ["Muéstrame mi agenda de hoy", "Crear una tarea rápida", "¿Qué reuniones tengo esta semana?"]
    : ["Show my schedule for today", "Create a quick task", "What meetings do I have this week?"]

  if (compact) {
    return (
      <section className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
        <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
          {messages.map((msg) => (
            <div key={msg.id}
              className={cn(
                "max-w-[88%] rounded-2xl px-3 py-2 text-xs",
                msg.role === "user"
                  ? "ml-auto rounded-tr-sm bg-primary text-white"
                  : "mr-auto rounded-tl-sm bg-muted text-foreground"
              )}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          ))}
          {loading && (
            <div className="mr-auto inline-flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="shrink-0 flex items-center gap-2 border-t border-border/70 p-3">
          <input
            className="flex-1 rounded-full border border-border bg-muted/50 px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary/40"
            placeholder={dictionary.chat.inputPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || isTyping}
          />
          <button type="submit" disabled={loading || isTyping || !input.trim()}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-colors">
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </section>
    )
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
              {msg.role === "assistant" && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#6c5ce7]/15 mt-0.5">
                  <SparkleIcon className="size-4 text-[#6c5ce7]" />
                </div>
              )}
              <div className={msg.role === "user" ? "max-w-[70%]" : "min-w-0 flex-1"}>
                {msg.role === "user" ? (
                  <p className="rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-white">{msg.content}</p>
                ) : (
                  <div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    <div className="mt-2 flex items-center gap-0.5">
                      <button type="button" onClick={() => copyMessage(msg.content)}
                        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title={isSpanish ? "Copiar" : "Copy"}>
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => setFeedback(msg.id, "up")}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-lg transition-colors",
                          msg.feedback === "up" ? "text-emerald-500" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}>
                        <svg className="size-3.5" fill={msg.feedback === "up" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => setFeedback(msg.id, "down")}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-lg transition-colors",
                          msg.feedback === "down" ? "text-red-400" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}>
                        <svg className="size-3.5" fill={msg.feedback === "down" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 00.303-.54m.023-8.25H16.48a4.5 4.5 0 01-1.423-.23l-3.114-1.04a4.5 4.5 0 00-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 002.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.5a2.25 2.25 0 002.25 2.25.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.861-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#6c5ce7]/15 mt-0.5">
                <SparkleIcon className="size-4 text-[#6c5ce7]" />
              </div>
              <div className="inline-flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-6 pb-5">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => send(s)}
                disabled={loading || isTyping}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground disabled:opacity-50 transition-colors">
                {s}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:border-primary/30 transition-colors">
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              placeholder={isSpanish ? "Pregunta a Stella sobre tu agenda, tareas o eventos..." : "Ask Stella to schedule, prioritize, or summarize..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || isTyping}
            />
            <button type="submit" disabled={loading || isTyping || !input.trim()}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-colors">
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>

          <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
            {isSpanish
              ? "Stella puede cometer errores. Verifica información importante."
              : "Stella can make mistakes. Verify important information."}
          </p>
        </div>
      </div>
    </div>
  )
}
