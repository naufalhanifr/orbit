import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { AgentList } from "@/components/orbit/agents"

export const metadata: Metadata = { title: "Agent" }

export default function Page() {
  return (
    <AppShell title="Agent">
      <AgentList />
    </AppShell>
  )
}
