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
  const isSpanish = true
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
    try { await fetch("/api/auth/logout", { method: "POST" }) } catch {}
    sessionStorage.removeItem("user")
    toast.success(isSpanish ? "Sesión cerrada" : "Signed out")
    router.replace(withLanguagePrefix("/login", language))
    router.refresh()
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?"

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 pt-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{isSpanish ? "Ajustes" : "Settings"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSpanish
            ? "Gestiona tu perfil, configuración y conexiones externas."
            : "Manage your workspace configuration, personal profile, and external integrations."}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="flex size-20 items-center justify-center rounded-full bg-[#6c5ce7]/20 text-3xl font-black text-[#6c5ce7]">
                  {initial}
                </div>
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold">{user?.name ?? (isSpanish ? "Usuario" : "User")}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{user?.email ?? ""}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#6c5ce7]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#6c5ce7]">
                    {isSpanish ? "Plan Gratis" : "Free Plan"}
                  </span>
                  <span className="rounded-full bg-border/50 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                    {isSpanish ? "Usuario" : "User"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl bg-[#6c5ce7] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#5b4bd6] transition-colors"
              >
                {isSpanish ? "Guardar" : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="mb-1 text-lg font-bold">{isSpanish ? "Integraciones" : "Integrations"}</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {isSpanish ? "Conecta Delvo con tus herramientas favoritas." : "Connect Delvo with your favorite tools."}
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/60 px-4 py-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#4285F4]/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Google Calendar</p>
                  <p className={`mt-0.5 truncate text-xs ${user?.google_email ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {user?.google_email ? `● Connected as ${user.google_email}` : (isSpanish ? "Sin conectar" : "Not connected")}
                  </p>
                </div>
                <a
                  href="/api/auth/google"
                  className="shrink-0 rounded-xl border border-border/70 px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-[#4285F4]/50 hover:text-[#4285F4]"
                >
                  {user?.google_email ? (isSpanish ? "Desconectar" : "Disconnect") : (isSpanish ? "Conectar" : "Connect")}
                </a>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/60 px-4 py-3.5 opacity-60">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted">
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.61c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Notion Workspace</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{isSpanish ? "Sincroniza tareas y documentos" : "Sync tasks and documents"}</p>
                </div>
                <button
                  type="button"
                  disabled
                  className="shrink-0 rounded-xl border border-border/70 px-3 py-1.5 text-xs font-bold text-muted-foreground"
                >
                  {isSpanish ? "Conectar" : "Connect"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
              <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isSpanish ? "Preferencias" : "Preferences"}
            </h2>

            <div className="mb-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {isSpanish ? "Tema de interfaz" : "Interface Theme"}
              </p>
              {mounted && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={[
                      "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors",
                      isDark ? "border-[#6c5ce7]/60 bg-[#6c5ce7]/10 text-[#6c5ce7]" : "border-border/70 text-muted-foreground hover:border-border",
                    ].join(" ")}
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={[
                      "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors",
                      !isDark ? "border-[#6c5ce7]/60 bg-[#6c5ce7]/10 text-[#6c5ce7]" : "border-border/70 text-muted-foreground hover:border-border",
                    ].join(" ")}
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                    Light
                  </button>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {isSpanish ? "Idioma" : "Language"}
              </p>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-4 py-3">
                <span className="text-sm font-medium">{isSpanish ? "Español (ES)" : "English (US)"}</span>
                <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="mb-4 text-base font-bold">{isSpanish ? "Cuenta" : "Account"}</h2>
            <div className="space-y-1">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <span>{isSpanish ? "Exportar datos" : "Export Data"}</span>
                <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
              >
                <span>{isSpanish ? "Cerrar sesión" : "Sign out"}</span>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
              >
                <span>{isSpanish ? "Eliminar cuenta" : "Delete Account"}</span>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
