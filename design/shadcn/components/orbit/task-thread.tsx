"use client"

import * as React from "react"
import { ArrowUp } from "lucide-react"

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { actorById, agents, taskThreads, type Comment, type Task } from "@/lib/orbit-data"

/**
 * Thread task = komentar = chat dengan agent (PRD 17.4, v1.12).
 * Aturan saat execution berjalan:
 * - mention assignee yang sedang bekerja: instruksi tambahan ke execution yang sama
 * - mention agent lain: invocation baru
 * - tanpa mention: catatan, tidak dibaca agent sampai dipanggil
 */
function routeNote(text: string, task: Task) {
  const mentioned = agents.filter((a) => text.includes(`@${a.name}`))
  if (!mentioned.length) return "Catatan. Agent tidak membacanya sampai dipanggil berikutnya."
  const running = task.status === "in-progress"
  if (running && mentioned.some((a) => a.id === task.assigneeId))
    return "Dikirim ke execution yang sedang berjalan sebagai instruksi tambahan."
  return `Memulai invocation baru untuk ${mentioned.map((a) => a.name).join(", ")}.`
}

export function TaskThread({ task }: { task: Task }) {
  const [items, setItems] = React.useState<Comment[]>(taskThreads[task.id] ?? [])
  const [draft, setDraft] = React.useState("")
  const send = () => {
    const text = draft.trim()
    if (!text) return
    setItems((c) => [...c, { id: c.length + 1, authorId: "founder", time: "Baru saja", text, note: routeNote(text, task) }])
    setDraft("")
  }
  return (
    <section aria-labelledby="thread" className="flex flex-col gap-3">
      <h2 id="thread" className="text-sm font-medium">Komentar dan chat</h2>
      {items.length ? (
        <ol className="flex flex-col gap-4" aria-live="polite">
          {items.map((c) => {
            const a = actorById(c.authorId)!
            return (
              <li key={c.id} className="flex gap-2.5">
                <ActorAvatar actor={a} size="sm" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex items-baseline gap-2 text-xs">
                    <span className="font-medium">{a.name}</span>
                    {a.kind === "agent" ? <span className="text-muted-foreground">Agent</span> : null}
                    <span className="font-mono text-muted-foreground">{c.time}</span>
                  </p>
                  <p className="text-sm leading-relaxed">{c.text}</p>
                  {c.note ? <p className="text-xs text-muted-foreground">{c.note}</p> : null}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada komentar. Panggil agent dengan @nama untuk memberi instruksi.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <InputGroup>
          <InputGroupTextarea
            aria-label={`Komentar untuk ${task.id}`}
            placeholder="Tulis komentar. @nama untuk memanggil agent."
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                send()
              }
            }}
          />
          <InputGroupAddon align="block-end">
            <span className="text-xs text-muted-foreground">Enter kirim, Shift+Enter baris baru</span>
            <InputGroupButton variant="default" size="icon-sm" type="submit" className="ml-auto" aria-label="Kirim komentar">
              <ArrowUp aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </section>
  )
}
