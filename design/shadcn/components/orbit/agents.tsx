"use client"

import * as React from "react"
import Link from "next/link"
import { CircleCheck, Plus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { AGENT_STATUS, StatusBadge } from "@/components/orbit/status"
import { actorById, agents, projects, runningExecution, usage, type Agent } from "@/lib/orbit-data"

const worksInLabel = (a: Agent) =>
  a.worksIn === "all" ? "All projects" : a.worksIn.map((k) => projects.find((p) => p.key === k)?.name ?? k).join(", ")

export function AgentList() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{agents.length} agents. New agents report directly to the Founder until you pick an agent manager.</p>
        <Button className="ml-auto" render={<Link href="/agents/new" />}>
          <Plus aria-hidden="true" />
          Create agent
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reports to</TableHead>
              <TableHead>Works in</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Instructions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <ActorAvatar actor={a} size="sm" />
                    <span className="flex flex-col">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-muted-foreground">{a.title}</span>
                    </span>
                  </span>
                </TableCell>
                <TableCell><StatusBadge def={AGENT_STATUS[a.status]} progress={runningExecution.minutes / usage.timeoutMinutes} /></TableCell>
                <TableCell>
                  <span className="flex flex-col">
                    <span>{actorById(a.managerId)?.name}</span>
                    {a.projectManagers ? (
                      <span className="text-muted-foreground">
                        {Object.entries(a.projectManagers).map(([p, m]) => `${p}: ${actorById(m)?.name}`).join(", ")}
                      </span>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell>{worksInLabel(a)}</TableCell>
                <TableCell>{a.model}</TableCell>
                <TableCell className="font-mono">{a.preset}</TableCell>
                <TableCell className="text-right font-mono">v{a.instructionVersion}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function AgentBuilder() {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saved, setSaved] = React.useState<string | null>(null)
  const [instructions, setInstructions] = React.useState("")
  const [manager, setManager] = React.useState<string | null>(null)
  const [scope, setScope] = React.useState("selected")
  const [selected, setSelected] = React.useState<string[]>([])

  return (
    <form
      noValidate
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 md:p-6"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const next: Record<string, string> = {}
        if (!String(f.get("name") ?? "").trim()) next.name = "Enter a name."
        if (!String(f.get("title") ?? "").trim()) next.title = "Enter a title."
        if (scope === "selected" && !selected.length) next.worksIn = "Pick at least one project, or choose All projects."
        if (!instructions.trim()) next.instructions = "Enter instructions. The agent works only from these."
        setErrors(next)
        setSaved(
          Object.keys(next).length
            ? null
            : `It starts as Idle and reports to ${manager ? actorById(manager)?.name : "the Founder"}.`
        )
      }}
    >
      {saved ? (
        <Alert>
          <CircleCheck aria-hidden="true" />
          <AlertTitle>Agent saved with instructions v1.</AlertTitle>
          <AlertDescription>{saved}</AlertDescription>
        </Alert>
      ) : null}

      <FieldSet>
        <FieldLegend>Identity</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={!!errors.name || undefined}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" name="name" aria-invalid={!!errors.name || undefined} />
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </Field>
          <Field data-invalid={!!errors.title || undefined}>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input id="title" name="title" aria-invalid={!!errors.title || undefined} />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Structure</FieldLegend>
        <FieldGroup className="grid gap-6 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="manager">Reports to</FieldLabel>
            <Select value={manager} onValueChange={(v) => setManager(v as string | null)}>
              <SelectTrigger id="manager" className="w-full">
                <SelectValue>{(v: string | null) => (v ? actorById(v)?.name : "No agent manager")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No agent manager</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}, {a.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Without an agent manager, the agent sits directly under the Founder. Per-project managers are set on the project assignment.
            </FieldDescription>
          </Field>
          <Field data-invalid={!!errors.worksIn || undefined}>
            <FieldLabel id="works-in-label">Works in</FieldLabel>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as string)} aria-labelledby="works-in-label" className="gap-2">
              <Label htmlFor="scope-selected" className="flex items-center gap-2 font-normal">
                <RadioGroupItem id="scope-selected" value="selected" />
                Selected projects
              </Label>
              {scope === "selected" ? (
                <div className="ml-6 flex flex-col gap-2" role="group" aria-label="Projects">
                  {projects.map((p) => (
                    <Label key={p.key} htmlFor={`project-${p.key}`} className="flex items-center gap-2 font-normal">
                      <Checkbox
                        id={`project-${p.key}`}
                        checked={selected.includes(p.key)}
                        onCheckedChange={(on) => setSelected((s) => (on ? [...s, p.key] : s.filter((k) => k !== p.key)))}
                        aria-invalid={!!errors.worksIn || undefined}
                      />
                      {p.name} <span className="font-mono text-muted-foreground">{p.key}</span>
                    </Label>
                  ))}
                </div>
              ) : null}
              <Label htmlFor="scope-all" className="flex items-center gap-2 font-normal">
                <RadioGroupItem id="scope-all" value="all" />
                All projects, including ones created later
              </Label>
            </RadioGroup>
            {errors.worksIn ? <FieldError>{errors.worksIn}</FieldError> : <FieldDescription>The agent can only be assigned tasks in these projects.</FieldDescription>}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Runtime</FieldLegend>
        <Field>
          <FieldLabel htmlFor="model">Model</FieldLabel>
          <Select defaultValue="Claude Sonnet">
            <SelectTrigger id="model" className="w-full md:w-1/2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Claude Sonnet">Claude Sonnet</SelectItem>
              <SelectItem value="Claude Opus">Claude Opus</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel id="preset-label">Tool permission preset</FieldLabel>
          <RadioGroup defaultValue="read-only" aria-labelledby="preset-label" className="grid gap-2 md:grid-cols-2">
            {[
              { v: "read-only", d: "Reads the repo and documents. Cannot change code." },
              { v: "coding", d: "Changes code, runs tests and opens PRs in the project repo." },
            ].map((o) => (
              <Label key={o.v} htmlFor={`preset-${o.v}`} className="flex items-start gap-3 rounded-lg p-3 ring-1 ring-input has-data-checked:ring-2 has-data-checked:ring-ring">
                <RadioGroupItem id={`preset-${o.v}`} value={o.v} className="mt-0.5" />
                <span className="flex flex-col gap-1">
                  <span className="font-mono font-medium">{o.v}</span>
                  <span className="font-normal text-muted-foreground">{o.d}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Instructions</FieldLegend>
        <Field data-invalid={!!errors.instructions || undefined}>
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <Textarea
                id="instructions"
                aria-label="Agent instructions in markdown"
                aria-invalid={!!errors.instructions || undefined}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={10}
                className="font-mono"
                placeholder={"# Role\nDescribe responsibilities, limits and the definition of done."}
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-40 rounded-md p-3 text-sm whitespace-pre-wrap ring-1 ring-input">
                {instructions || <span className="text-muted-foreground">No instructions yet.</span>}
              </div>
            </TabsContent>
          </Tabs>
          {errors.instructions ? <FieldError>{errors.instructions}</FieldError> : <FieldDescription>Every save creates a new version. Every execution records the version it used.</FieldDescription>}
        </Field>
      </FieldSet>

      <div className="flex items-center gap-2 border-t pt-4">
        <Button type="submit">Save agent</Button>
        <Button variant="ghost" render={<Link href="/agents" />}>Cancel</Button>
      </div>
    </form>
  )
}
