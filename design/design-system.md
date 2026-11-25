# ORBIT Design System

Versi 1.0 · 2026-11-25 · Basis: shadcn/ui di [`design/shadcn/`](shadcn/)
Token: [`tokens.css`](tokens.css) · Brand: [`brand-guidelines.md`](brand-guidelines.md) · Logo: [`logo/`](logo/) · Cek kontras: [`scripts/contrast.py`](scripts/contrast.py)

---

## 0. Fondasi

| Hal | Nilai | Sumber |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | `design/shadcn/package.json` |
| Styling | Tailwind CSS v4 (CSS-first, `@theme inline`), `tw-animate-css` | `tokens.css` |
| Komponen | shadcn/ui, style **`base-lyra`** (primitive **Base UI**, `@base-ui/react`) | `components.json` |
| Warna dasar | `neutral`, CSS variables oklch | `components.json` |
| Ikon | `lucide-react` | `components.json` |
| Tema | `next-themes`, class `.dark` di `<html>`, default mengikuti sistem | `components/theme-provider.tsx` |
| Font | Noto Sans (`--font-sans`, juga heading), Geist Mono (`--font-mono`) | `app/layout.tsx` |

**Tema: minimalis.** Style `base-lyra` sudah bersudut tegas (`rounded-none`), padat (kontrol `h-8`, teks `text-xs`), dan datar. ORBIT mempertahankan karakter itu. Hanya ada tiga tambahan: token status, token human/agent, dan pola komponen domain.

**Cara pakai token.** `tokens.css` adalah `globals.css` lengkap. Salin sebagai `app/globals.css`. File ini sudah disalin ke `design/shadcn/app/globals.css` dan sudah diuji dengan `next build`. Komponen baru ditambahkan dengan `npx shadcn@latest add <nama>` dari `design/shadcn/` (atau dari app frontend nanti, dengan `components.json` yang sama).

### Prinsip (anti-slop)

1. **Fungsi dulu, dekorasi tidak ada.** Tanpa gradien, glassmorphism, glow, blob, ilustrasi 3D, atau emoji di UI.
2. **Warna adalah informasi.** Netral untuk struktur, primary untuk satu aksi utama, tone hanya untuk status dan identitas agent.
3. **Kepadatan yang terbaca.** Data padat (Kanban, log), tetapi hierarki dibuat lewat ukuran dan berat font, bukan kotak berwarna.
4. **Status tidak pernah hanya warna.** Selalu ikon + teks (WCAG 1.4.1).
5. **Gerak seperlunya.** Hanya indikator Running, transisi overlay ≤ 200 ms, dan semuanya mati saat `prefers-reduced-motion`.
6. **Konsisten dengan shadcn.** Ubah lewat token atau `className`. Jangan membuat varian komponen baru bila komposisi sudah cukup.

### Arah desain dan dial

> Dibaca sebagai: web app operasional (ruang kendali) untuk Founder yang memantau dan mengarahkan AI Agent, dengan bahasa visual minimalis di atas shadcn `base-lyra`. Dial **ENERGY 1 / RHYTHM 1 / MOTION 1**.

- **ENERGY 1 (tenang):** ini alat kerja harian, bukan landing page. Satu titik fokus per layar: tombol primary atau item yang menunggu Founder.
- **RHYTHM 1 (seragam):** keseragaman disengaja. Kanban, list, dan tabel harus bisa dipindai cepat, jadi pola kartu dan baris konsisten.
- **MOTION 1:** hanya state hover/focus, transisi overlay bawaan shadcn, dan ikon Running yang berputar. Alasan: gerak hanya untuk menandai sesuatu yang benar-benar sedang hidup.
- **Satu aksen:** primary biru, dipakai untuk satu aksi utama, fokus, link, dan satelit di logo. Warna tone hanya untuk status.
- **Motif identitas:** bentuk orbit (lintasan + satelit). Muncul di logo, dan simbol `orbit-mark-mono` berwarna `muted-foreground` menggantikan ilustrasi di empty state. Tidak memakai ilustrasi generik.

### Keputusan dan alasan

| Keputusan | Alasan (satu baris) |
|---|---|
| Netral `neutral` + primary biru dari proyek | Founder meminta mengikuti shadcn di repo. Netral menjaga data tetap di depan, dan biru jelas terpisah dari warna status. |
| Biru sedikit lebih gelap di light, lebih terang di dark | Agar teks dan link lolos AA di kedua mode (lihat §7.2). |
| 8 tone status dengan makna tetap | Founder perlu membedakan "berjalan", "menunggu saya", dan "bermasalah" dalam sekali lirik. Amber selalu berarti menunggu Founder. |
| Violet khusus agent | Pelaku (human vs agent) adalah konsep inti ORBIT, sehingga perlu satu warna identitas yang tidak dipakai untuk status. |
| Sudut tegas (`rounded-none`) | Bawaan `base-lyra` di repo; selaras dengan karakter minimalis dan padat. Lingkaran hanya untuk human dan titik status. |
| Tanpa bayangan pada kartu | Hierarki dibuat lewat border dan latar. Bayangan hanya penanda elevasi overlay (§4). |
| Kartu hanya untuk task, execution, node org, dan KPI | Hanya untuk objek yang bisa dipindah, dibuka, atau dibandingkan. Konten lain memakai list atau tabel. |
| Noto Sans + Geist Mono | Sudah dipasang di proyek. Alasan per peran ada di brand-guidelines §6. |
| Ikon lucide | Sudah menjadi `iconLibrary` proyek. Ikon hanya untuk status dan aksi (brand-guidelines §7). |
| Spacing basis 4 px dengan langkah terbatas | Skala bawaan Tailwind. Kepadatan Kanban butuh 8–12 px, halaman butuh 24 px. |

---

## 1. Spacing

Skala Tailwind dengan basis 4 px (`--spacing: 0.25rem`, bawaan Tailwind v4). Hanya langkah berikut yang dipakai:

| Token | px | Pemakaian |
|---|---|---|
| `0.5` | 2 | Jarak ikon–teks di badge padat |
| `1` | 4 | Gap dalam badge, antar-avatar bertumpuk |
| `1.5` | 6 | Gap ikon–label di tombol (bawaan lyra) |
| `2` | 8 | Padding kartu task padat, gap antar-kartu Kanban |
| `3` | 12 | Padding kartu, gap form field |
| `4` | 16 | Padding panel / sheet, gap section dalam kartu |
| `6` | 24 | Padding halaman (desktop), jarak antar-section |
| `8` | 32 | Jarak antar-blok besar di dashboard |
| `12` | 48 | Empty state (vertikal) |

