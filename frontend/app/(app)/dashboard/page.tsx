import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { Dashboard } from "@/components/orbit/dashboard"

export const metadata: Metadata = { title: "Tokens and executions" }

export default function Page() {
  return (
    <AppShell title="Tokens and executions">
      <Dashboard />
    </AppShell>
  )
}
