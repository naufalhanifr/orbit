import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { AgentBuilder } from "@/components/orbit/agents"

export const metadata: Metadata = { title: "Edit agent" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <AppShell title="Edit agent">
      <AgentBuilder agentId={Number(id)} />
    </AppShell>
  )
}