Layout:
- Sidebar aplikasi 240 px (ringkas: 48 px, hanya ikon).
- Konten maksimal 1280 px untuk halaman form (Agent Builder).
- Kanban dan org chart memakai lebar penuh.
- Kolom Kanban 280 px.
- Panel detail task berupa `Sheet` di kanan dengan lebar 560 px.

## 2. Radius

`--radius: 0.625rem` (bawaan proyek), dengan turunan `--radius-sm` sampai `--radius-4xl` di `@theme`. **Namun komponen `base-lyra` memakai `rounded-none`**, jadi bahasa visual ORBIT adalah **sudut tegas**.

| Elemen | Radius | Alasan |
|---|---|---|
| Tombol, input, badge, kartu, dialog, menu | `rounded-none` (bawaan lyra) | Konsistensi minimalis |
| Avatar **human** | `rounded-full` | Pembeda bentuk human (lingkaran) |
| Avatar **agent** | `rounded-none` | Pembeda bentuk agent (kotak), selaras dengan lyra |
| Titik status | `rounded-full` | Titik |
| Ikon aplikasi (`orbit-app-icon.svg`) | 14/64 | Konvensi ikon OS |

Jangan menambah `rounded-lg` dan sejenisnya ke komponen lyra. Kalau suatu saat style diganti ke yang membulat, cukup ubah `--radius`.

## 3. Tipografi

| Gaya | Kelas Tailwind | Ukuran / line-height | Pemakaian |
|---|---|---|---|
| Page title | `text-xl font-medium tracking-tight` | 20 / 28 | Judul halaman (satu per halaman) |
| Section title | `text-sm font-medium` | 14 / 20 | Judul kartu, kolom Kanban, section form |
| Body | `text-sm` | 14 / 20 | Deskripsi task, pesan chat, isi dialog |
| UI / control | `text-xs` | 12 / 16 | Tombol, input, badge, menu (bawaan lyra) |
| Meta | `text-xs text-muted-foreground` | 12 / 16 | Waktu, assignee, jumlah token |
| Mono | `font-mono text-xs tabular-nums` | 12 / 16 | ID task, branch, hash, token, durasi |
| Log | `font-mono text-xs leading-5` | 12 / 20 | Execution log |
| Angka KPI | `text-2xl font-medium tabular-nums` | 24 / 32 | Dashboard token |

Berat font hanya `font-normal` (400) dan `font-medium` (500). Tidak memakai bold 700, kecuali `<strong>` di dalam markdown. Panjang baris teks panjang maksimal sekitar 72 karakter (`max-w-prose`).

## 4. Elevation

Datar. Kedalaman dibuat oleh **border** dan **perbedaan latar** (`background` → `card` → `muted`), bukan bayangan.

| Level | Elemen | Perlakuan |
|---|---|---|
| 0 | Halaman | `bg-background` |
| 1 | Kartu, panel, kolom | `bg-card` + `border` (tanpa shadow). Di dark, `card` lebih terang dari `background`. |
| 2 | Kartu yang sedang di-drag | `shadow-md` + `ring-1 ring-ring` |
| 3 | Popover, dropdown, tooltip, hover card | bawaan shadcn (`shadow-md` + border) |
| 4 | Dialog, alert dialog, sheet | bawaan shadcn (overlay `bg-black/50` + `shadow-lg`) |

---

## 5. Komponen per layar MVP

Nama komponen sesuai registry shadcn (`npx shadcn@latest add …`). Dependensi di luar shadcn ditandai †.

**Shell aplikasi (semua layar):** `sidebar`, `breadcrumb`, `separator`, `avatar`, `dropdown-menu` (menu akun, ganti tema), `tooltip`, `sonner` (toast), `kbd`, `skeleton`.

### 5.1 Kanban / List / Detail task

| Kebutuhan | Komponen |
|---|---|
| Ganti view Kanban ↔ List | `toggle-group` (atau `tabs`) |
| Filter (status, agent, proyek) | `popover` + `command` (multi-select), `badge` untuk filter aktif, `button` ghost "Reset" |
| Kolom Kanban | `scroll-area` horizontal, kartu task (pola §6.1). Drag & drop: **dnd-kit †** |
| List | `table` (+ pola data-table dengan **@tanstack/react-table †**), `checkbox` untuk bulk select, `pagination` |
| Detail task | `sheet` (side right), `tabs` (Ringkasan · Execution · Aktivitas), `textarea`/markdown untuk acceptance criteria, `select` status, `combobox` assignee, `badge`, `hover-card` untuk referensi PR |
| Buat task | `dialog` + `field` + `input` + `textarea` + `select` + `button` |
| Kosong | `empty` |

### 5.2 Project Chat dengan @mention

| Kebutuhan | Komponen |
|---|---|
| Daftar percakapan | `sidebar` sekunder / `scroll-area` + `item`, `input` pencarian |
| Riwayat pesan | `scroll-area`, `avatar` (pola §6.3), pesan = `item`-like layout (bukan bubble berwarna) |
| Composer | `input-group` + `textarea`, `button` kirim (`icon`), lampiran `button` ghost |
| @mention agent | `popover` + `command` dipicu ketik `@` (agent saja, avatar kotak violet), navigasi panah + Enter, Escape menutup |
| Pilih task konteks | `combobox` / `command` dipicu `#` |
| Kartu referensi task | pola kartu task ringkas (§6.1) di dalam pesan |
| Respons agent sedang execution | kartu execution ringkas (§6.4) + `button` Stop |
| Token per respons | teks meta mono di footer pesan |
| Retry | `button` ghost `size="xs"` |

### 5.3 Agent Builder

| Kebutuhan | Komponen |
|---|---|
| Daftar agent | `table` atau grid `card`, `badge` status, `empty` (0 agent) |
| Form | `field` / `field-set`, `input` (nama, jabatan), `combobox` (atasan tetap), `select` (model), `radio-group` (preset izin `read-only` / `coding`), `input` number + `input-group` suffix "token" (batas per execution) |
| Atasan per proyek | `table` kecil (proyek → atasan) + `combobox` per baris, `button` "Tambah proyek" |
| Instruksi markdown | `tabs` (Tulis · Pratinjau) + `textarea` font mono; versi: `badge` "v7" + `hover-card` waktu simpan |
| Simpan | `button` primary; peringatan agent tanpa atasan: `alert` |

### 5.4 Org chart matriks

| Kebutuhan | Komponen |
|---|---|
| Kanvas | **@xyflow/react (React Flow) †**. Node = komponen kustom (§6.5) yang dibangun dari `card` + `avatar` + `badge` |
| Filter proyek | `select` "Semua proyek / Proyek A …", menyorot garis proyek terpilih |
| Legenda garis | `item` kecil: garis solid = atasan tetap; garis putus-putus berlabel = atasan per proyek |
| Detail node | `sheet` / `hover-card` |
| Zoom | `button-group` (`+`, `−`, fit) |

