"use client"

import * as React from "react"
import Link from "next/link"
import { CircleCheck, Plus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { AGENT_STATUS, StatusBadge } from "@/components/orbit/status"
import { actorById, agents, projects } from "@/lib/orbit-data"

export function AgentList() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{agents.length} agents. Agents without an agent manager report directly to the Founder.</p>
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
              <TableHead>Fixed manager</TableHead>
              <TableHead>Per-project managers</TableHead>
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
                <TableCell><StatusBadge def={AGENT_STATUS[a.status]} progress={0.28} /></TableCell>
                <TableCell>{actorById(a.managerId)?.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {a.projectManagers
                    ? Object.entries(a.projectManagers).map(([p, m]) => `${p} → ${actorById(m)?.name}`).join(", ")
                    : "None"}
                </TableCell>
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

const managers = [{ id: "founder", name: "Founder (direct)" }, ...agents.map((a) => ({ id: a.id, name: `${a.name}, ${a.title}` }))]

export function AgentBuilder() {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saved, setSaved] = React.useState(false)
  const [instructions, setInstructions] = React.useState("")
  const [manager, setManager] = React.useState<string | null>("founder")

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
        if (!instructions.trim()) next.instructions = "Enter instructions. The agent works only from these."
        const limit = Number(String(f.get("limit") ?? "").replace(/\D/g, ""))
        if (!limit || limit > 300000) next.limit = "Enter a number from 1 to 300,000 (the default per-execution limit)."
        setErrors(next)
        setSaved(Object.keys(next).length === 0)
      }}
    >
      {saved ? (
        <Alert>
          <CircleCheck aria-hidden="true" />
          <AlertTitle>Agent saved as Draft, instructions v1.</AlertTitle>
          <AlertDescription>It becomes Ready automatically when its first task moves to Assigned.</AlertDescription>
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
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="manager">Fixed manager</FieldLabel>
            <Select value={manager} onValueChange={(v) => setManager(v as string | null)}>
              <SelectTrigger id="manager" className="w-full">
                <SelectValue>{(v: string) => managers.find((m) => m.id === v)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>Choose Founder if the agent reports directly to the Founder.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Per-project managers</FieldLabel>
            <div className="flex flex-col gap-2">
              {projects.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <Label htmlFor={`pm-${p.key}`} className="w-20 shrink-0 font-mono text-muted-foreground">{p.key}</Label>
                  <Select defaultValue={null}>
                    <SelectTrigger id={`pm-${p.key}`} className="w-full">
                      <SelectValue>{(v: string | null) => (v ? managers.find((m) => m.id === v)?.name : "Use fixed manager")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Use fixed manager</SelectItem>
                      {managers.slice(1).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <FieldDescription>A per-project manager decides where work reports go for tasks in that project.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Runtime</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="model">Model</FieldLabel>
            <Select defaultValue="Claude Sonnet">
              <SelectTrigger id="model" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Claude Sonnet">Claude Sonnet</SelectItem>
                <SelectItem value="Claude Opus">Claude Opus</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={!!errors.limit || undefined}>
            <FieldLabel htmlFor="limit">Token limit per execution</FieldLabel>
            <InputGroup>
              <InputGroupInput id="limit" name="limit" inputMode="numeric" defaultValue="300,000" className="font-mono tabular-nums" aria-invalid={!!errors.limit || undefined} />
              <InputGroupAddon align="inline-end"><InputGroupText>tokens</InputGroupText></InputGroupAddon>
            </InputGroup>
            {errors.limit ? <FieldError>{errors.limit}</FieldError> : <FieldDescription>The execution stops automatically when it reaches this limit.</FieldDescription>}
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel id="preset-label">Tool permission preset</FieldLabel>
          <RadioGroup defaultValue="read-only" aria-labelledby="preset-label" className="grid gap-2 md:grid-cols-2">
            {[
              { v: "read-only", t: "read-only", d: "Reads the repo and documents. Cannot change code." },
              { v: "coding", t: "coding", d: "Changes code, runs tests and opens PRs in the project repo." },
            ].map((o) => (
              <Label key={o.v} htmlFor={`preset-${o.v}`} className="flex items-start gap-3 rounded-lg p-3 ring-1 ring-input has-data-checked:ring-2 has-data-checked:ring-ring">
                <RadioGroupItem id={`preset-${o.v}`} value={o.v} className="mt-0.5" />
                <span className="flex flex-col gap-1">
                  <span className="font-mono font-medium">{o.t}</span>
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
