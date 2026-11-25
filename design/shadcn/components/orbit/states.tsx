import Link from "next/link"
import { OctagonAlert, RotateCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { OrbitMark } from "@/components/orbit/orbit-mark"

export function NoAgents() {
  return (
    <Empty className="border border-dashed border-input">
      <EmptyHeader>
        <EmptyMedia>
          <OrbitMark mono className="size-10 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>No agents yet</EmptyTitle>
        <EmptyDescription>
          Your organization starts empty, and you decide who works here. Agents without a manager report directly to you.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/agents/new" />}>Create your first agent</Button>
      </EmptyContent>
    </Empty>
  )
}

export function BoardLoading() {
  return (
    <div className="flex gap-3" aria-busy="true" aria-label="Loading tasks">
      {[0, 1, 2].map((c) => (
        <div key={c} className="flex w-[264px] flex-col gap-2">
          <Skeleton className="h-8 w-32 animate-none" />
          <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full animate-none bg-card" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function BoardError() {
  return (
    <Alert variant="destructive">
      <OctagonAlert aria-hidden="true" />
      <AlertTitle>Tasks couldn’t load</AlertTitle>
      <AlertDescription>
        <p>The server didn’t respond within 10 seconds. Tasks already on screen are unchanged.</p>
        <Button variant="outline" size="sm" className="mt-2 text-foreground no-underline!" render={<Link href="/board" />}>
          <RotateCw aria-hidden="true" />
          Reload board
        </Button>
      </AlertDescription>
    </Alert>
  )
}