### 5.5 Dashboard token dan execution log (dengan Stop)

| Kebutuhan | Komponen |
|---|---|
| KPI (token hari ini / budget, execution berjalan, gagal 24 jam) | `card` |
| Pemakaian budget | `progress` (warna `primary`; ≥ 80 % pakai `exec-waiting`, 100 % pakai `destructive`) |
| Grafik token per hari / per agent | `chart` (Recharts) dengan `--chart-1..5` |
| Daftar execution | `table` + badge status execution (§6.2) |
| Execution berjalan | kartu execution (§6.4) |
| Log | `scroll-area` + `<pre>` mono, `collapsible` per langkah, `toggle` auto-scroll |
| **Stop** | `button variant="destructive"` + `alert-dialog` (copy di brand-guidelines §3.4) |
| Konfirmasi run saat budget habis | `alert-dialog` |

### 5.6 State wajib per layar (empty, loading, error)

Setiap layar yang menampilkan data wajib punya tiga state ini. Microcopy mengikuti brand-guidelines §3.

| Layar | Empty | Loading | Error |
|---|---|---|---|
| Kanban / List | Proyek tanpa task: `empty` + "Belum ada task di proyek ini" + [Buat task]. Kolom kosong: teks "Kosong". | `skeleton` dengan bentuk kartu (3 per kolom) / baris tabel | `alert` destructive di atas papan + [Coba lagi]; data lama tetap tampil bila ada |
| Detail task | Tanpa execution: "Belum pernah dijalankan." | `skeleton` di dalam sheet | Task tidak ditemukan: "Task ORB-xx tidak ada atau sudah dihapus." + link kembali ke papan |
| Project Chat | Percakapan baru: "Panggil agent dengan @nama. Agent hanya bekerja saat kamu panggil." | Riwayat: `skeleton` pesan; respons agent: badge Running + `spinner` | Pesan gagal terkirim: teks error di bawah pesan + [Kirim ulang] |
| Agent Builder | 0 agent: empty state brand-guidelines §3.2 dengan `orbit-mark-mono` | `skeleton` form | Gagal simpan: error inline per field + toast; input tidak dibuang |
| Org chart | 0 agent: sama dengan Agent Builder. 1 agent: node puncak saja + ajakan menambah bawahan | `skeleton` node | Gagal memuat: `alert` + [Coba lagi]. Struktur tidak valid (siklus, lebih dari 4 level): pesan inline di node yang bermasalah |
| Dashboard / log | Belum ada execution: "Belum ada execution. Token belum terpakai." | `skeleton` KPI + grafik; log: baris "Menghubungkan ke log…" | Log terputus: banner "Log terputus. Menyambung ulang…" + [Muat ulang]; gagal Stop: `alert` di dalam dialog, dialog tetap terbuka |

---

## 6. Pola komponen khusus ORBIT

Semua pola berikut adalah **komposisi** komponen shadcn, bukan komponen baru dari nol. Letakkan di `components/orbit/`.

### 6.1 Kartu task

```
┌──────────────────────────────────────┐
│ ORB-12                     ◉ In Prog │  ← ID mono muted · badge status
│ Tambah endpoint login                │  ← text-sm font-medium, max 2 baris
│ ▢ Backend Dev   ⎇ PR #42   38,2k tok │  ← avatar agent · meta
└──────────────────────────────────────┘
```

```tsx
<Card className="gap-2 p-3 text-sm hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring">
  <div className="flex items-center justify-between">
    <span className="font-mono text-xs text-muted-foreground">ORB-12</span>
    <TaskStatusBadge status="in_progress" />
  </div>
  <p className="line-clamp-2 font-medium">Tambah endpoint login</p>
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <ActorAvatar kind="agent" name="Backend Dev" size="xs" />
    <span className="truncate">Backend Dev</span>
    <span className="ml-auto font-mono tabular-nums">38,2k tok</span>
  </div>
</Card>
```

- Seluruh kartu dapat diklik untuk membuka sheet detail. Judul kartu adalah `<button>` (atau `<a href>` ke URL task) yang area kliknya diperluas ke seluruh kartu (`after:absolute after:inset-0`), sehingga fokus keyboard dan Enter/Space bekerja secara native.
- Task Blocked: badge Blocked + satu baris alasan (`text-xs text-task-blocked-foreground`, ikon `octagon-alert`). Tidak memakai garis warna di tepi kartu.
- Task "dari chat": `badge variant="outline"` bertuliskan *dari chat*.
- Cancelled: judul `line-through text-muted-foreground`.

### 6.2 Badge status

Satu komponen untuk dua domain. Bentuknya **ikon + label**, latar `*-subtle`, teks `*-foreground`, tanpa border.

```tsx
const TASK = {
  backlog:     { label: "Backlog",     icon: CircleDashed,  cls: "bg-task-backlog-subtle text-task-backlog-foreground" },
  assigned:    { label: "Assigned",    icon: CircleUser,    cls: "bg-task-assigned-subtle text-task-assigned-foreground" },
  in_progress: { label: "In Progress", icon: CircleDot,     cls: "bg-task-in-progress-subtle text-task-in-progress-foreground" },
  review:      { label: "Review",      icon: GitPullRequest,cls: "bg-task-review-subtle text-task-review-foreground" },
  blocked:     { label: "Blocked",     icon: OctagonAlert,  cls: "bg-task-blocked-subtle text-task-blocked-foreground" },
  done:        { label: "Done",        icon: CircleCheck,   cls: "bg-task-done-subtle text-task-done-foreground" },
  cancelled:   { label: "Cancelled",   icon: CircleSlash,   cls: "bg-task-cancelled-subtle text-task-cancelled-foreground" },
}
// <Badge className={cn("gap-1 border-transparent", s.cls)}><s.icon aria-hidden className="size-3.5" />{s.label}</Badge>
```

| Status execution | Kelas | Ikon |
|---|---|---|
| Queued | `bg-exec-queued-subtle text-exec-queued-foreground` | `Clock` |
| Preparing Context¹ | sama dengan Queued | `Loader` |
| Running | `bg-exec-running-subtle text-exec-running-foreground` | `Loader` + `animate-spin` (motion-safe) |
| Waiting for Input | `bg-exec-waiting-subtle text-exec-waiting-foreground` | `MessageCircleQuestion` |
| Completed | `bg-exec-completed-subtle text-exec-completed-foreground` | `Check` |
| Failed | `bg-exec-failed-subtle text-exec-failed-foreground` | `X` |
| Cancelled | `bg-exec-cancelled-subtle text-exec-cancelled-foreground` | `CircleSlash` |
| Suspended | `bg-exec-suspended-subtle text-exec-suspended-foreground` | `CirclePause` |

