"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar"
import { useOrbit } from "@/components/orbit/orbit-context"
import { api, ApiError, type Project } from "@/lib/api"

export function CreateProjectForm({ onDone, footer }: { onDone?: () => void; footer?: React.ReactNode }) {
  const { reloadProjects, setProjectId } = useOrbit()
  const [error, setError] = React.useState<string | null>(null)
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        try {
          const p = await api<Project>("/projects", {
            body: { key: String(f.get("key")).trim().toUpperCase(), name: String(f.get("name")).trim() },
          })
          setProjectId(p.id)
          reloadProjects()
          onDone?.()
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Project couldn’t be created.")
        }
      }}
    >
      <FieldGroup className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="project-key">Key</FieldLabel>
          <Input
            id="project-key"
            name="key"
            required
            pattern="[A-Za-z][A-Za-z0-9]{1,9}"
            className="font-mono uppercase"
            aria-describedby="project-key-help"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="project-name">Name</FieldLabel>
          <Input id="project-name" name="name" required />
        </Field>
      </FieldGroup>
      {error ? <FieldError>{error}</FieldError> : null}
      <FieldDescription id="project-key-help">
        Key: 2 to 10 letters or digits, starting with a letter. Task IDs use it, for example ORB-12.
      </FieldDescription>
      {footer ?? <Button type="submit" className="w-fit">Create project</Button>}
    </form>
  )
}

export function ProjectSwitcher() {
  const { projects, project, setProjectId } = useOrbit()
  const [open, setOpen] = React.useState(false)
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Current project</SidebarGroupLabel>
      <SidebarGroupContent className="flex items-center gap-1">
        {projects?.length ? (
          <Select value={project?.id ?? null} onValueChange={(v) => v && setProjectId(Number(v))}>
            <SelectTrigger size="sm" className="min-w-0 flex-1" aria-label="Current project">
              <SelectValue>{() => (project ? `${project.key} · ${project.name}` : "")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.key} · {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="flex-1 px-2 text-xs text-muted-foreground">{projects ? "No projects yet" : "Loading…"}</p>
        )}
        <Button variant="ghost" size="icon-sm" aria-label="Create project" onClick={() => setOpen(true)}>
          <Plus aria-hidden="true" />
        </Button>
      </SidebarGroupContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>Tasks, chat and agent assignments belong to a project.</DialogDescription>
          </DialogHeader>
          <CreateProjectForm
            onDone={() => setOpen(false)}
            footer={
              <DialogFooter>
                <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
                <Button type="submit">Create project</Button>
              </DialogFooter>
            }
          />
        </DialogContent>
      </Dialog>
    </SidebarGroup>
  )
}
