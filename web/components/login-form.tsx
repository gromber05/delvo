"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { getDictionary } from "@/lib/dictionary"
import { getLanguageFromPathname, normalizeLanguage, withLanguagePrefix } from "@/lib/language"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutBottomIcon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

type LoginApiResponse = {
  detail?: string
  user?: {
    id: number
    name: string
    email: string
  }
}

export function LoginForm({
  className,
  language: languageFromParams,
  ...props
}: React.ComponentProps<"div"> & { language?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const language = normalizeLanguage(languageFromParams ?? getLanguageFromPathname(pathname ?? ""))
  const dictionary = getDictionary(language)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as LoginApiResponse | null
        toast.error(payload?.detail ?? dictionary.auth.loginError)
        return
      }

      const payload = (await response.json().catch(() => null)) as LoginApiResponse | null
      if (payload?.user) {
        sessionStorage.setItem(
          "user",
          JSON.stringify({
            id: payload.user.id,
            name: payload.user.name,
            email: payload.user.email,
            avatar: "/avatars/shadcn.jpg",
          })
        )
      }

      router.replace(withLanguagePrefix("/home", language))
      router.refresh()
    } catch {
      toast.error(dictionary.auth.loginError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-8 items-center justify-center rounded-md">
                <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} className="size-6" />
              </div>
              <span className="sr-only">Delvo</span>
            <h1 className="text-xl font-bold">{dictionary.auth.loginTitle}</h1>
            <FieldDescription>
              {dictionary.auth.noAccount}{" "}
              <Link href={withLanguagePrefix("/signup", language)}>{dictionary.auth.createAccount}</Link>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="email">{dictionary.auth.emailLabel}</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder={dictionary.auth.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">{dictionary.auth.passwordLabel}</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder={dictionary.auth.passwordPlaceholder}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </Field>
          <Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? dictionary.auth.loginSubmitting : dictionary.auth.loginButton}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        {dictionary.common.tosPrefix} <a href="#">{dictionary.common.tos}</a> {dictionary.common.and}{" "}
        <a href="#">{dictionary.common.privacy}</a>.
      </FieldDescription>
    </div>
  )
}
