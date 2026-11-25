import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { OrgChart } from "@/components/orbit/org-chart"

export const metadata: Metadata = { title: "Org chart" }

export default function Page() {
  return (
    <AppShell title="Org chart">
      <OrgChart />
    </AppShell>
  )
}
