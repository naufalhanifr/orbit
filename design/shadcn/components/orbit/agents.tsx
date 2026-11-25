"use client"

import * as React from "react"
import Link from "next/link"
import { CircleCheck, Plus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { AGENT_STATUS, StatusBadge } from "@/components/orbit/status"
import { actorById, agents, projects } from "@/lib/orbit-data"

export function AgentList() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{agents.length} agent. Agent tanpa atasan agent melapor langsung ke Founder.</p>
        <Button className="ml-auto" render={<Link href="/agents/new" />}>
          <Plus aria-hidden="true" />
          Buat agent
        </Button>
      </div>
      <div className="overflow-x-auto ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atasan tetap</TableHead>
              <TableHead>Atasan per proyek</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Izin</TableHead>
              <TableHead className="text-right">Instruksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <ActorAvatar actor={a} size="sm" />
                    <span className="flex flex-col">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-muted-foreground">{a.title}</span>
                    </span>
                  </span>
                </TableCell>
                <TableCell><StatusBadge def={AGENT_STATUS[a.status]} progress={0.28} /></TableCell>
                <TableCell>{actorById(a.managerId)?.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {a.projectManagers
                    ? Object.entries(a.projectManagers).map(([p, m]) => `${p} → ${actorById(m)?.name}`).join(", ")
                    : "Tidak ada"}
                </TableCell>
                <TableCell>{a.model}</TableCell>
                <TableCell className="font-mono">{a.preset}</TableCell>
                <TableCell className="text-right font-mono">v{a.instructionVersion}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const managers = [{ id: "founder", name: "Founder (langsung)" }, ...agents.map((a) => ({ id: a.id, name: `${a.name}, ${a.title}` }))]

export function AgentBuilder() {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saved, setSaved] = React.useState(false)
  const [instructions, setInstructions] = React.useState("")
  const [manager, setManager] = React.useState<string | null>("founder")

  return (
    <form
      noValidate
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 md:p-6"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const next: Record<string, string> = {}
        if (!String(f.get("name") ?? "").trim()) next.name = "Nama wajib diisi."
        if (!String(f.get("title") ?? "").trim()) next.title = "Jabatan wajib diisi."
        if (!instructions.trim()) next.instructions = "Instruksi wajib diisi. Agent bekerja hanya dari instruksi ini."
        const limit = Number(String(f.get("limit") ?? "").replace(/\D/g, ""))
        if (!limit || limit > 300000) next.limit = "Isi angka 1 sampai 300.000 (batas default per execution)."
        setErrors(next)
        setSaved(Object.keys(next).length === 0)
      }}
    >
      {saved ? (
        <Alert>
          <CircleCheck aria-hidden="true" />
          <AlertTitle>Agent tersimpan sebagai Draft, instruksi v1.</AlertTitle>
          <AlertDescription>Agent menjadi Ready otomatis saat task pertamanya masuk Assigned.</AlertDescription>
        </Alert>
      ) : null}

      <FieldSet>
        <FieldLegend>Identitas</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={!!errors.name || undefined}>
            <FieldLabel htmlFor="name">Nama</FieldLabel>
            <Input id="name" name="name" aria-invalid={!!errors.name || undefined} />
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </Field>
          <Field data-invalid={!!errors.title || undefined}>
            <FieldLabel htmlFor="title">Jabatan</FieldLabel>
            <Input id="title" name="title" aria-invalid={!!errors.title || undefined} />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Struktur</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="manager">Atasan tetap</FieldLabel>
            <Select value={manager} onValueChange={(v) => setManager(v as string | null)}>
              <SelectTrigger id="manager" className="w-full">
                <SelectValue>{(v: string) => managers.find((m) => m.id === v)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>Kosongkan atau pilih Founder bila agent melapor langsung ke Founder.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Atasan per proyek</FieldLabel>
            <div className="flex flex-col gap-2">
              {projects.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <Label htmlFor={`pm-${p.key}`} className="w-20 shrink-0 font-mono text-muted-foreground">{p.key}</Label>
                  <Select defaultValue={null}>
                    <SelectTrigger id={`pm-${p.key}`} className="w-full">
                      <SelectValue>{(v: string | null) => (v ? managers.find((m) => m.id === v)?.name : "Ikuti atasan tetap")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Ikuti atasan tetap</SelectItem>
                      {managers.slice(1).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <FieldDescription>Atasan per proyek menentukan ke mana work report dikirim untuk task di proyek itu.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Runtime</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="model">Model</FieldLabel>
            <Select defaultValue="Claude Sonnet">
              <SelectTrigger id="model" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Claude Sonnet">Claude Sonnet</SelectItem>
                <SelectItem value="Claude Opus">Claude Opus</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={!!errors.limit || undefined}>
            <FieldLabel htmlFor="limit">Batas token per execution</FieldLabel>
            <InputGroup>
              <InputGroupInput id="limit" name="limit" inputMode="numeric" defaultValue="300.000" className="font-mono tabular-nums" aria-invalid={!!errors.limit || undefined} />
              <InputGroupAddon align="inline-end"><InputGroupText>token</InputGroupText></InputGroupAddon>
            </InputGroup>
            {errors.limit ? <FieldError>{errors.limit}</FieldError> : <FieldDescription>Execution dihentikan otomatis saat batas ini tercapai.</FieldDescription>}
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel id="preset-label">Preset izin tool</FieldLabel>
          <RadioGroup defaultValue="read-only" aria-labelledby="preset-label" className="grid gap-2 md:grid-cols-2">
            {[
              { v: "read-only", t: "read-only", d: "Membaca repo dan dokumen. Tidak bisa mengubah kode." },
              { v: "coding", t: "coding", d: "Mengubah kode, menjalankan test, membuka PR di repo proyek." },
            ].map((o) => (
              <Label key={o.v} htmlFor={`preset-${o.v}`} className="flex items-start gap-3 p-3 ring-1 ring-input has-data-checked:ring-ring">
                <RadioGroupItem id={`preset-${o.v}`} value={o.v} className="mt-0.5" />
                <span className="flex flex-col gap-1">
                  <span className="font-mono font-medium">{o.t}</span>
                  <span className="font-normal text-muted-foreground">{o.d}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Instruksi</FieldLegend>
        <Field data-invalid={!!errors.instructions || undefined}>
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Tulis</TabsTrigger>
              <TabsTrigger value="preview">Pratinjau</TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <Textarea
                id="instructions"
                aria-label="Instruksi agent dalam markdown"
                aria-invalid={!!errors.instructions || undefined}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={10}
                className="font-mono"
                placeholder={"# Peran\nTulis tanggung jawab, batasan, dan definisi selesai."}
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-40 p-3 text-sm whitespace-pre-wrap ring-1 ring-input">
                {instructions || <span className="text-muted-foreground">Belum ada instruksi.</span>}
              </div>
            </TabsContent>
          </Tabs>
          {errors.instructions ? <FieldError>{errors.instructions}</FieldError> : <FieldDescription>Setiap simpan membuat versi baru. Setiap execution mencatat versi yang dipakai.</FieldDescription>}
        </Field>
      </FieldSet>

      <div className="flex items-center gap-2 border-t pt-4">
        <Button type="submit">Simpan agent</Button>
        <Button variant="ghost" render={<Link href="/agents" />}>Batal</Button>
      </div>
    </form>
  )
}
