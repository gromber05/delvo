import { AppSidebar } from "@/components/app-sidebar"
import { SettingsView } from "@/components/settings-view"
import { getDictionary } from "@/lib/dictionary"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ language: string }>
}) {
  const { language } = await params
  const dictionary = getDictionary(language)

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="h-full min-h-0 overflow-hidden bg-linear-to-b from-background to-background/80">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-background/70 backdrop-blur-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{dictionary.sidebar.settings}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SettingsView />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
