"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOrbit } from "@/components/orbit/orbit-context"

/** Only agents assigned to the current project can be assignees (backend validate_assignee). */
export function useProjectAgents() {
  const { agents, assignments } = useOrbit()
  const ids = new Set(assignments?.map((a) => a.agent_id))
  return (agents ?? []).filter((a) => ids.has(a.id) && a.status !== "archived")
}

export function AssigneeSelect({ id, value, onChange }: { id: string; value: number | null; onChange: (v: number | null) => void }) {
  const agents = useProjectAgents()
  return (
    <>
      <Select value={value} onValueChange={(v) => onChange((v as number | null) ?? null)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue>{(v: number | null) => agents.find((a) => a.id === v)?.name ?? "No assignee"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>No assignee</SelectItem>
          {agents.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
              {a.title ? <span className="text-muted-foreground">{a.title}</span> : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!agents.length ? (
        <p className="text-xs text-muted-foreground">No agents in this project yet. Add one from the Agents page.</p>
      ) : null}
    </>
  )
}
