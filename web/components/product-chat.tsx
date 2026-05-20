"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getDictionary } from "@/lib/dictionary"
import { getLanguageFromPathname } from "@/lib/language"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { SentIcon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

type Role = "user" | "assistant"

type Message = {
  id: string
  role: Role
  content: string
  contextUsed?: string[]
}

type ChatTurn = {
  role: Role
  content: string
}

type ChatApiResponse = {
  intent?: string
  data?: Record<string, unknown>
  message?: string
  context_used?: string[]
  detail?: string
}

function buildId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

type ProductChatProps = {
  compact?: boolean
  className?: string
}

const TYPING_STEP = 2
const TYPING_DELAY_MS = 14

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function ProductChat({ compact = false, className }: ProductChatProps) {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const dictionary = getDictionary(language)
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: dictionary.chat.welcome,
    },
  ])
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [isAssistantTyping, setIsAssistantTyping] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const list = listRef.current
    if (!list) {
      return
    }

    list.scrollTop = list.scrollHeight
  }, [messages, loading])

  async function typeAssistantMessage(
    id: string,
    fullText: string,
    contextUsed?: string[]
  ) {
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: "assistant",
        content: "",
        contextUsed,
      },
    ])

    for (let i = TYPING_STEP; i <= fullText.length; i += TYPING_STEP) {
      const partial = fullText.slice(0, i)
      setMessages((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                content: partial,
              }
            : item
        )
      )
      await wait(TYPING_DELAY_MS)
    }

    setMessages((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              content: fullText,
            }
          : item
      )
    )
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || isAssistantTyping) {
      return
    }

    const text = input.trim()
    if (!text) {
      return
    }

    const userMessage: Message = {
      id: buildId("user"),
      role: "user",
      content: text,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          language,
          useRag: true,
          history: messages
            .filter((item) => item.id !== "welcome")
            .slice(-12)
            .map<ChatTurn>((item) => ({
              role: item.role,
              content: item.content,
            })),
        }),
      })

      const data = (await response.json().catch(() => ({}))) as ChatApiResponse

      if (!response.ok) {
        throw new Error(data.detail ?? dictionary.chat.assistantError)
      }

      if (data.intent === "create_task" || data.intent === "update_task") {
        window.dispatchEvent(
          new CustomEvent("planner:tasks-updated", {
            detail: { source: "assistant", intent: data.intent },
          })
        )
      }

      const assistantId = buildId("assistant")
      const assistantText = data.message?.trim() || dictionary.chat.noModelResponse
      setLoading(false)
      setIsAssistantTyping(true)
      await typeAssistantMessage(assistantId, assistantText, data.context_used)
      setIsAssistantTyping(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : dictionary.chat.unexpectedError
      toast.error(message)
    } finally {
      setLoading(false)
      setIsAssistantTyping(false)
    }
  }

  return (
    <section
      className={cn(
        "flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-xl border bg-background",
        compact ? "h-full" : "h-[calc(100vh-8rem)]",
        className
      )}
    >
      <header className="flex shrink-0 items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 border-2 border-primary/25 shadow-sm">
            <AvatarImage src="https://img.freepik.com/vector-premium/ilustracion-vectorial-personajes-mujeres-hermosas_1287271-88428.jpg?semt=ais_hybrid&w=740&q=80" />
            <AvatarFallback></AvatarFallback>
          </Avatar>
          <div>
            <h2 className="bg-linear-to-r from-primary to-cyan-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              Stella
            </h2>
            <p className="text-xs text-muted-foreground">{dictionary.chat.subtitle}</p>
          </div>
        </div>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        {messages.map((message) => (
          <article
            key={message.id}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-primary px-4 py-3 text-primary-foreground"
                : "mr-auto max-w-[85%] rounded-lg border bg-muted/40 px-4 py-3"
            }
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            {message.role === "assistant" && message.contextUsed?.length ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Contexto: {message.contextUsed.join(", ")}
              </p>
            ) : null}
          </article>
        ))}
        {loading ? (
          <article className="mr-auto inline-flex max-w-[85%] items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </span>
            <span>{dictionary.chat.typing}</span>
          </article>
        ) : null}
      </div>

      <footer className="shrink-0 border-t p-4">
        <form className="flex gap-2" onSubmit={sendMessage}>
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={dictionary.chat.inputPlaceholder}
            disabled={loading || isAssistantTyping}
          />
          <Button type="submit" disabled={loading || isAssistantTyping || !input.trim()}>
            <HugeiconsIcon icon={SentIcon} />
          </Button>
        </form>
      </footer>
    </section>
  )
}