¹ PRD §18.3 memiliki tahap *Preparing Context* yang tidak ada dalam daftar status tugas UI ini. Tahap ini ditampilkan sebagai varian Queued.

**Varian titik** (untuk ruang sempit seperti header kolom Kanban dan tabel padat): `<span className="size-2 rounded-full bg-task-done" />` + label teks. Titik memakai token *solid* (≥ 3:1 terhadap latar).

### 6.3 Avatar agent vs human

| | Human | Agent |
|---|---|---|
| Bentuk | Lingkaran (`rounded-full`) | Kotak (`rounded-none`) |
| Latar | `bg-human-subtle` | `bg-agent-subtle` |
| Isi | Inisial (`text-human-foreground`) atau foto | Inisial (`text-agent-foreground`). Tidak memakai ikon robot. |
| Label | Nama | Nama + `badge` kecil "Agent" di tempat yang tidak jelas konteksnya (chat, assignee picker) |
| Nama di chat | `text-foreground` | `text-agent-foreground` |

```tsx
<Avatar className={cn("size-6", kind === "agent" ? "rounded-none" : "rounded-full")}>
  <AvatarFallback className={kind === "agent"
    ? "rounded-none bg-agent-subtle text-agent-foreground"
    : "bg-human-subtle text-human-foreground"}>
    {initials}
  </AvatarFallback>
</Avatar>
```

Ukuran avatar: `xs` 20 px (kartu), `sm` 24 px (list), `md` 32 px (chat, node org chart), `lg` 40 px (profil agent). Pembeda human dan agent memakai **bentuk + warna + label**, sehingga tetap jelas bagi pengguna buta warna. Founder tampil sebagai human, dengan label "Founder".

### 6.4 Kartu execution

```
┌─────────────────────────────────────────────────────┐
│ ▢ Backend Dev · ORB-12 Tambah endpoint login        │
│ ⟳ Running   4m 12d   38.200 / 300.000 token  [■ Stop]│
│ ▓▓▓░░░░░░░░░░░░░ 13%                                │
│ › Menjalankan test (pnpm test)                      │  ← langkah terakhir, mono
└─────────────────────────────────────────────────────┘
```

- Wadah `card` dengan `p-3 gap-2`. Header: avatar agent + nama + link task.
- Baris status: badge execution, lalu durasi dan token (mono, `tabular-nums`, `aria-live="polite"`, diperbarui maksimal tiap 5 detik agar screen reader tidak terlalu berisik). Tombol **Stop** di kanan.
- `progress` menunjukkan token / batas per execution. Indikator Running hanya berupa ikon berputar, tanpa skeleton berdenyut.
- Stop: `Button variant="destructive" size="sm"` dengan ikon `Square`, membuka `AlertDialog`. Saat proses berhenti: tombol `disabled` + label "Menghentikan…".
- Waiting for Input: badge Waiting for Input + pertanyaan agent (satu baris) + tombol primary "Jawab". Ini satu-satunya tombol primary di kartu.
- Failed: baris error ringkas `text-exec-failed-foreground` + "Lihat log".

### 6.5 Node org chart (matriks, garis atasan per proyek)

```
                ┌──────────────┐
                │ ▢ CTO        │   ← agent puncak: badge "Puncak", melapor ke Founder
                │  Puncak      │
                └──────┬───────┘
            ┌──────────┴──────────┐
     ┌──────┴─────┐        ┌──────┴─────┐
     │ ▢ PO 1     │        │ ▢ PO 2     │
     └──────┬─────┘        └──────┬─────┘
            ┆ Proyek A            ┆ Proyek B      ← garis putus-putus berlabel proyek
            └─────────┐ ┌─────────┘
               ┌──────┴─┴──────┐
               │ ▢ Shared Spec │
               │  2 atasan     │
               └───────────────┘
```

**Node** (`card`, lebar 200 px, `p-2`):
- Avatar `md` + nama (`text-sm font-medium`) + jabatan (`text-xs text-muted-foreground`).
- Badge status agent (titik + label).
- "Puncak" (`badge variant="outline"`) untuk agent puncak.
- "N atasan" bila matriks.
- Node yang belum memiliki atasan: border `border-dashed border-destructive` + label "Belum ada atasan".

**Founder** tidak tampil sebagai node (PRD §8.1). Di atas agent puncak ada penanda teks kecil `↑ melapor ke Founder` (`text-xs text-muted-foreground`).

**Garis (edge):**

| Jenis | Gaya | Label |
|---|---|---|
| Atasan tetap | solid, `stroke: var(--muted-foreground)`, 1.5 px | (tanpa label) |
| Atasan per proyek | putus-putus `6 4`, `stroke: var(--muted-foreground)`, 1.5 px | Nama proyek dalam `badge variant="outline"` di tengah garis, latar `card` |
| Garis proyek terfilter / di-hover | `stroke: var(--primary)`, 2 px; garis lain turun ke opacity 0.3 | label tetap tampil |

Garis tetap dan per proyek dibedakan dengan **pola garis + label**, bukan dengan warna. Warna hanya dipakai untuk menyorot. `muted-foreground` memenuhi ≥ 3:1 terhadap `background`/`card` di kedua mode (lihat §7).

**Interaksi:**
- Klik node membuka `sheet` profil agent.
- Hover garis per proyek menyorot semua garis proyek itu.
- Keyboard: node dapat difokuskan (React Flow `nodesFocusable`), Enter membuka detail.
- Kedalaman maksimal 4 level (PRD §8.2). Builder menolak level ke-5 dengan pesan inline.

---

## 7. Aksesibilitas

### 7.1 Aturan

