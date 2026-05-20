"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getDictionary } from "@/lib/dictionary"
import { getLanguageFromPathname, normalizeLanguage, withLanguagePrefix } from "@/lib/language"
import { cn } from "@/lib/utils"
import { LayoutBottomIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
  ...props
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

    if (isSubmitting) {
      return
    }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
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

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} className="size-6" />
              </div>
              <span className="sr-only">Delvo</span>
            </a>
            <h1 className="text-xl font-bold">{dictionary.auth.signupTitle}</h1>
            <FieldDescription>
              {dictionary.auth.hasAccount}{" "}
              <Link href={withLanguagePrefix("/login", language)}>{dictionary.auth.loginLink}</Link>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="name">{dictionary.auth.nameLabel}</FieldLabel>
            <Input
              id="name"
              type="text"
              placeholder={dictionary.auth.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="name"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">{dictionary.auth.emailLabel}</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder={dictionary.auth.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="email"
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
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">{dictionary.auth.confirmPasswordLabel}</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              placeholder={dictionary.auth.confirmPasswordPlaceholder}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </Field>
          {formError ? <FieldError>{formError}</FieldError> : null}
          <Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? dictionary.auth.signupSubmitting : dictionary.auth.signupButton}
            </Button>
          </Field>
          <FieldSeparator>{dictionary.common.or}</FieldSeparator>
          <Field className="grid gap-4 sm:grid-cols-1">
            <Button variant="outline" type="button" disabled>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              {dictionary.common.continueWithGoogle}
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

