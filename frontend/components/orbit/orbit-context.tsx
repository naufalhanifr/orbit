"use client"

import * as React from "react"

import { useApi, type Agent, type Assignment, type Project, type User } from "@/lib/api"

type Ctx = {
  me?: User
  projects?: Project[]
  agents?: Agent[]
  project?: Project
  setProjectId: (id: number) => void
  assignments?: Assignment[]
  reloadProjects: () => void
  reloadAgents: () => void
  reloadAssignments: () => void
  /** Bumped by actions that change what "Waiting on you" shows. */
  waitingTick: number
  bumpWaiting: () => void
}

const OrbitContext = React.createContext<Ctx | null>(null)
const KEY = "orbit.project"

export function OrbitProvider({ children }: { children: React.ReactNode }) {
  const me = useApi<User>("/auth/me")
  const projects = useApi<Project[]>(me.data ? "/projects" : null)
  const agents = useApi<Agent[]>(me.data ? "/agents?include_archived=true" : null)
  // Server render has no project data yet, so a client-only initial value can't cause a hydration mismatch.
  const [projectId, setId] = React.useState<number | null>(() => {
    try {
      return Number(localStorage.getItem(KEY)) || null
    } catch {
      return null
    }
  })
  const [waitingTick, setWaitingTick] = React.useState(0)

  const setProjectId = React.useCallback((id: number) => {
    setId(id)
    try {
      localStorage.setItem(KEY, String(id))
    } catch {}
  }, [])

  const project = projects.data?.find((p) => p.id === projectId) ?? projects.data?.[0]
  const assignments = useApi<Assignment[]>(project ? `/projects/${project.id}/assignments` : null)

  const value: Ctx = {
    me: me.data,
    projects: projects.data,
    agents: agents.data,
    project,
    setProjectId,
    assignments: assignments.data,
    reloadProjects: projects.reload,
    reloadAgents: agents.reload,
    reloadAssignments: assignments.reload,
    waitingTick,
    bumpWaiting: React.useCallback(() => setWaitingTick((t) => t + 1), []),
  }
  return <OrbitContext.Provider value={value}>{children}</OrbitContext.Provider>
}

export function useOrbit() {
  const ctx = React.useContext(OrbitContext)
  if (!ctx) throw new Error("useOrbit outside OrbitProvider")
  return ctx
}

/** Founder id is not exposed by /auth/me; any author that is not an agent is the Founder (MVP §4.4). */
export function useActor() {
  const { agents, me } = useOrbit()
  return React.useCallback(
    (id: number | null | undefined) => {
      const a = agents?.find((x) => x.id === id)
      return a
        ? { id: a.id, name: a.name, kind: "agent" as const }
        : { id: id ?? 0, name: me?.name ?? "Founder", kind: "human" as const }
    },
    [agents, me]
  )
}
