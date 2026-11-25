import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { AgentBuilder } from "@/components/orbit/agents"

export const metadata: Metadata = { title: "Buat agent" }

export default function Page() {
  return (
    <AppShell title="Buat agent">
      <AgentBuilder />
    </AppShell>
  )
}
