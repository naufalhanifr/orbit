import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { BoardError, BoardLoading, NoAgents } from "@/components/orbit/states"

export const metadata: Metadata = { title: "Empty, loading and error states" }

export default function Page() {
  return (
    <AppShell title="Empty, loading and error states">
      <div className="grid gap-8 p-4 md:p-6">
        <section aria-labelledby="s1" className="flex flex-col gap-2">
          <h2 id="s1" className="text-sm font-medium">Empty: organization with no agents (the Founder’s first screen)</h2>
          <NoAgents />
        </section>
        <section aria-labelledby="s2" className="flex flex-col gap-2">
          <h2 id="s2" className="text-sm font-medium">Loading: task board</h2>
          <BoardLoading />
        </section>
        <section aria-labelledby="s3" className="flex flex-col gap-2">
          <h2 id="s3" className="text-sm font-medium">Error: task board failed to load</h2>
          <BoardError />
        </section>
      </div>
    </AppShell>
  )
}
