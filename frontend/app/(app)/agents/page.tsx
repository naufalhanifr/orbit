import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { AgentList } from "@/components/orbit/agents"

export const metadata: Metadata = { title: "Agents" }

export default function Page() {
  return (
    <AppShell title="Agents">
      <AgentList />
    </AppShell>
  )
}
