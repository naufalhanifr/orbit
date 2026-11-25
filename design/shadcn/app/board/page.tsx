import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { Board } from "@/components/orbit/board"

export const metadata: Metadata = { title: "Task board" }

export default function Page() {
  return (
    <AppShell title="Task board, ORBIT project">
      <Board />
    </AppShell>
  )
}
