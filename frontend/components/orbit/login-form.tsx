"use client"

import * as React from "react"
import { OctagonAlert } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { OrbitWordmark } from "@/components/orbit/orbit-mark"
import { api, ApiError } from "@/lib/api"

export function LoginForm() {
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  return (
    <form
      className="flex w-full max-w-sm flex-col gap-6 rounded-lg bg-card p-6 ring-1 ring-foreground/10"
      onSubmit={async (e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        setBusy(true)
        setError(null)
        try {
          await api("/auth/login", { body: { email: f.get("email"), password: f.get("password") } })
          const next = new URLSearchParams(window.location.search).get("next")
          // Only same-site paths, never an absolute URL from the query string.
          window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/board")
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Sign in failed.")
          setBusy(false)
        }
      }}
    >
      <OrbitWordmark className="h-6" />
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-medium">Sign in</h1>
        <p className="text-sm text-muted-foreground">Founder access. Five failed attempts lock sign in for 15 minutes.</p>
      </div>
      {error ? (
        <Alert variant="destructive" role="alert">
          <OctagonAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
