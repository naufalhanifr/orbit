import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Actor } from "@/lib/orbit-data"
import { cn } from "@/lib/utils"

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

/** Human = lingkaran terang berbingkai. Agent = kotak tinta. Bentuk + warna + label, bukan warna saja. */
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
      className={cn(agent && "rounded-none after:rounded-none after:border-0", className)}
      aria-label={`${actor.name} (${agent ? "agent" : "human"})`}
    >
      <AvatarFallback
        className={cn(
          "font-medium",
          agent
            ? "rounded-none bg-agent text-agent-foreground"
            : "bg-human text-human-foreground ring-1 ring-input"
        )}
      >
        {initials(actor.name)}
      </AvatarFallback>
    </Avatar>
  )
}
