"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { getLanguageFromPathname, withLanguagePrefix } from "@/lib/language"
import { toast } from "sonner"

type User = { name: string; email: string }

export function SettingsView() {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const isSpanish = language === "es"
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setUser({ name: data.user.name as string, email: (data.user.email as string) ?? "" })
        }
      })
      .catch(() => undefined)
  }, [])

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // continue even if request fails
    }
    sessionStorage.removeItem("user")
    toast.success(isSpanish ? "Sesión cerrada" : "Signed out")
    router.replace(withLanguagePrefix("/login", language))
    router.refresh()
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?"

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4">

      {/* Profile hero */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card p-8">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-3xl font-extrabold text-primary">
          {initial}
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{user?.name ?? (isSpanish ? "Usuario" : "User")}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{user?.email ?? ""}</p>
        </div>
      </div>

      {/* Appearance */}
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

      {/* Session */}
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
