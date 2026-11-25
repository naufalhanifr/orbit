import { cn } from "@/lib/utils"

/**
 * ORBIT identity motif for work in progress (In Progress, Running).
 * Orbit = the 60-minute execution timeout; satellite position = time already elapsed
 * (clockwise from the top). Static (MOTION 1): it only moves when the data changes.
 */
export function OrbitIndicator({
  progress = 0,
  className,
}: {
  progress?: number
  className?: string
}) {
  const p = Math.min(Math.max(progress, 0), 1)
  const a = p * 2 * Math.PI - Math.PI / 2
  const x = 8 + 5.5 * Math.cos(a)
  const y = 8 + 5.5 * Math.sin(a)
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cn("size-3.5 shrink-0", className)}>
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1.75" fill="currentColor" />
      <circle cx={x} cy={y} r="2.25" className="fill-primary stroke-background" strokeWidth="1" />
    </svg>
  )
}
