"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { getLanguageFromPathname, withLanguagePrefix } from "@/lib/language"
import { toast } from "sonner"

type User = { name: string; email: string; google_email?: string | null }

export function SettingsView() {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const isSpanish = language === "es"
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser({
            name: data.user.name as string,
            email: (data.user.email as string) ?? "",
            google_email: data.user.google_email ?? null,
          })
        }
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const google = searchParams.get("google")
    if (google === "ok") toast.success(isSpanish ? "Google Calendar vinculado" : "Google Calendar connected")
    if (google === "error") toast.error(isSpanish ? "Error al vincular Google Calendar" : "Failed to connect Google Calendar")
  }, [searchParams, isSpanish])

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      
    }
    sessionStorage.removeItem("user")
    toast.success(isSpanish ? "Sesión cerrada" : "Signed out")
    router.replace(withLanguagePrefix("/login", language))
    router.refresh()
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?"

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4">

      {}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card p-8">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-3xl font-extrabold text-primary">
          {initial}
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{user?.name ?? (isSpanish ? "Usuario" : "User")}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{user?.email ?? ""}</p>
        </div>
      </div>

      {}
      <p className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {isSpanish ? "Apariencia" : "Appearance"}
      </p>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="flex-1">
            <p className="text-sm font-semibold">{isSpanish ? "Modo oscuro" : "Dark mode"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isSpanish ? "Cambia el tema de la app" : "Toggle the app theme"}
            </p>
          </div>
          {mounted && (
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={[
                "relative h-7 w-12 rounded-full transition-colors duration-200",
                isDark ? "bg-primary" : "bg-muted-foreground/30",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-1 size-5 rounded-full bg-white shadow transition-transform duration-200",
                  isDark ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          )}
        </div>
      </div>

      {}
      <p className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {isSpanish ? "Integraciones" : "Integrations"}
      </p>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#4285F4]/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Google Calendar</p>
            <p className={`mt-0.5 truncate text-xs ${user?.google_email ? "text-[#4285F4]" : "text-muted-foreground"}`}>
              {user?.google_email ? `● ${user.google_email}` : (isSpanish ? "Sin vincular" : "Not connected")}
            </p>
          </div>
          <a
            href="/api/auth/google"
            className="shrink-0 rounded-xl border border-[#4285F4]/40 px-3 py-1.5 text-xs font-bold text-[#4285F4] transition-colors hover:bg-[#4285F4]/5"
          >
            {user?.google_email ? (isSpanish ? "Reconectar" : "Reconnect") : (isSpanish ? "Conectar" : "Connect")}
          </a>
        </div>
      </div>

      {}
      <p className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {isSpanish ? "Sesión" : "Session"}
      </p>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-2xl border border-destructive/30 bg-card py-4 text-sm font-bold text-destructive transition-colors hover:bg-destructive/5"
      >
        {isSpanish ? "Cerrar sesión" : "Sign out"}
      </button>

      <p className="text-center text-xs text-muted-foreground">Delvo v1.0</p>
    </div>
  )
}
