import { Avatar, AvatarFallback } from "@/components/ui/avatar"
type Actor = { name: string; kind: "human" | "agent" }
import { cn } from "@/lib/utils"

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

/** Human = light outlined circle. Agent = ink rounded square. Shape + color + label, never color alone. */
export function ActorAvatar({
  actor,
  size = "default",
  className,
}: {
  actor: Actor
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  const agent = actor.kind === "agent"
  return (
    <Avatar
      size={size}
      className={cn(agent && "rounded-md after:rounded-md after:border-0", className)}
      aria-label={`${actor.name} (${agent ? "agent" : "human"})`}
    >
      <AvatarFallback
        className={cn(
          "font-medium",
          agent
            ? "rounded-md bg-agent text-agent-foreground"
            : "bg-human text-human-foreground ring-1 ring-input"
        )}
      >
        {initials(actor.name)}
      </AvatarFallback>
    </Avatar>
  )
}
