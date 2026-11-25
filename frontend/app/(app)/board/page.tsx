import { Suspense } from "react"
import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { Board } from "@/components/orbit/board"
import { BoardLoading } from "@/components/orbit/states"

export const metadata: Metadata = { title: "Task board" }

export default function Page() {
  return (
    <AppShell title="Task board">
      <Suspense fallback={<div className="p-4 md:p-6"><BoardLoading /></div>}>
        <Board />
      </Suspense>
    </AppShell>
  )
}
