"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon, Calendar03Icon, House, Settings01Icon } from "@hugeicons/core-free-icons"

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
  const dictionary = getDictionary(language)
  const currentPath = stripLanguagePrefix(pathname ?? "/")

  const navMain = [
    {
      title: dictionary.sidebar.home,
      url: withLanguagePrefix("/home", language),
      icon: <HugeiconsIcon icon={House} strokeWidth={2} />,
      isActive: currentPath === "/home",
    },
    {
      title: dictionary.sidebar.planner,
      url: withLanguagePrefix("/planner", language),
      icon: <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} />,
      isActive: currentPath === "/planner",
    },
    {
      title: dictionary.sidebar.calendar,
      url: withLanguagePrefix("/calendar", language),
      icon: <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} />,
      isActive: currentPath === "/calendar",
    },
    {
      title: dictionary.sidebar.settings,
      url: withLanguagePrefix("/settings", language),
      icon: <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />,
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
          if (
            typeof parsedUser.name === "string" &&
            typeof parsedUser.email === "string" &&
            typeof parsedUser.avatar === "string"
          ) {
            if (!cancelled) {
              setUser(parsedUser as SidebarUser)
            }
          }
        } catch {
          
        }
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
          avatar:
            typeof payload.user?.profile_photo_base64 === "string" && payload.user.profile_photo_base64.length > 0
              ? payload.user.profile_photo_base64
              : "/avatars/shadcn.jpg",
        }

        if (!cancelled) {
          setUser(nextUser)
        }
        sessionStorage.setItem("user", JSON.stringify(nextUser))
      } catch {
        
      }
    }

    hydrateUser()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary/10">
                {logoError ? (
                  <span className="text-sm font-bold text-sidebar-primary">D</span>
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
                <span className="truncate text-base font-semibold">Delvo</span>
                <span className="truncate text-xs text-sidebar-foreground/60 ">
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
  )
}
