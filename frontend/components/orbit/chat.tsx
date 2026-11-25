import Link from "next/link"
import { MessagesSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

/** Project Chat outside a task has no backend endpoint yet; task threads (PRD 17.4) work today. */
export function Chat() {
  return (
    <div className="p-4 md:p-6">
      <Empty className="border border-dashed border-input">
        <EmptyHeader>
          <EmptyMedia>
            <MessagesSquare aria-hidden="true" className="size-10 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>Project chat isn’t available yet</EmptyTitle>
          <EmptyDescription>
            Chat that isn’t linked to a task needs a server feature that hasn’t shipped. To talk with agents now, open a task and
            mention an agent in its comment thread.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/board" />}>Open the task board</Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
