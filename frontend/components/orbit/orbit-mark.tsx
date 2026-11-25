import { cn } from "@/lib/utils"

// ORBIT 2D logo (design/logo). Core + orbit = currentColor, satellite = --primary.
export function OrbitMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-6 shrink-0", className)}>
      <path d="M26.337 12.238A11 11 0 1 1 19.762 5.663" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
      <circle cx="23.778" cy="8.222" r="2.75" className={mono ? "fill-current" : "fill-primary"} />
    </svg>
  )
}

export function OrbitWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 98 32" role="img" aria-label="ORBIT" className={cn("h-5 w-auto", className)}>
      <g transform="translate(-3.5 0)">
        <path d="M26.337 12.238A11 11 0 1 1 19.762 5.663" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="16" cy="16" r="4" fill="currentColor" />
        <circle cx="23.778" cy="8.222" r="2.75" className="fill-primary" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M31.5 26V6H39a5 5 0 0 1 0 10H31.5M38.5 16l5 10" />
        <path d="M52 26V6h7a4.5 4.5 0 0 1 0 9H52m0 0h8a5.5 5.5 0 0 1 0 11H52" />
        <path d="M73.5 6v20" />
        <path d="M81.5 6h14M88.5 6v20" />
      </g>
    </svg>
  )
}
