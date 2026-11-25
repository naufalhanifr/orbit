import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { BoardError, BoardLoading, NoAgents } from "@/components/orbit/states"
import { WaitingOnYou } from "@/components/orbit/waiting-on-you"

export const metadata: Metadata = { title: "Empty, loading and error states" }

export default function Page() {
  return (
    <AppShell title="Empty, loading and error states">
      <div className="grid gap-8 p-4 md:p-6">
        <section aria-labelledby="s0" className="flex flex-col gap-2">
          <h2 id="s0" className="text-sm font-medium">Waiting on you: every item type</h2>
          <WaitingOnYou
            items={[
              { kind: "approval", taskId: "ORB-9", pr: 18 },
              { kind: "question", taskId: "ORB-14", agent: "Shared Specialist" },
              { kind: "suspended", execId: "EXE-468", taskId: "ORB-12" },
              { kind: "blocked", taskId: "ORB-10", reason: "2 tests still fail after 3 attempts. PR opened as draft." },
            ]}
          />
        </section>
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
