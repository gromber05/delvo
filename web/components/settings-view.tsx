"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { getLanguageFromPathname, withLanguagePrefix, stripLanguagePrefix } from "@/lib/language"
import { toast } from "sonner"

type User = { name: string; email: string; google_email?: string | null }
type Tab = "personal" | "security"

const settingsCopy = {
  es: {
    title: "Ajustes",
    subtitle: "Gestiona tu perfil, configuración y conexiones externas.",
    defaultUser: "Usuario Delvo",
    personalInfo: "Información personal",
    securityPassword: "Seguridad y contraseña",
    integrations: "Integraciones",
    integrationsSubtitle: "Conecta Delvo con tus herramientas favoritas.",
    connectedAs: "Conectado como",
    notConnected: "Sin conectar",
    connect: "Conectar",
    disconnect: "Desconectar",
    preferences: "Preferencias",
    interfaceTheme: "Tema de interfaz",
    language: "Idioma",
    spanish: "Español",
    account: "Cuenta",
    exporting: "Exportando...",
    exportData: "Exportar datos",
    signOut: "Cerrar sesión",
    deleteAccount: "Eliminar cuenta",
    deleteWarning: "Esta acción es irreversible. Se eliminarán todos tus datos permanentemente.",
    cancel: "Cancelar",
    deleting: "Eliminando...",
    confirmDelete: "Sí, eliminar",
    fullName: "Nombre completo",
    yourName: "Tu nombre",
    email: "Correo electrónico",
    readOnly: "Solo lectura",
    saving: "Guardando...",
    saveChanges: "Guardar cambios",
    currentPassword: "Contraseña actual",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar nueva contraseña",
    updating: "Actualizando...",
    updatePassword: "Actualizar contraseña",
    passwordHint: "Tu contraseña debe tener al menos",
    characters: "8 caracteres",
    minCharacters: "Mínimo 8 caracteres",
    passwordsMismatch: "Las contraseñas no coinciden",
    passwordsMatch: "Las contraseñas coinciden",
    googleLinked: "Google Calendar vinculado",
    googleLinkError: "Error al vincular Google Calendar",
    signedOut: "Sesión cerrada",
    exportError: "Error al exportar datos",
    exportSuccess: "Datos exportados correctamente",
    exportFail: "No se pudieron exportar los datos",
    deleteError: "Error al eliminar la cuenta",
    deleteSuccess: "Cuenta eliminada",
    disconnectError: "Error al desconectar",
    googleDisconnected: "Google Calendar desconectado",
    nameRequired: "El nombre no puede estar vacío",
    saveError: "Error al guardar",
    infoUpdated: "Información actualizada",
    currentPasswordRequired: "Introduce tu contraseña actual",
    passwordLengthError: "La nueva contraseña debe tener al menos 8 caracteres",
    changePasswordError: "Error al cambiar la contraseña",
    passwordUpdated: "Contraseña actualizada correctamente",
  },
  en: {
    title: "Settings",
    subtitle: "Manage your profile, preferences, and external connections.",
    defaultUser: "Delvo User",
    personalInfo: "Personal information",
    securityPassword: "Security and password",
    integrations: "Integrations",
    integrationsSubtitle: "Connect Delvo with your favorite tools.",
    connectedAs: "Connected as",
    notConnected: "Not connected",
    connect: "Connect",
    disconnect: "Disconnect",
    preferences: "Preferences",
    interfaceTheme: "Interface theme",
    language: "Language",
    spanish: "Spanish",
    account: "Account",
    exporting: "Exporting...",
    exportData: "Export data",
    signOut: "Sign out",
    deleteAccount: "Delete account",
    deleteWarning: "This action is irreversible. All your data will be permanently deleted.",
    cancel: "Cancel",
    deleting: "Deleting...",
    confirmDelete: "Yes, delete",
    fullName: "Full name",
    yourName: "Your name",
    email: "Email",
    readOnly: "Read only",
    saving: "Saving...",
    saveChanges: "Save changes",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    updating: "Updating...",
    updatePassword: "Update password",
    passwordHint: "Your password must be at least",
    characters: "8 characters",
    minCharacters: "Minimum 8 characters",
    passwordsMismatch: "Passwords do not match",
    passwordsMatch: "Passwords match",
    googleLinked: "Google Calendar linked",
    googleLinkError: "Could not link Google Calendar",
    signedOut: "Signed out",
    exportError: "Error exporting data",
    exportSuccess: "Data exported successfully",
    exportFail: "Could not export data",
    deleteError: "Error deleting account",
    deleteSuccess: "Account deleted",
    disconnectError: "Error disconnecting",
    googleDisconnected: "Google Calendar disconnected",
    nameRequired: "Name cannot be empty",
    saveError: "Error saving",
    infoUpdated: "Information updated",
    currentPasswordRequired: "Enter your current password",
    passwordLengthError: "New password must be at least 8 characters",
    changePasswordError: "Error changing password",
    passwordUpdated: "Password updated successfully",
  },
}

