"use client"

import * as React from "react"
import { ArrowUp, AtSign, Search } from "lucide-react"

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group"
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { EXEC_STATUS, StatusBadge } from "@/components/orbit/status"
import { agents, byId, founder, tasks, type Actor, type ExecStatus } from "@/lib/orbit-data"
import { cn } from "@/lib/utils"

type Msg = {
  id: number
  author: Actor
  text: string
  time: string
  exec?: { id: string; status: ExecStatus; tokens: number }
  note?: string
}

const spec = byId(agents, "spec")!
const projectAgents = agents.filter((a) => ["spec", "po1", "cto"].includes(a.id))

const seedMessages: Msg[] = [
  { id: 1, author: founder, time: "10:31", text: "@Shared Specialist kerjakan revisi ORB-14 sesuai feedback di PR #19." },
  { id: 2, author: spec, time: "10:31", text: "Mulai revisi ORB-14 di branch orb-14-org-chart.", exec: { id: "EXE-477", status: "running", tokens: 3100 } },
  {
    id: 3,
    author: spec,
    time: "10:40",
    text: "Label proyek bisa diletakkan di tengah garis atau di ujung dekat node bawahan. Di tengah garis, label bertumpuk saat dua garis bersilangan. Mana yang dipakai?",
    exec: { id: "EXE-477", status: "waiting", tokens: 52300 },
  },
]

const conversations = [
  { id: "c1", title: "ORB-14 Org chart matriks", meta: "Menunggu jawabanmu", needsYou: true },
  { id: "c2", title: "Umum, proyek ORBIT", meta: "Kemarin" },
  { id: "c3", title: "ORB-10 Rate limit login", meta: "Senin" },
]

export function Chat() {
  const [messages, setMessages] = React.useState(seedMessages)
  const [draft, setDraft] = React.useState("")
  const [mentionOpen, setMentionOpen] = React.useState(false)
  const [context, setContext] = React.useState<string | null>("ORB-14")
  const [active, setActive] = React.useState("c1")
  const textRef = React.useRef<HTMLTextAreaElement>(null)
  const endRef = React.useRef<HTMLLIElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length])

  const insertMention = (name: string) => {
    setDraft((d) => d.replace(/@$/, "") + `@${name} `)
    setMentionOpen(false)
    requestAnimationFrame(() => textRef.current?.focus())
  }

  const send = () => {
    const text = draft.trim()
    if (!text) return
    const mentioned = projectAgents.some((a) => text.includes(`@${a.name}`))
    setMessages((m) => [
      ...m,
      {
        id: m.length + 1,
        author: founder,
        time: "10:44",
        text,
        note: mentioned ? undefined : "Tidak ada agent yang dipanggil. Pesan tersimpan tanpa memulai execution.",
      },
    ])
    setDraft("")
  }

  return (
    <div className="grid h-[calc(100svh-3rem)] grid-cols-1 md:grid-cols-[272px_1fr]">
      <aside aria-label="Percakapan" className="hidden flex-col gap-2 border-r p-3 md:flex">
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput aria-label="Cari percakapan" placeholder="Cari percakapan" />
        </InputGroup>
        <nav className="flex flex-col gap-1">
          {conversations.map((c) => (
            <Item
              key={c.id}
              size="sm"
              variant={active === c.id ? "muted" : "default"}
              render={<button type="button" onClick={() => setActive(c.id)} aria-current={active === c.id ? "true" : undefined} />}
              className="text-left"
            >
              <ItemContent>
                <ItemTitle className={cn(active === c.id && "underline decoration-1 underline-offset-4")}>{c.title}</ItemTitle>
                <ItemDescription className={cn(c.needsYou && "text-task-founder-approval-foreground")}>{c.meta}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </nav>
      </aside>

      <section aria-label="Percakapan ORB-14" className="flex min-h-0 flex-col">
        <ol className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-6" aria-live="polite">
          {messages.map((m) => (
            <li key={m.id} className="flex gap-3">
              <ActorAvatar actor={m.author} size="sm" />
              <div className="flex min-w-0 max-w-prose flex-col gap-1.5">
                <p className="flex items-baseline gap-2 text-xs">
                  <span className="font-medium">{m.author.name}</span>
                  {m.author.kind === "agent" ? <span className="text-muted-foreground">Agent</span> : null}
                  <span className="font-mono text-muted-foreground">{m.time}</span>
                </p>
                <p className="text-sm leading-relaxed">
                  {m.text.split(/(@(?:Shared Specialist|PO 1|CTO))/).map((part, i) =>
                    part.startsWith("@") ? (
                      <span key={i} className="bg-muted px-0.5 font-medium">{part}</span>
                    ) : (
                      <React.Fragment key={i}>{part}</React.Fragment>
                    )
                  )}
                </p>
                {m.exec ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <StatusBadge def={EXEC_STATUS[m.exec.status]} progress={m.exec.tokens / 300000} />
                    <span className="font-mono">{m.exec.id}</span>
                    <span className="font-mono tabular-nums">{m.exec.tokens.toLocaleString("id-ID")} token</span>
                  </div>
                ) : null}
                {m.note ? <p className="text-xs text-muted-foreground">{m.note}</p> : null}
              </div>
            </li>
          ))}
          <li ref={endRef} aria-hidden="true" />
        </ol>

        <form
          className="relative flex flex-col gap-2 border-t p-3 md:p-4"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          {mentionOpen ? (
            <div className="absolute bottom-full left-3 z-20 mb-1 w-72 bg-popover shadow-md ring-1 ring-foreground/10 md:left-4">
              <Command
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault()
                    setMentionOpen(false)
                    textRef.current?.focus()
                  }
                }}
              >
                <CommandInput autoFocus placeholder="Cari agent di proyek ini" aria-label="Cari agent untuk dipanggil" />
                <CommandList>
                  <CommandEmpty>Tidak ada agent dengan nama itu di proyek ini.</CommandEmpty>
                  <CommandGroup heading="Agent di proyek ORBIT">
                    {projectAgents.map((a) => (
                      <CommandItem key={a.id} value={a.name} onSelect={() => insertMention(a.name)} className="gap-2">
                        <ActorAvatar actor={a} size="sm" className="size-5" />
                        <span className="flex-1">{a.name}</span>
                        <span className="text-muted-foreground">{a.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Konteks task</span>
            <Select value={context} onValueChange={(v) => setContext(v as string | null)}>
              <SelectTrigger size="sm" aria-label="Task yang menjadi konteks" className="w-auto min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tasks
                  .filter((t) => t.status !== "cancelled")
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.id} {t.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <InputGroup>
            <InputGroupTextarea
              ref={textRef}
              value={draft}
              aria-label="Tulis pesan"
              placeholder="Panggil agent dengan @nama. Agent hanya bekerja saat kamu panggil."
              rows={2}
              onChange={(e) => {
                setDraft(e.target.value)
                if (e.target.value.endsWith("@")) setMentionOpen(true)
              }}
              onKeyDown={(e) => {
                // Enter kirim, Shift+Enter baris baru. Abaikan Enter yang sedang dipakai IME.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton variant="ghost" size="sm" type="button" onClick={() => setMentionOpen(true)}>
                <AtSign aria-hidden="true" />
                Panggil agent
              </InputGroupButton>
              <InputGroupButton variant="default" size="icon-sm" type="submit" className="ml-auto" aria-label="Kirim pesan">
                <ArrowUp aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </section>
    </div>
  )
}