- **Kontras:** teks ≥ 4.5:1 (WCAG 1.4.3). Komponen UI dan grafik ≥ 3:1 (1.4.11): batas input, cincin fokus, titik status, garis grafik.
- **Fokus terlihat:** `focus-visible:ring-1 ring-ring` bawaan lyra, dengan `--ring` = primary (≥ 7:1).
- **Warna bukan satu-satunya penanda** (1.4.1): status = ikon + teks; human/agent = bentuk + ikon; garis org chart = pola + label.
- **Target klik/sentuh:** di pointer presisi (mouse), kontrol lyra `h-8` (32 px) dipertahankan demi kepadatan data. Minimal 24 × 24 px (`icon-xs` hanya untuk aksi sekunder di baris padat). Di perangkat sentuh (`pointer: coarse`) dan lebar < 768 px, **semua target ≥ 44 × 44 px**: gunakan `size="lg"` plus padding area sentuh (`min-h-11 min-w-11`), dengan jarak antar-target ≥ 8 px.
- **Affordance:** `cursor: pointer` pada semua kontrol aktif dan `not-allowed` pada yang disabled (sudah di `tokens.css`). Aksi memakai `<button>`, navigasi memakai `<a href>`. Kartu task yang bisa diklik dibungkus `<button>` atau link, bukan `div` dengan `onClick`.
- **Label form:** setiap field punya `<Label>` yang terlihat. Placeholder bukan pengganti label. Pesan error tampil di bawah field.
- **Gerak:** `prefers-reduced-motion` mematikan animasi (sudah di `tokens.css`). Gunakan `motion-safe:animate-spin`.
- **Live region:** status execution dan toast memakai `aria-live="polite"`. Error Stop memakai `role="alert"`.
- **Ikon-saja** wajib `aria-label` + `Tooltip`.
- **Bahasa:** `<html lang="id">`. Saat ini `layout.tsx` masih memakai `lang="en"` dan perlu diubah ketika frontend dibangun.

### 7.2 Perubahan token dari default proyek (demi AA)

| Token | Mode | Default | ORBIT | Alasan (rasio default → baru) |
|---|---|---|---|---|
| `--primary` | light | `0.488 0.243 264.4` | `0.46 0.23 264.4` | Teks di atas hover `primary/80`: 4.21 → 4.68 |
| `--muted-foreground` | light | `0.556` | `0.52` | Di atas `--muted`: 4.34 → 5.05 |
| `--destructive` | light | `0.577 0.245 27.3` | `0.53 0.21 27` | Teks di atas `destructive/10` (tombol lyra): 3.99 → 4.95 |
| `--input` | light | `0.922` | `0.64` | Batas input: 1.26 → 3.36 |
| `--ring` | light | `0.708` | = primary | Cincin fokus: 2.59 → 7.67 |
| `--chart-1..5` | light | ramp mulai `0.809` | ramp `0.623 → 0.379` | Setiap seri ≥ 3:1 terhadap putih |
| `--primary` (+ `sidebar-primary`, `ring`) | dark | `0.424 0.199 265.6` | `0.707 0.165 254.6` | Teks link di atas background: 2.24 → 7.51. Foreground tombol jadi gelap. |
| `--input` | dark | putih 15% | putih 36% | Batas input: 1.47 → 3.26 |
| `--chart-1..5` | dark | ramp sampai `0.424` | ramp `0.809 → 0.546` | Setiap seri ≥ 3:1 terhadap background |

### 7.3 Hasil cek kontras

Dihitung oleh `python3 design/scripts/contrast.py` dari `tokens.css`: konversi oklch → sRGB (OKLab), rumus luminansi relatif WCAG 2.1, dan warna ber-alpha di-composite di atas latar. **Hasil: 217 pasangan lulus, 0 gagal.** Jalankan ulang skrip setiap kali token berubah. Exit code 1 bila ada yang gagal, sehingga bisa dipakai di CI.

Catatan cakupan: *Teks* = minimal 4.5:1. *Non-teks* = minimal 3:1. `--border` sengaja tidak diuji karena dekoratif (pemisah kartu dan baris). Batas yang menandai kontrol interaktif memakai `--input`.

<details><summary>Tabel lengkap (dihasilkan skrip, 2026-11-25)</summary>

#### Light

