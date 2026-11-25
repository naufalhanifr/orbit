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
        <EmptyTitle>Belum ada agent</EmptyTitle>
        <EmptyDescription>
          Organisasi dimulai kosong, dan kamu yang menentukan siapa saja yang bekerja di sini. Agent tanpa atasan melapor langsung kepadamu.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/agents/new" />}>Buat agent pertama</Button>
      </EmptyContent>
    </Empty>
  )
}

export function BoardLoading() {
  return (
    <div className="flex gap-3" aria-busy="true" aria-label="Memuat task">
      {[0, 1, 2].map((c) => (
        <div key={c} className="flex w-[264px] flex-col gap-2">
          <Skeleton className="h-8 w-32 animate-none" />
          <div className="flex flex-col gap-2 bg-muted/60 p-2">
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
      <AlertTitle>Task tidak bisa dimuat</AlertTitle>
      <AlertDescription>
        <p>ORBIT tidak mendapat jawaban dari server dalam 10 detik. Task yang sudah tampil tidak berubah.</p>
        <Button variant="outline" size="sm" className="mt-2 text-foreground no-underline" render={<Link href="/board" />}>
          <RotateCw aria-hidden="true" />
          Muat ulang papan
        </Button>
      </AlertDescription>
    </Alert>
  )
}
