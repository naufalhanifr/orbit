import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { Board } from "@/components/orbit/board"

export const metadata: Metadata = { title: "Papan task" }

export default function Page() {
  return (
    <AppShell title="Papan task, proyek ORBIT">
      <Board />
    </AppShell>
  )
}
