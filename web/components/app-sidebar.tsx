"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { StellaWidget } from "@/components/stella-widget"
import { getDictionary } from "@/lib/dictionary"
import { getLanguageFromPathname, stripLanguagePrefix, withLanguagePrefix } from "@/lib/language"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

type SidebarUser = {
  name: string
  email: string
  avatar: string
}

const data = {
  user: {
    name: "Usuario",
    email: "usuario@delvo.app",
    avatar: "/avatars/shadcn.jpg",
  },
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const language = getLanguageFromPathname(pathname ?? "")
  const dictionary = getDictionary("es")
  const currentPath = stripLanguagePrefix(pathname ?? "/")

  const navMain = [
    {
      title: dictionary.sidebar.home,
      url: withLanguagePrefix("/home", language),
      icon: (
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
      isActive: currentPath === "/home",
    },
    {
      title: dictionary.sidebar.planner,
      url: withLanguagePrefix("/planner", language),
      icon: (
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      isActive: currentPath === "/planner",
    },
    {
      title: dictionary.sidebar.calendar,
      url: withLanguagePrefix("/calendar", language),
      icon: (
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
        </svg>
      ),
      isActive: currentPath === "/calendar",
    },
    {
      title: "Stella",
      url: withLanguagePrefix("/stella", language),
      icon: (
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
      isActive: currentPath === "/stella",
      badge: "AI",
    },
    {
      title: dictionary.sidebar.settings,
      url: withLanguagePrefix("/settings", language),
      icon: (
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      isActive: currentPath === "/settings",
    },
  ]

  const [user, setUser] = React.useState<SidebarUser>(data.user)
  const [logoError, setLogoError] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function hydrateUser() {
      const rawUser = sessionStorage.getItem("user")
      if (rawUser) {
        try {
          const parsedUser = JSON.parse(rawUser) as Partial<SidebarUser>
          if (typeof parsedUser.name === "string" && typeof parsedUser.email === "string") {
            if (!cancelled) setUser(parsedUser as SidebarUser)
          }
        } catch {}
      }
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        if (!response.ok) return
        const payload = (await response.json()) as {
          user?: { name?: string; email?: string; profile_photo_base64?: string | null }
        }
        const nextName = payload.user?.name?.trim()
        const nextEmail = payload.user?.email?.trim()
        if (!nextName || !nextEmail) return
        const nextUser: SidebarUser = {
          name: nextName,
          email: nextEmail,
          avatar: typeof payload.user?.profile_photo_base64 === "string" && payload.user.profile_photo_base64.length > 0
            ? payload.user.profile_photo_base64
            : "/avatars/shadcn.jpg",
        }
        if (!cancelled) setUser(nextUser)
        sessionStorage.setItem("user", JSON.stringify(nextUser))
      } catch {}
    }
    hydrateUser()
    return () => { cancelled = true }
  }, [])

  return (
    <>
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-[#6c5ce7] shadow-md shadow-[#6c5ce7]/30">
                {logoError ? (
                  <span className="text-sm font-black text-white">D</span>
                ) : (
                  <Image
                    src="/delvo-logo.png"
                    alt="Delvo logo"
                    width={32}
                    height={32}
                    className="size-8 object-contain"
                    onError={() => setLogoError(true)}
                    priority
                  />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate text-base font-black">Delvo</span>
                <span className="truncate text-[10px] uppercase tracking-widest text-sidebar-foreground/40">
                  {dictionary.sidebar.tagline}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} sectionLabel={dictionary.sidebar.sectionLabel} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    {currentPath !== "/stella" && <StellaWidget />}
    </>
  )
}
