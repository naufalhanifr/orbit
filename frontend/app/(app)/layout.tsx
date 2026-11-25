import { OrbitProvider } from "@/components/orbit/orbit-context"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <OrbitProvider>{children}</OrbitProvider>
}