export function SettingsView() {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const copy = settingsCopy[language === "en" ? "en" : "es"]
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("personal")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

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
    if (google === "ok") toast.success(copy.googleLinked)
    if (google === "error") toast.error(copy.googleLinkError)
  }, [searchParams, copy.googleLinked, copy.googleLinkError])

  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }) } catch {}
    sessionStorage.removeItem("user")
    toast.success(copy.signedOut)
    router.replace(withLanguagePrefix("/login", language))
    router.refresh()
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch("/api/auth/export")
      if (!res.ok) throw new Error(copy.exportError)
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `delvo-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(copy.exportSuccess)
    } catch {
      toast.error(copy.exportFail)
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch("/api/auth/me", { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.detail ?? copy.deleteError)
      try { await fetch("/api/auth/logout", { method: "POST" }) } catch {}
      sessionStorage.removeItem("user")
      toast.success(copy.deleteSuccess)
      router.replace(withLanguagePrefix("/login", language))
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.deleteError)
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  async function handleDisconnectGoogle() {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/auth/google-calendar", { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.detail ?? copy.disconnectError)
      setUser((u) => u ? { ...u, google_email: null } : u)
      toast.success(copy.googleDisconnected)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.disconnectError)
    } finally {
      setDisconnecting(false)
    }
  }

  function handleLanguageChange(lang: string) {
    const rawPath = stripLanguagePrefix(pathname ?? "/")
    router.push(withLanguagePrefix(rawPath, lang))
  }

  const displayName = user?.name?.trim() || copy.defaultUser
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 pt-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy.subtitle}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <div className="flex items-center gap-5">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#6c5ce7]/20 text-2xl font-black text-[#6c5ce7]">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold">{displayName}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{user?.email ?? ""}</p>
              </div>
            </div>

            <div className="mt-5 flex gap-1 rounded-xl bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                className={[
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
                  activeTab === "personal"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {copy.personalInfo}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={[
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
                  activeTab === "security"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {copy.securityPassword}
              </button>
            </div>
          </div>

          {activeTab === "personal" && (
            <PersonalTab user={user} copy={copy} onUserUpdated={(updated) => setUser(updated)} />
          )}
          {activeTab === "security" && <SecurityTab copy={copy} />}

          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="mb-1 text-lg font-bold">{copy.integrations}</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {copy.integrationsSubtitle}
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
                    {user?.google_email ? `• ${copy.connectedAs} ${user.google_email}` : copy.notConnected}
                  </p>
                </div>
                {user?.google_email ? (
                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    disabled={disconnecting}
                    className="shrink-0 rounded-xl border border-border/70 px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-60"
                  >
                    {disconnecting ? "..." : copy.disconnect}
                  </button>
                ) : (
                  <Link
                    href="/api/auth/google"
                    prefetch={false}
                    className="shrink-0 rounded-xl border border-border/70 px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-[#4285F4]/50 hover:text-[#4285F4]"
                  >
                    {copy.connect}
                  </Link>
                )}
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
              {copy.preferences}
            </h2>

            <div className="mb-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {copy.interfaceTheme}
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
                {copy.language}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(["es", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLanguageChange(lang)}
                    className={[
                      "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition-colors",
                      language === lang
                        ? "border-[#6c5ce7]/60 bg-[#6c5ce7]/10 text-[#6c5ce7]"
                        : "border-border/70 text-muted-foreground hover:border-border",
                    ].join(" ")}
                  >
                    <span>{lang === "es" ? "ES" : "EN"}</span>
                    <span>{lang === "es" ? copy.spanish : "English"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="mb-4 text-base font-bold">{copy.account}</h2>
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-60"
              >
                <span>{exporting ? copy.exporting : copy.exportData}</span>
                {exporting ? (
                  <svg className="size-4 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
              >
                <span>{copy.signOut}</span>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <span>{copy.deleteAccount}</span>
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              ) : (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="mb-3 text-xs font-semibold text-destructive">
                    {copy.deleteWarning}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-lg border border-border/70 py-2 text-xs font-bold text-muted-foreground hover:bg-accent transition-colors"
                    >
                      {copy.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="flex-1 rounded-lg bg-destructive py-2 text-xs font-bold text-white hover:bg-destructive/90 transition-colors disabled:opacity-60"
                    >
                      {deleting ? copy.deleting : copy.confirmDelete}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PersonalTab({
  user,
  copy,
  onUserUpdated,
}: {
  user: User | null
  copy: typeof settingsCopy.es
  onUserUpdated: (u: User) => void
}) {
  const [name, setName] = useState(user?.name ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user?.name])

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { toast.error(copy.nameRequired); return }
    setSaving(true)
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.detail ?? copy.saveError)
      onUserUpdated({ name: data.user.name, email: data.user.email, google_email: data.user.google_email })
      toast.success(copy.infoUpdated)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.saveError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {copy.fullName}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={copy.yourName}
            className="rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-sm font-medium outline-none ring-[#6c5ce7]/40 transition-all placeholder:text-muted-foreground/50 focus:border-[#6c5ce7]/60 focus:ring-2"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {copy.email}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
            <span className="text-sm font-medium text-foreground/70">{user?.email ?? ""}</span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {copy.readOnly}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#6c5ce7] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#5b4bd6] disabled:opacity-60"
        >
          {saving ? (
            <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          {saving ? copy.saving : copy.saveChanges}
        </button>
      </div>
    </div>
  )
}

function SecurityTab({ copy }: { copy: typeof settingsCopy.es }) {
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const newPwError = newPw.length > 0 && newPw.length < 8
  const confirmMismatch = confirmPw.length > 0 && confirmPw !== newPw
  const confirmMatch = confirmPw.length > 0 && confirmPw === newPw

  async function handleSave() {
    if (!currentPw) { toast.error(copy.currentPasswordRequired); return }
    if (newPw.length < 8) { toast.error(copy.passwordLengthError); return }
    if (newPw !== confirmPw) { toast.error(copy.passwordsMismatch); return }
    setSaving(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.detail ?? copy.changePasswordError)
      toast.success(copy.passwordUpdated)
      setCurrentPw(""); setNewPw(""); setConfirmPw("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.changePasswordError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        {copy.passwordHint} <span className="font-semibold text-foreground">{copy.characters}</span>.
      </p>

      <div className="flex flex-col gap-4">
        <PasswordField
          label={copy.currentPassword}
          value={currentPw}
          onChange={setCurrentPw}
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
        />
        <PasswordField
          label={copy.newPassword}
          value={newPw}
          onChange={setNewPw}
          show={showNew}
          onToggle={() => setShowNew((v) => !v)}
          hint={newPwError ? copy.minCharacters : undefined}
          hintError
        />
        <PasswordField
          label={copy.confirmPassword}
          value={confirmPw}
          onChange={setConfirmPw}
          show={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
          hint={
            confirmMismatch
              ? copy.passwordsMismatch
              : confirmMatch
              ? `✓ ${copy.passwordsMatch}`
              : undefined
          }
          hintError={confirmMismatch}
          hintOk={confirmMatch}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#6c5ce7] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#5b4bd6] disabled:opacity-60"
        >
          {saving ? (
            <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          )}
          {saving ? copy.updating : copy.updatePassword}
        </button>
      </div>
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  hint,
  hintError = false,
  hintOk = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  hint?: string
  hintError?: boolean
  hintOk?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center rounded-xl border border-border/70 bg-background/60 px-4 py-3 ring-[#6c5ce7]/40 transition-all focus-within:border-[#6c5ce7]/60 focus-within:ring-2">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/50"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="ml-2 text-muted-foreground transition-colors hover:text-foreground"
          tabIndex={-1}
        >
          {show ? (
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>
      {hint && (
        <p className={`text-xs font-medium ${hintError ? "text-destructive" : hintOk ? "text-emerald-500" : "text-muted-foreground"}`}>
          {hint}
        </p>
      )}
    </div>
  )
}
