"use client"

import { ExecutionCard } from "@/components/orbit/execution-card"
import { useOrbit } from "@/components/orbit/orbit-context"
import { BoardError, BoardLoading } from "@/components/orbit/states"
import { TaskThread } from "@/components/orbit/task-thread"
import { ACTIVE_EXEC, useApi, type Execution } from "@/lib/api"

/** Project Chat (PRD 17): one thread per project. Mentions start executions without a task. */
export function Chat() {
  const { project, projects } = useOrbit()
  const execs = useApi<Execution[]>(project ? `/projects/${project.id}/executions` : null, 5000)
  if (projects && !projects.length)
    return <p className="p-4 text-sm text-muted-foreground md:p-6">Create a project first. Chat belongs to a project.</p>
  if (!project || execs.loading) return <div className="p-4 md:p-6"><BoardLoading /></div>
  if (execs.error && !execs.data) return <div className="p-4 md:p-6"><BoardError message={execs.error.message} onRetry={execs.reload} /></div>

  const chatExecs = (execs.data ?? []).filter((e) => e.task_id === null)
  const active = chatExecs.filter((e) => ACTIVE_EXEC.includes(e.status))
  const label = `${project.name} chat`
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
      <p className="text-sm text-muted-foreground">
        Agents only work when you mention them. For work on a task, use the comment thread on that task so the agent gets its
        acceptance criteria.
      </p>
      {active.length ? (
        <section aria-labelledby="chat-live" className="flex flex-col gap-2">
          <h2 id="chat-live" className="text-sm font-medium">
            Active executions from chat
          </h2>
          {active.map((e) => (
            <ExecutionCard key={e.id} execution={e} label={label} showLog onChanged={execs.reload} />
          ))}
        </section>
      ) : null}
      <TaskThread
        key={project.id}
        path={`/projects/${project.id}`}
        label={label}
        title={`${project.key} project chat`}
        executions={chatExecs}
        onSent={execs.reload}
      />
    </div>
  )
}
