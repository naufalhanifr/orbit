"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Bot, ChartColumn, KanbanSquare, LogOut, MessagesSquare, Moon, Network, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { OrbitWordmark } from "@/components/orbit/orbit-mark"
import { useOrbit } from "@/components/orbit/orbit-context"
import { ProjectSwitcher } from "@/components/orbit/projects"
import { api, useApi, type WaitingItem } from "@/lib/api"

const NAV = [
  {
    label: "Project",
    items: [
      { href: "/board", label: "Task board", icon: KanbanSquare, waiting: true },
      { href: "/chat", label: "Project chat", icon: MessagesSquare },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/agents", label: "Agents", icon: Bot },
      { href: "/org", label: "Org chart", icon: Network },
    ],
  },
  {
    label: "Cost",
    items: [{ href: "/dashboard", label: "Tokens and executions", icon: ChartColumn }],
  },
]

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // Icon is picked in CSS (dark: classes) so server and client render the same markup.
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle light or dark theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon aria-hidden="true" className="dark:hidden" />
      <Sun aria-hidden="true" className="hidden dark:block" />
    </Button>
  )
}

export function AppShell({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname()
  const { me, waitingTick } = useOrbit()
  const waitingPath = me ? `/waiting-on-you?t=${waitingTick}` : null
  const waiting = useApi<WaitingItem[]>(waitingPath, 30_000).data?.length ?? 0
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-4">
          <Link href="/board" aria-label="ORBIT, go to task board" className="w-fit">
            <OrbitWordmark />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <ProjectSwitcher />
          {NAV.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const active = pathname.startsWith(item.href)
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={item.label}
                          className="data-active:font-medium"
                          render={<Link href={item.href} aria-current={active ? "page" : undefined} />}
                        >
                          <item.icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {"waiting" in item && waiting ? (
                          <SidebarMenuBadge
                            aria-label={`${waiting} items waiting on you`}
                            className="bg-task-founder-approval-subtle text-task-founder-approval-foreground"
                          >
                            {waiting}
                          </SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="border-t p-3">
          <div className="flex items-center gap-2">
            <ActorAvatar actor={{ name: me?.name ?? "Founder", kind: "human" }} size="sm" />
            <div className="min-w-0 flex-1 text-xs">
              <p className="truncate font-medium">{me?.name ?? "Founder"}</p>
              <p className="truncate text-muted-foreground">{me?.email}</p>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={async () => {
                await api("/auth/logout", { method: "POST" }).catch(() => {})
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload clears session state
                window.location.assign("/login")
              }}
            >
              <LogOut aria-hidden="true" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" aria-label="Open or close navigation" />
          <h1 className="min-w-0 truncate text-sm font-medium">{title}</h1>
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
