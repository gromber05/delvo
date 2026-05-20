export const SUPPORTED_LANGUAGES = ["es", "en"] as const
export const DEFAULT_LANGUAGE = "es"

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const supportedLanguageSet = new Set<string>(SUPPORTED_LANGUAGES)

function readLanguagePrefix(pathname: string): string | null {
  const [firstSegment] = pathname.split("/").filter(Boolean)
  if (!firstSegment) {
    return null
  }

  const base = firstSegment.trim().toLowerCase().split("-")[0]
  return supportedLanguageSet.has(base) ? base : null
}

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  const normalized = (value ?? "").trim().toLowerCase()
  if (!normalized) {
    return DEFAULT_LANGUAGE
  }

  const base = normalized.split("-")[0]
  if (supportedLanguageSet.has(base)) {
    return base as SupportedLanguage
  }

  return DEFAULT_LANGUAGE
}

export function hasLanguagePrefix(pathname: string): boolean {
  return readLanguagePrefix(pathname) !== null
}

export function getLanguageFromPathname(pathname: string): SupportedLanguage {
  return (readLanguagePrefix(pathname) ?? DEFAULT_LANGUAGE) as SupportedLanguage
}

export function stripLanguagePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  if (!segments.length) {
    return "/"
  }

  const [firstSegment, ...restSegments] = segments
  const currentPrefix = firstSegment.trim().toLowerCase().split("-")[0]
  if (!supportedLanguageSet.has(currentPrefix)) {
    return pathname.startsWith("/") ? pathname : `/${pathname}`
  }

  if (!restSegments.length) {
    return "/"
  }

  return `/${restSegments.join("/")}`
}

export function withLanguagePrefix(pathname: string, language: string): string {
  const normalizedLanguage = normalizeLanguage(language)
  const cleanPath = stripLanguagePrefix(pathname)
  if (cleanPath === "/") {
    return `/${normalizedLanguage}`
  }
  return `/${normalizedLanguage}${cleanPath}`
}
