import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { Dashboard } from "@/components/orbit/dashboard"

export const metadata: Metadata = { title: "Token dan execution" }

export default function Page() {
  return (
    <AppShell title="Token dan execution">
      <Dashboard />
    </AppShell>
  )
}
