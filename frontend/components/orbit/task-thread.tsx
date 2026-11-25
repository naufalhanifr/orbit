"use client"

import * as React from "react"
import { ArrowUp, AtSign, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { useProjectAgents } from "@/components/orbit/assignee-select"
import { useActor } from "@/components/orbit/orbit-context"
import { EXEC_STATUS, StatusBadge } from "@/components/orbit/status"
import { api, ApiError, formatTime, useApi, type Execution, type Message } from "@/lib/api"

/**
 * Task thread = comments = chat with agents (PRD 17.4). Mentions are picked in the UI and sent
 * as agent ids; the backend routes them:
 * - mentioning the assignee while its execution is active: extra instruction to that execution
 * - mentioning another agent (or an idle assignee): new queued execution
 * - no mention: a note, not read by agents until they are next invoked
 */
function routeNote(m: Message, executions: Execution[], name: (id: number) => string) {
  if (!m.mentions.length) return { text: "Note only. Agents won’t read it until they are next invoked.", started: [] }
  const started = executions.filter((e) => e.trigger_message_id === m.id)
  const instructed = m.mentions.filter((id) => !started.some((e) => e.agent_id === id))
  return {
    text: instructed.length ? `Sent to the running execution of ${instructed.map(name).join(", ")} as an extra instruction.` : "",
    started,
  }
}

function Body({ text, names }: { text: string; names: string[] }) {
  if (!names.length) return <>{text}</>
  const esc = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const parts = text.split(new RegExp(`(@(?:${esc.join("|")}))`))
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} className="rounded-sm bg-muted px-0.5 font-medium">
            {p}
          </span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  )
}

/** One thread: a task's comments (`/tasks/{id}`) or the Project Chat (`/projects/{id}`). */
export function TaskThread({
  path,
  label,
  assigneeId,
  executions,
  onSent,
  title = "Comments and chat",
}: {
  path: string
  label: string
  assigneeId?: number | null
  executions: Execution[]
  onSent: () => void
  title?: string
}) {
  const messages = useApi<Message[]>(`${path}/messages`, 10_000)
  const agents = useProjectAgents()
  const actor = useActor()
  const [draft, setDraft] = React.useState("")
  const [mentions, setMentions] = React.useState<number[]>([])
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const textRef = React.useRef<HTMLTextAreaElement>(null)
  const items = messages.data ?? []
  const name = (id: number) => actor(id).name

  const send = async () => {
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      await api<Message>(`${path}/messages`, { body: { body, mentions } })
      setDraft("")
      setMentions([])
      setError(null)
      messages.reload()
      onSent()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Comment wasn’t sent.")
    } finally {
      setBusy(false)
    }
  }

  const addMention = (id: number) => {
    setMentions((m) => (m.includes(id) ? m : [...m, id]))
    setDraft((d) => `${d.replace(/@$/, "")}${d && !/[\s@]$/.test(d) ? " " : ""}@${name(id)} `)
    setPickerOpen(false)
  }

  return (
    <section aria-labelledby="thread" className="flex flex-col gap-3">
      <h2 id="thread" className="text-sm font-medium">
        {title}
      </h2>
      {messages.error && !messages.data ? (
        <p role="alert" className="text-xs text-destructive">
          {messages.error.message}
        </p>
      ) : items.length ? (
        <ol className="flex flex-col gap-4" aria-live="polite">
          {items.map((m) => {
            const a = actor(m.author_id)
            const note = routeNote(m, executions, name)
            return (
              <li key={m.id} className="flex gap-2.5">
                <ActorAvatar actor={a} size="sm" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex items-baseline gap-2 text-xs">
                    <span className="font-medium">{a.name}</span>
                    {a.kind === "agent" ? <span className="text-muted-foreground">Agent</span> : null}
                    <span className="font-mono text-muted-foreground">{formatTime(m.created_at)}</span>
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    <Body text={m.body} names={m.mentions.map(name)} />
                  </p>
                  {note.started.map((e) => (
                    <p key={e.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      Started execution <span className="font-mono">#{e.id}</span> for {name(e.agent_id)}
                      <StatusBadge def={EXEC_STATUS[e.status]} />
                    </p>
                  ))}
                  {note.text ? <p className="text-xs text-muted-foreground">{note.text}</p> : null}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground">
          {messages.loading ? "Loading comments…" : "No comments yet. Mention an agent to give it instructions."}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="flex flex-col gap-2"
      >
        {mentions.length ? (
          <ul aria-label="Agents mentioned" className="flex flex-wrap gap-1.5">
            {mentions.map((id) => (
              <li key={id}>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-label={`Remove mention of ${name(id)}`}
                  onClick={() => setMentions((m) => m.filter((x) => x !== id))}
                >
                  @{name(id)}
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <InputGroup>
          <InputGroupTextarea
            ref={textRef}
            aria-label={`Message in ${label}`}
            placeholder="Write a comment. Mention an agent to invoke it."
            rows={2}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (e.target.value.endsWith("@")) setPickerOpen(true)
            }}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter adds a line. Ignore Enter while an IME is composing.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                send()
              }
            }}
          />
          <InputGroupAddon align="block-end">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger render={<InputGroupButton variant="ghost" size="sm" type="button" />}>
                <AtSign aria-hidden="true" />
                Mention agent
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-0" finalFocus={textRef}>
                <Command>
                  <CommandInput placeholder="Search agents in this project" aria-label="Search agents to mention" />
                  <CommandList>
                    <CommandEmpty>No agent with that name in this project.</CommandEmpty>
                    <CommandGroup heading="Agents in this project">
                      {agents.map((a) => (
                        <CommandItem
                          key={a.id}
                          value={a.name}
                          disabled={["paused", "error"].includes(a.status)}
                          onSelect={() => addMention(a.id)}
                          className="gap-2"
                        >
                          <ActorAvatar actor={{ name: a.name, kind: "agent" }} size="sm" className="size-5" />
                          <span className="flex-1">{a.name}</span>
                          <span className="text-muted-foreground">{a.id === assigneeId ? "Assignee" : a.title}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <span className="hidden text-xs text-muted-foreground sm:inline">Enter to send</span>
            <InputGroupButton variant="default" size="icon-sm" type="submit" className="ml-auto" aria-label="Send comment" disabled={busy}>
              <ArrowUp aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  )
}
