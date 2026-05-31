"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { motion } from "motion/react"
import { getDictionary } from "@/lib/dictionary"
import { getLanguageFromPathname, normalizeLanguage, withLanguagePrefix } from "@/lib/language"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type SignupApiResponse = {
  detail?: string
  user?: {
    id: number
    name: string
    email: string
    avatar: string
  }
}

export function SignupForm({
  className,
  language: languageFromParams,
}: React.ComponentProps<"div"> & { language?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const language = normalizeLanguage(languageFromParams ?? getLanguageFromPathname(pathname ?? ""))
  const dictionary = getDictionary(language)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) return

    if (password !== confirmPassword) {
      setFormError(dictionary.auth.passwordMismatch)
      return
    }

    if (password.length < 8) {
      setFormError(dictionary.auth.passwordMinLength)
      return
    }

    setFormError("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const payload = (await response.json().catch(() => null)) as SignupApiResponse | null

      if (!response.ok) {
        toast.error(payload?.detail ?? dictionary.auth.signupError)
        return
      }

      if (payload?.user) {
        sessionStorage.setItem(
          "user",
          JSON.stringify({
            id: payload.user.id,
            name: payload.user.name,
            email: payload.user.email,
            avatar: payload.user.avatar,
          })
        )
      }

      router.replace(withLanguagePrefix("/home", language))
      router.refresh()
    } catch {
      toast.error(dictionary.auth.signupError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const item = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
  }

  return (
    <motion.div
      className={cn("flex flex-col items-center gap-6", className)}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
    >
      {/* Logo */}
      <motion.div variants={item} className="flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-xl bg-[#6c5ce7] shadow-lg shadow-[#6c5ce7]/40">
          <Image src="/delvo-logo-nobg.png" alt="Delvo" width={32} height={32} className="size-8 object-contain" />
        </div>
        <h1 className="text-2xl font-black text-white">Delvo</h1>
      </motion.div>

      {/* Form card */}
      <motion.div variants={item} className="w-full rounded-2xl border border-white/8 bg-[#1a1a22] p-7 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              {dictionary.auth.nameLabel}
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f0f13] px-4 py-3 focus-within:border-[#6c5ce7]/60 transition-colors">
              <svg className="size-4 shrink-0 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <input
                type="text"
                placeholder={dictionary.auth.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                disabled={isSubmitting}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              {dictionary.auth.emailLabel}
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f0f13] px-4 py-3 focus-within:border-[#6c5ce7]/60 transition-colors">
              <svg className="size-4 shrink-0 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <input
                type="email"
                placeholder={dictionary.auth.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isSubmitting}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              {dictionary.auth.passwordLabel}
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f0f13] px-4 py-3 focus-within:border-[#6c5ce7]/60 transition-colors">
              <svg className="size-4 shrink-0 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
              />
            </div>
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              {dictionary.auth.confirmPasswordLabel}
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f0f13] px-4 py-3 focus-within:border-[#6c5ce7]/60 transition-colors">
              <svg className="size-4 shrink-0 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
              />
            </div>
          </div>

          {/* Inline error */}
          {formError ? (
            <p className="text-xs font-medium text-red-400">{formError}</p>
          ) : null}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#6c5ce7] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#6c5ce7]/30 transition-all hover:bg-[#5b4bd6] disabled:opacity-60"
          >
            {isSubmitting ? dictionary.auth.signupSubmitting : dictionary.auth.signupButton}
            {!isSubmitting && (
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              {dictionary.common.or} {language === "es" ? "continuar con" : "continue with"}
            </span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          {/* Google */}
          <Link
            href="/api/auth/google"
            prefetch={false}
            className="flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#0f0f13] py-3 text-sm font-semibold text-white/70 transition-colors hover:border-white/20 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {dictionary.common.continueWithGoogle}
          </Link>
        </form>
      </motion.div>

      {/* Footer link */}
      <motion.p variants={item} className="text-sm text-white/40">
        {dictionary.auth.hasAccount}{" "}
        <Link href={withLanguagePrefix("/login", language)} className="font-semibold text-[#6c5ce7] hover:text-[#8b7cf8] transition-colors">
          {dictionary.auth.loginLink}
        </Link>
      </motion.p>
    </motion.div>
  )
}
