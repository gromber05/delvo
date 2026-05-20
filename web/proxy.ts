import { NextRequest, NextResponse } from "next/server"
import {
  DEFAULT_LANGUAGE,
  getLanguageFromPathname,
  hasLanguagePrefix,
  stripLanguagePrefix,
  withLanguagePrefix,
} from "@/lib/language"

const isBypassEnabled = process.env.DELVO_PROXY_BYPASS === "true"
const authCookieName = process.env.DELVO_AUTH_COOKIE_NAME ?? "session_token"

const unauthOnlyRoutes = ["/login", "/signup", "/oauth-done"]
const publicRoutes = ["/health", "/privacy-policy"]

function isRouteMatch(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export function proxy(request: NextRequest) {
  if (isBypassEnabled) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  const hasLanguage = hasLanguagePrefix(pathname)

  if (!hasLanguage) {
    const preferredLanguage = request.headers.get("accept-language")?.split(",")[0] ?? DEFAULT_LANGUAGE
    const destination = withLanguagePrefix(pathname, preferredLanguage)
    return NextResponse.redirect(new URL(destination, request.url))
  }

  const currentLanguage = getLanguageFromPathname(pathname)
  const localizedPathname = stripLanguagePrefix(pathname)
  const token = request.cookies.get(authCookieName)?.value
  const isLoggedIn = Boolean(token)
  const isUnauthOnlyRoute = isRouteMatch(localizedPathname, unauthOnlyRoutes)
  const isPublicRoute = isRouteMatch(localizedPathname, publicRoutes)

  if (isPublicRoute) {
    return NextResponse.next()
  }

  if (!isLoggedIn && !isUnauthOnlyRoute) {
    return NextResponse.redirect(new URL(withLanguagePrefix("/login", currentLanguage), request.url))
  }

  if (isLoggedIn && isUnauthOnlyRoute) {
    return NextResponse.redirect(new URL(withLanguagePrefix("/home", currentLanguage), request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
