import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { BoardError, BoardLoading, NoAgents } from "@/components/orbit/states"

export const metadata: Metadata = { title: "State kosong, memuat, gagal" }

export default function Page() {
  return (
    <AppShell title="State kosong, memuat, gagal">
      <div className="grid gap-8 p-4 md:p-6">
        <section aria-labelledby="s1" className="flex flex-col gap-2">
          <h2 id="s1" className="text-sm font-medium">Kosong: organisasi tanpa agent (layar pertama Founder)</h2>
          <NoAgents />
        </section>
        <section aria-labelledby="s2" className="flex flex-col gap-2">
          <h2 id="s2" className="text-sm font-medium">Memuat: papan task</h2>
          <BoardLoading />
        </section>
        <section aria-labelledby="s3" className="flex flex-col gap-2">
          <h2 id="s3" className="text-sm font-medium">Gagal: papan task tidak bisa dimuat</h2>
          <BoardError />
        </section>
      </div>
    </AppShell>
  )
}