| Jenis | Depan | Latar | Rasio | Minimum | Hasil |
|---|---|---|---|---|---|
| Teks | `foreground` | `background` | 19.79:1 | 4.5:1 | Lulus |
| Teks | `card-foreground` | `card` | 19.79:1 | 4.5:1 | Lulus |
| Teks | `popover-foreground` | `popover` | 19.79:1 | 4.5:1 | Lulus |
| Teks | `primary-foreground` | `primary` | 7.04:1 | 4.5:1 | Lulus |
| Teks | `secondary-foreground` | `secondary` | 16.11:1 | 4.5:1 | Lulus |
| Teks | `muted-foreground` | `muted` | 5.05:1 | 4.5:1 | Lulus |
| Teks | `muted-foreground` | `background` | 5.51:1 | 4.5:1 | Lulus |
| Teks | `muted-foreground` | `card` | 5.51:1 | 4.5:1 | Lulus |
| Teks | `accent-foreground` | `accent` | 16.42:1 | 4.5:1 | Lulus |
| Teks | `sidebar-foreground` | `sidebar` | 18.96:1 | 4.5:1 | Lulus |
| Teks | `sidebar-primary-foreground` | `sidebar-primary` | 7.04:1 | 4.5:1 | Lulus |
| Teks | `sidebar-accent-foreground` | `sidebar-accent` | 16.42:1 | 4.5:1 | Lulus |
| Teks | `muted-foreground` | `sidebar` | 5.28:1 | 4.5:1 | Lulus |
| Teks | `primary` | `background` | 7.67:1 | 4.5:1 | Lulus |
| Teks | `primary` | `card` | 7.67:1 | 4.5:1 | Lulus |
| Teks | `destructive` | `background` | 5.89:1 | 4.5:1 | Lulus |
| Teks | `destructive` | `card` | 5.89:1 | 4.5:1 | Lulus |
| Teks | `destructive` | `destructive/10 di atas background` | 4.95:1 | 4.5:1 | Lulus |
| Teks (hover) | `primary-foreground` | `primary/80 di atas background` | 4.58:1 | 4.5:1 | Lulus |
| Non-teks | `input` | `background` | 3.36:1 | 3:1 | Lulus |
| Non-teks | `input` | `card` | 3.36:1 | 3:1 | Lulus |
| Non-teks | `ring` | `background` | 7.67:1 | 3:1 | Lulus |
| Non-teks | `ring` | `card` | 7.67:1 | 3:1 | Lulus |
| Non-teks (grafik) | `chart-1` | `background` | 3.76:1 | 3:1 | Lulus |
| Non-teks (grafik) | `chart-2` | `background` | 5.26:1 | 3:1 | Lulus |
| Non-teks (grafik) | `chart-3` | `background` | 6.82:1 | 3:1 | Lulus |
| Non-teks (grafik) | `chart-4` | `background` | 8.84:1 | 3:1 | Lulus |
| Non-teks (grafik) | `chart-5` | `background` | 10.40:1 | 3:1 | Lulus |
| Teks | `task-backlog-foreground` | `task-backlog-subtle` | 6.08:1 | 4.5:1 | Lulus |
| Teks | `task-backlog-foreground` | `card` | 6.83:1 | 4.5:1 | Lulus |
| Teks | `task-backlog-foreground` | `muted` | 6.26:1 | 4.5:1 | Lulus |
| Non-teks | `task-backlog` | `card` | 3.95:1 | 3:1 | Lulus |
| Non-teks | `task-backlog` | `background` | 3.95:1 | 3:1 | Lulus |
| Teks | `task-assigned-foreground` | `task-assigned-subtle` | 6.05:1 | 4.5:1 | Lulus |
| Teks | `task-assigned-foreground` | `card` | 6.68:1 | 4.5:1 | Lulus |
| Teks | `task-assigned-foreground` | `muted` | 6.12:1 | 4.5:1 | Lulus |
| Non-teks | `task-assigned` | `card` | 3.85:1 | 3:1 | Lulus |
| Non-teks | `task-assigned` | `background` | 3.85:1 | 3:1 | Lulus |
| Teks | `task-in-progress-foreground` | `task-in-progress-subtle` | 6.11:1 | 4.5:1 | Lulus |
| Teks | `task-in-progress-foreground` | `card` | 6.78:1 | 4.5:1 | Lulus |
| Teks | `task-in-progress-foreground` | `muted` | 6.21:1 | 4.5:1 | Lulus |
| Non-teks | `task-in-progress` | `card` | 4.08:1 | 3:1 | Lulus |
| Non-teks | `task-in-progress` | `background` | 4.08:1 | 3:1 | Lulus |
| Teks | `task-review-foreground` | `task-review-subtle` | 6.06:1 | 4.5:1 | Lulus |
| Teks | `task-review-foreground` | `card` | 6.71:1 | 4.5:1 | Lulus |
| Teks | `task-review-foreground` | `muted` | 6.16:1 | 4.5:1 | Lulus |
| Non-teks | `task-review` | `card` | 4.06:1 | 3:1 | Lulus |
| Non-teks | `task-review` | `background` | 4.06:1 | 3:1 | Lulus |
| Teks | `task-blocked-foreground` | `task-blocked-subtle` | 5.89:1 | 4.5:1 | Lulus |
| Teks | `task-blocked-foreground` | `card` | 6.59:1 | 4.5:1 | Lulus |
| Teks | `task-blocked-foreground` | `muted` | 6.04:1 | 4.5:1 | Lulus |
| Non-teks | `task-blocked` | `card` | 4.36:1 | 3:1 | Lulus |
| Non-teks | `task-blocked` | `background` | 4.36:1 | 3:1 | Lulus |
| Teks | `task-done-foreground` | `task-done-subtle` | 5.91:1 | 4.5:1 | Lulus |
| Teks | `task-done-foreground` | `card` | 6.48:1 | 4.5:1 | Lulus |
| Teks | `task-done-foreground` | `muted` | 5.94:1 | 4.5:1 | Lulus |
| Non-teks | `task-done` | `card` | 3.71:1 | 3:1 | Lulus |
| Non-teks | `task-done` | `background` | 3.71:1 | 3:1 | Lulus |
| Teks | `task-cancelled-foreground` | `task-cancelled-subtle` | 6.08:1 | 4.5:1 | Lulus |
| Teks | `task-cancelled-foreground` | `card` | 6.83:1 | 4.5:1 | Lulus |
| Teks | `task-cancelled-foreground` | `muted` | 6.26:1 | 4.5:1 | Lulus |
| Non-teks | `task-cancelled` | `card` | 3.95:1 | 3:1 | Lulus |
| Non-teks | `task-cancelled` | `background` | 3.95:1 | 3:1 | Lulus |
| Teks | `exec-queued-foreground` | `exec-queued-subtle` | 6.08:1 | 4.5:1 | Lulus |
| Teks | `exec-queued-foreground` | `card` | 6.83:1 | 4.5:1 | Lulus |
| Teks | `exec-queued-foreground` | `muted` | 6.26:1 | 4.5:1 | Lulus |
| Non-teks | `exec-queued` | `card` | 3.95:1 | 3:1 | Lulus |
| Non-teks | `exec-queued` | `background` | 3.95:1 | 3:1 | Lulus |
| Teks | `exec-running-foreground` | `exec-running-subtle` | 6.11:1 | 4.5:1 | Lulus |
| Teks | `exec-running-foreground` | `card` | 6.78:1 | 4.5:1 | Lulus |
| Teks | `exec-running-foreground` | `muted` | 6.21:1 | 4.5:1 | Lulus |
| Non-teks | `exec-running` | `card` | 4.08:1 | 3:1 | Lulus |
| Non-teks | `exec-running` | `background` | 4.08:1 | 3:1 | Lulus |
| Teks | `exec-waiting-foreground` | `exec-waiting-subtle` | 6.06:1 | 4.5:1 | Lulus |
| Teks | `exec-waiting-foreground` | `card` | 6.71:1 | 4.5:1 | Lulus |
| Teks | `exec-waiting-foreground` | `muted` | 6.16:1 | 4.5:1 | Lulus |
| Non-teks | `exec-waiting` | `card` | 4.06:1 | 3:1 | Lulus |
| Non-teks | `exec-waiting` | `background` | 4.06:1 | 3:1 | Lulus |
| Teks | `exec-completed-foreground` | `exec-completed-subtle` | 5.91:1 | 4.5:1 | Lulus |
| Teks | `exec-completed-foreground` | `card` | 6.48:1 | 4.5:1 | Lulus |
| Teks | `exec-completed-foreground` | `muted` | 5.94:1 | 4.5:1 | Lulus |
| Non-teks | `exec-completed` | `card` | 3.71:1 | 3:1 | Lulus |
| Non-teks | `exec-completed` | `background` | 3.71:1 | 3:1 | Lulus |
| Teks | `exec-failed-foreground` | `exec-failed-subtle` | 5.89:1 | 4.5:1 | Lulus |
| Teks | `exec-failed-foreground` | `card` | 6.59:1 | 4.5:1 | Lulus |
| Teks | `exec-failed-foreground` | `muted` | 6.04:1 | 4.5:1 | Lulus |
| Non-teks | `exec-failed` | `card` | 4.36:1 | 3:1 | Lulus |
| Non-teks | `exec-failed` | `background` | 4.36:1 | 3:1 | Lulus |
| Teks | `exec-cancelled-foreground` | `exec-cancelled-subtle` | 6.08:1 | 4.5:1 | Lulus |
| Teks | `exec-cancelled-foreground` | `card` | 6.83:1 | 4.5:1 | Lulus |
| Teks | `exec-cancelled-foreground` | `muted` | 6.26:1 | 4.5:1 | Lulus |
| Non-teks | `exec-cancelled` | `card` | 3.95:1 | 3:1 | Lulus |
| Non-teks | `exec-cancelled` | `background` | 3.95:1 | 3:1 | Lulus |
| Teks | `exec-suspended-foreground` | `exec-suspended-subtle` | 5.96:1 | 4.5:1 | Lulus |
| Teks | `exec-suspended-foreground` | `card` | 6.66:1 | 4.5:1 | Lulus |
| Teks | `exec-suspended-foreground` | `muted` | 6.11:1 | 4.5:1 | Lulus |
| Non-teks | `exec-suspended` | `card` | 4.21:1 | 3:1 | Lulus |
| Non-teks | `exec-suspended` | `background` | 4.21:1 | 3:1 | Lulus |
| Teks | `human-foreground` | `human-subtle` | 6.08:1 | 4.5:1 | Lulus |
| Teks | `human-foreground` | `card` | 6.83:1 | 4.5:1 | Lulus |
| Teks | `human-foreground` | `muted` | 6.26:1 | 4.5:1 | Lulus |
| Non-teks | `human` | `card` | 3.95:1 | 3:1 | Lulus |
| Non-teks | `human` | `background` | 3.95:1 | 3:1 | Lulus |
| Teks | `agent-foreground` | `agent-subtle` | 6.38:1 | 4.5:1 | Lulus |
| Teks | `agent-foreground` | `card` | 7.10:1 | 4.5:1 | Lulus |
| Teks | `agent-foreground` | `muted` | 6.51:1 | 4.5:1 | Lulus |
| Non-teks | `agent` | `card` | 4.29:1 | 3:1 | Lulus |
| Non-teks | `agent` | `background` | 4.29:1 | 3:1 | Lulus |

