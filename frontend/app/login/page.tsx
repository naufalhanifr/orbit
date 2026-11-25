import type { Metadata } from "next"
import { LoginForm } from "@/components/orbit/login-form"

export const metadata: Metadata = { title: "Sign in" }

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <LoginForm />
    </main>
  )
}
