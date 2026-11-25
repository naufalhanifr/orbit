import type { Metadata } from "next"
import { AppShell } from "@/components/orbit/app-shell"
import { Chat } from "@/components/orbit/chat"

export const metadata: Metadata = { title: "Project chat" }

export default function Page() {
  return (
    <AppShell title="Project chat">
      <Chat />
    </AppShell>
  )
}