#### Dark

| Jenis | Depan | Latar | Rasio | Minimum | Hasil |
|---|---|---|---|---|---|
| Teks | `foreground` | `background` | 18.96:1 | 4.5:1 | Lulus |
| Teks | `card-foreground` | `card` | 17.16:1 | 4.5:1 | Lulus |
| Teks | `popover-foreground` | `popover` | 17.16:1 | 4.5:1 | Lulus |
| Teks | `primary-foreground` | `primary` | 7.51:1 | 4.5:1 | Lulus |
| Teks | `secondary-foreground` | `secondary` | 14.26:1 | 4.5:1 | Lulus |
| Teks | `muted-foreground` | `muted` | 5.83:1 | 4.5:1 | Lulus |
| Teks | `muted-foreground` | `background` | 7.63:1 | 4.5:1 | Lulus |
| Teks | `muted-foreground` | `card` | 6.91:1 | 4.5:1 | Lulus |
| Teks | `accent-foreground` | `accent` | 14.48:1 | 4.5:1 | Lulus |
| Teks | `sidebar-foreground` | `sidebar` | 17.16:1 | 4.5:1 | Lulus |
| Teks | `sidebar-primary-foreground` | `sidebar-primary` | 7.51:1 | 4.5:1 | Lulus |
| Teks | `sidebar-accent-foreground` | `sidebar-accent` | 14.48:1 | 4.5:1 | Lulus |
| Teks | `muted-foreground` | `sidebar` | 6.91:1 | 4.5:1 | Lulus |
| Teks | `primary` | `background` | 7.51:1 | 4.5:1 | Lulus |
| Teks | `primary` | `card` | 6.79:1 | 4.5:1 | Lulus |
| Teks | `destructive` | `background` | 6.84:1 | 4.5:1 | Lulus |
| Teks | `destructive` | `card` | 6.19:1 | 4.5:1 | Lulus |
| Teks | `destructive` | `destructive/20 di atas background` | 5.30:1 | 4.5:1 | Lulus |
| Teks (hover) | `primary-foreground` | `primary/80 di atas background` | 5.10:1 | 4.5:1 | Lulus |
| Teks | `foreground` | `input/30 (tombol outline dark)` | 14.77:1 | 4.5:1 | Lulus |
| Non-teks | `input` | `background` | 3.26:1 | 3:1 | Lulus |
| Non-teks | `input` | `card` | 3.34:1 | 3:1 | Lulus |
| Non-teks | `ring` | `background` | 7.51:1 | 3:1 | Lulus |
| Non-teks | `ring` | `card` | 6.79:1 | 3:1 | Lulus |
| Non-teks (grafik) | `chart-1` | `background` | 10.93:1 | 3:1 | Lulus |
| Non-teks (grafik) | `chart-2` | `background` | 7.51:1 | 3:1 | Lulus |
| Non-teks (grafik) | `chart-3` | `background` | 5.26:1 | 3:1 | Lulus |
| Non-teks (grafik) | `chart-4` | `background` | 4.48:1 | 3:1 | Lulus |
| Non-teks (grafik) | `chart-5` | `background` | 3.77:1 | 3:1 | Lulus |
| Teks | `task-backlog-foreground` | `task-backlog-subtle` | 8.07:1 | 4.5:1 | Lulus |
| Teks | `task-backlog-foreground` | `card` | 9.59:1 | 4.5:1 | Lulus |
| Teks | `task-backlog-foreground` | `muted` | 8.09:1 | 4.5:1 | Lulus |
| Non-teks | `task-backlog` | `card` | 4.92:1 | 3:1 | Lulus |
| Non-teks | `task-backlog` | `background` | 5.44:1 | 3:1 | Lulus |
| Teks | `task-assigned-foreground` | `task-assigned-subtle` | 8.72:1 | 4.5:1 | Lulus |
| Teks | `task-assigned-foreground` | `card` | 10.44:1 | 4.5:1 | Lulus |
| Teks | `task-assigned-foreground` | `muted` | 8.81:1 | 4.5:1 | Lulus |
| Non-teks | `task-assigned` | `card` | 6.87:1 | 3:1 | Lulus |
| Non-teks | `task-assigned` | `background` | 7.59:1 | 3:1 | Lulus |
| Teks | `task-in-progress-foreground` | `task-in-progress-subtle` | 8.07:1 | 4.5:1 | Lulus |
| Teks | `task-in-progress-foreground` | `card` | 9.55:1 | 4.5:1 | Lulus |
| Teks | `task-in-progress-foreground` | `muted` | 8.06:1 | 4.5:1 | Lulus |
| Non-teks | `task-in-progress` | `card` | 6.10:1 | 3:1 | Lulus |
| Non-teks | `task-in-progress` | `background` | 6.74:1 | 3:1 | Lulus |
| Teks | `task-review-foreground` | `task-review-subtle` | 8.89:1 | 4.5:1 | Lulus |
| Teks | `task-review-foreground` | `card` | 10.52:1 | 4.5:1 | Lulus |
| Teks | `task-review-foreground` | `muted` | 8.87:1 | 4.5:1 | Lulus |
| Non-teks | `task-review` | `card` | 7.89:1 | 3:1 | Lulus |
| Non-teks | `task-review` | `background` | 8.72:1 | 3:1 | Lulus |
| Teks | `task-blocked-foreground` | `task-blocked-subtle` | 7.93:1 | 4.5:1 | Lulus |
| Teks | `task-blocked-foreground` | `card` | 9.22:1 | 4.5:1 | Lulus |
| Teks | `task-blocked-foreground` | `muted` | 7.78:1 | 4.5:1 | Lulus |
| Non-teks | `task-blocked` | `card` | 5.73:1 | 3:1 | Lulus |
| Non-teks | `task-blocked` | `background` | 6.33:1 | 3:1 | Lulus |
| Teks | `task-done-foreground` | `task-done-subtle` | 8.82:1 | 4.5:1 | Lulus |
| Teks | `task-done-foreground` | `card` | 10.65:1 | 4.5:1 | Lulus |
| Teks | `task-done-foreground` | `muted` | 8.99:1 | 4.5:1 | Lulus |
| Non-teks | `task-done` | `card` | 7.10:1 | 3:1 | Lulus |
| Non-teks | `task-done` | `background` | 7.84:1 | 3:1 | Lulus |
| Teks | `task-cancelled-foreground` | `task-cancelled-subtle` | 8.07:1 | 4.5:1 | Lulus |
| Teks | `task-cancelled-foreground` | `card` | 9.59:1 | 4.5:1 | Lulus |
| Teks | `task-cancelled-foreground` | `muted` | 8.09:1 | 4.5:1 | Lulus |
| Non-teks | `task-cancelled` | `card` | 4.92:1 | 3:1 | Lulus |
| Non-teks | `task-cancelled` | `background` | 5.44:1 | 3:1 | Lulus |
| Teks | `exec-queued-foreground` | `exec-queued-subtle` | 8.07:1 | 4.5:1 | Lulus |
| Teks | `exec-queued-foreground` | `card` | 9.59:1 | 4.5:1 | Lulus |
| Teks | `exec-queued-foreground` | `muted` | 8.09:1 | 4.5:1 | Lulus |
| Non-teks | `exec-queued` | `card` | 4.92:1 | 3:1 | Lulus |
| Non-teks | `exec-queued` | `background` | 5.44:1 | 3:1 | Lulus |
| Teks | `exec-running-foreground` | `exec-running-subtle` | 8.07:1 | 4.5:1 | Lulus |
| Teks | `exec-running-foreground` | `card` | 9.55:1 | 4.5:1 | Lulus |
| Teks | `exec-running-foreground` | `muted` | 8.06:1 | 4.5:1 | Lulus |
| Non-teks | `exec-running` | `card` | 6.10:1 | 3:1 | Lulus |
| Non-teks | `exec-running` | `background` | 6.74:1 | 3:1 | Lulus |
| Teks | `exec-waiting-foreground` | `exec-waiting-subtle` | 8.89:1 | 4.5:1 | Lulus |
| Teks | `exec-waiting-foreground` | `card` | 10.52:1 | 4.5:1 | Lulus |
| Teks | `exec-waiting-foreground` | `muted` | 8.87:1 | 4.5:1 | Lulus |
| Non-teks | `exec-waiting` | `card` | 7.89:1 | 3:1 | Lulus |
| Non-teks | `exec-waiting` | `background` | 8.72:1 | 3:1 | Lulus |
| Teks | `exec-completed-foreground` | `exec-completed-subtle` | 8.82:1 | 4.5:1 | Lulus |
| Teks | `exec-completed-foreground` | `card` | 10.65:1 | 4.5:1 | Lulus |
| Teks | `exec-completed-foreground` | `muted` | 8.99:1 | 4.5:1 | Lulus |
| Non-teks | `exec-completed` | `card` | 7.10:1 | 3:1 | Lulus |
| Non-teks | `exec-completed` | `background` | 7.84:1 | 3:1 | Lulus |
| Teks | `exec-failed-foreground` | `exec-failed-subtle` | 7.93:1 | 4.5:1 | Lulus |
| Teks | `exec-failed-foreground` | `card` | 9.22:1 | 4.5:1 | Lulus |
| Teks | `exec-failed-foreground` | `muted` | 7.78:1 | 4.5:1 | Lulus |
| Non-teks | `exec-failed` | `card` | 5.73:1 | 3:1 | Lulus |
| Non-teks | `exec-failed` | `background` | 6.33:1 | 3:1 | Lulus |
| Teks | `exec-cancelled-foreground` | `exec-cancelled-subtle` | 8.07:1 | 4.5:1 | Lulus |
| Teks | `exec-cancelled-foreground` | `card` | 9.59:1 | 4.5:1 | Lulus |
| Teks | `exec-cancelled-foreground` | `muted` | 8.09:1 | 4.5:1 | Lulus |
| Non-teks | `exec-cancelled` | `card` | 4.92:1 | 3:1 | Lulus |
| Non-teks | `exec-cancelled` | `background` | 5.44:1 | 3:1 | Lulus |
| Teks | `exec-suspended-foreground` | `exec-suspended-subtle` | 8.24:1 | 4.5:1 | Lulus |
| Teks | `exec-suspended-foreground` | `card` | 9.65:1 | 4.5:1 | Lulus |
| Teks | `exec-suspended-foreground` | `muted` | 8.14:1 | 4.5:1 | Lulus |
| Non-teks | `exec-suspended` | `card` | 6.36:1 | 3:1 | Lulus |
| Non-teks | `exec-suspended` | `background` | 7.02:1 | 3:1 | Lulus |
| Teks | `human-foreground` | `human-subtle` | 8.07:1 | 4.5:1 | Lulus |
| Teks | `human-foreground` | `card` | 9.59:1 | 4.5:1 | Lulus |
| Teks | `human-foreground` | `muted` | 8.09:1 | 4.5:1 | Lulus |
| Non-teks | `human` | `card` | 4.92:1 | 3:1 | Lulus |
| Non-teks | `human` | `background` | 5.44:1 | 3:1 | Lulus |
| Teks | `agent-foreground` | `agent-subtle` | 7.99:1 | 4.5:1 | Lulus |
| Teks | `agent-foreground` | `card` | 9.35:1 | 4.5:1 | Lulus |
| Teks | `agent-foreground` | `muted` | 7.89:1 | 4.5:1 | Lulus |
| Non-teks | `agent` | `card` | 5.87:1 | 3:1 | Lulus |
| Non-teks | `agent` | `background` | 6.48:1 | 3:1 | Lulus |

</details>
