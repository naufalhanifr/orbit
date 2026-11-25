# ORBIT Design System

Versi 3.2 · 2026-11-25 · Mengikuti PRD v1.16 · shadcn preset `b1ZzrZc6S` (`base-mira`)
Bahasa UI: Inggris penuh. Implementasi: [`design/shadcn/`](shadcn/) · Brand: [`brand-guidelines.md`](brand-guidelines.md) · Logo: [`logo/`](logo/) · Mockup: [`mockups/`](mockups/)

Design system ini **adalah kode di `design/shadcn`**. Dokumen ini menjelaskan keputusan dan aturannya. Kalau dokumen dan kode berbeda, yang dianggap benar adalah kode, lalu dokumen ini diperbaiki.

---

## 0. Fondasi dan peta file

| Hal | Nilai |
|---|---|
| Stack | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Komponen | shadcn/ui style **`base-mira`** (primitive Base UI), `baseColor: neutral`, ikon `lucide` (lihat `components.json`). Diterapkan dengan `npx shadcn@latest apply --preset b1ZzrZc6S`. |
| Token | [`shadcn/app/globals.css`](shadcn/app/globals.css), satu-satunya sumber token |
| Font | Noto Sans (`--font-sans`, juga heading) dan Geist Mono (`--font-mono`) lewat `next/font` di `app/layout.tsx` |
| Tema | `next-themes`, class `.dark`, default mengikuti sistem, tombol ganti tema di sidebar |
| Cek kontras | `python3 design/scripts/contrast.py` (membaca `globals.css`, exit 1 bila ada yang gagal) |

| Folder | Isi |
|---|---|
| `components/ui/` | Komponen shadcn asli (ditambahkan lewat `npx shadcn@latest add …`). Tidak diubah. |
| `components/orbit/` | Pola khusus ORBIT, dirakit dari `components/ui`. |
| `lib/orbit-data.ts` | Data contoh untuk review desain. Bukan data nyata. |
| `app/<route>/page.tsx` | Satu halaman per layar MVP. |

Cara menjalankan: `cd design/shadcn && npm install && npm run dev`, lalu buka `/board`.

## 1. Arah desain

> Dibaca sebagai: web app operasional untuk satu Founder yang mengarahkan AI Agent, dengan bahasa visual minimalis Swiss di atas shadcn `base-mira`, dial **ENERGY 1 / RHYTHM 1 / MOTION 1**.

Sumber arah:
- Founder: tema minimalis, mengikuti shadcn di repo, logo ORBIT 2D.
- ui-ux-pro-max `--design-system` (density 8, variance 2, motion 2): **Minimalism & Swiss Style**, primary tinta, cocok untuk dashboard dan tool profesional.
- antislop mode **during**.

| Dial | Nilai | Artinya di ORBIT |
|---|---|---|
| ENERGY | 1 | Alat kerja harian. Satu titik fokus per layar: hal yang menunggu keputusan Founder. |
| RHYTHM | 1 | Keseragaman disengaja. Kolom, kartu, dan baris harus bisa dipindai cepat. |
| MOTION | 1 | Hanya state hover, focus, dan pressed, plus transisi overlay bawaan shadcn. Tidak ada animasi berulang. Skeleton tidak berdenyut. |

**Motif identitas: orbit.** Lintasan dan satelit dari logo dipakai ulang sebagai indikator pekerjaan yang sedang berjalan (`OrbitIndicator`). Lintasan mewakili timeout execution 60 menit, dan posisi satelit menunjukkan waktu yang sudah berjalan, jadi motif ini membawa data, bukan dekorasi. (Sejak PRD v1.15 tidak ada batas token di MVP, sehingga timeout menjadi satu-satunya batas.) Simbol `OrbitMark` versi mono menggantikan ilustrasi di empty state.

**Satu aksen.** Biru `--primary` hanya dipakai di tiga tempat: tombol aksi utama (satu per layar), satelit (logo dan `OrbitIndicator`), dan cincin fokus.

### Keputusan dan alasan (antislop R-31)

| Keputusan | Alasan |
|---|---|
| Palet: netral tinta + satu aksen biru + tiga sinyal | R-29 (maksimal 2–3 warna inti + 1 aksen). Founder perlu membedakan "menunggu saya", "bermasalah", dan "selesai" dalam sekali lirik. Status lain cukup ikon + label. |
| Sedang dikerjakan = tinta, bukan biru | Biru hanya untuk aksen; kalau ikut dipakai untuk status, kekuatannya sebagai aksen hilang. |
| Amber = menunggu Founder | Founder Approval, Waiting for Input, dan Suspended punya arti yang sama: bola ada di tangan Founder. |
| Agent = kotak membulat tinta, human = lingkaran terang berbingkai | Pelaku adalah konsep inti ORBIT. Bentuknya berbeda, jadi tetap terbaca tanpa warna. Tidak memakai ikon robot (R-04). |
| Sudut membulat dari `--radius` | Bawaan `base-mira`: kontrol `rounded-md`, kartu dan panel `rounded-lg`, dialog `rounded-xl`, badge pill. Komponen ORBIT memakai skala yang sama supaya konsisten dengan komponen shadcn. |
| Tanpa bayangan pada kartu | Hierarki dibuat dengan border tipis (`ring-foreground/10`) dan latar. Bayangan hanya untuk overlay. |
| Blur pada backdrop dialog dan sheet | Bawaan shadcn. Hanya di overlay modal (R-10 membatasi 1–2 elemen), tujuannya memisahkan lapisan modal dari halaman. |
| Kartu hanya untuk task, execution, node org, dan angka pemakaian token | Hanya untuk objek yang bisa dibuka, dipindah, atau dibandingkan. Sisanya list dan tabel. |
| Noto Sans + Geist Mono | Sudah dipasang di proyek. Noto Sans nyaman untuk teks panjang (deskripsi task, chat). Geist Mono menyejajarkan ID, hash, dan angka token. |
| Ikon lucide | `iconLibrary` proyek dan dipakai internal oleh komponen shadcn. Ikon hanya untuk status dan aksi; setiap ikon status punya label teks. |
| Kolom Kanban 264 px, scroll horizontal | Tujuh status MVP tidak muat di satu layar. Region scroll bisa difokus dan digeser dengan keyboard. |

## 2. Token

Semua token ada di `globals.css`, untuk `:root` dan `.dark`. Kelas Tailwind dibentuk dari nama token, misalnya `bg-task-done-subtle text-task-done-foreground` untuk badge dan `bg-task-done` untuk titik.

### 2.1 Inti shadcn

Nama dan format token mengikuti shadcn/ui: `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--input`, `--ring`, `--chart-1..5`, `--sidebar-*`, `--radius`. Nilainya default proyek, kecuali yang diubah demi kontras AA (lihat §7.2).

### 2.2 Tone

Setiap tone punya tiga varian: **solid** untuk titik dan ikon (≥ 3:1), **subtle** untuk latar badge, dan **foreground** untuk teks (≥ 4.5:1).

| Tone | Makna |
|---|---|
| `neutral` | Belum berjalan, berhenti tanpa hasil, atau tidak aktif |
| `ink` | Sedang dikerjakan |
| `amber` | Menunggu Founder |
| `red` | Bermasalah |
| `green` | Selesai dengan hasil |

### 2.3 Status ke tone

| Task (PRD 15.1, MVP) | Tone | Ikon |
|---|---|---|
| Backlog | neutral | `circle-dashed` |
| Assigned | neutral | `circle` |
| In Progress | ink | `OrbitIndicator` |
| Founder Approval | amber | `git-pull-request` |
| Blocked | red | `octagon-alert` |
| Done | green | `circle-check` |
| Cancelled | neutral (judul dicoret) | `circle-slash` |

| Execution (PRD 18.3) | Tone | Ikon |
|---|---|---|
| Queued | neutral | `clock` |
| Preparing (Preparing Context, PRD 18.3) | neutral | `hourglass` |
| Running | ink | `OrbitIndicator` |
| Waiting for Input | amber | `message-circle-question` |
| Completed | green | `check` |
| Failed | red | `x` |
| Cancelled | neutral | `circle-slash` |
| Suspended | amber (perlu di-resume Founder) | `circle-pause` |

| Agent (PRD 10, lifecycle) | Tone | Ikon |
|---|---|---|
| Idle | neutral | `circle` |
| Running | ink | `OrbitIndicator` |
| Blocked | red | `octagon-alert` |

Status agent diturunkan sistem dari task dan execution-nya, tidak diubah manual (PRD 10, v1.15). Blocked berarti agent berhenti di tengah pekerjaan: task Blocked, execution Waiting for Input, Suspended, atau Failed. Pengarsipan bukan status.

Tidak ada status task Revision (PRD 15.1, v1.15). "Request revision" mengembalikan task ke In Progress dengan feedback wajib; kartu menampilkan "Revision 1. Feedback: …" sebagai baris konteks.

Pelaku: `--human` / `--human-foreground` (lingkaran terang dengan bingkai `--input`) dan `--agent` / `--agent-foreground` (kotak membulat `rounded-md` berwarna tinta, terbalik di dark mode).

## 3. Spacing, radius, tipografi, elevation

**Spacing.** Skala Tailwind basis 4 px. Langkah yang dipakai: 1 (4), 1.5 (6), 2 (8), 3 (12), 4 (16), 6 (24), 8 (32).
- Kartu dan isi kolom: 8–12 px.
- Halaman: 16 px di mobile, 24 px di desktop.
- Jarak antar-section: 24–32 px.

**Radius.** `--radius: 0.625rem` dengan turunan `--radius-sm` sampai `--radius-4xl` (lihat `@theme` di `globals.css`).

| Elemen | Radius |
|---|---|
| Tombol, input, select, menu item, avatar agent, label garis org | `rounded-md` |
| Kartu task, kartu execution, wadah kolom, panel, strip Waiting on you, node org, alert | `rounded-lg` |
| Dialog, empty state | `rounded-xl` (bawaan) |
| Badge status, avatar human, titik status | `rounded-full` |

**Tipografi.**

| Gaya | Kelas | Pemakaian |
|---|---|---|
| Judul halaman | `text-sm font-medium` di header | Satu `h1` per halaman |
| Judul section | `text-sm font-medium` | Kolom, section, judul kartu |
| Body | `text-sm` | Pesan chat, deskripsi task, isi dialog |
| Kontrol | `text-xs/relaxed` (bawaan mira) | Tombol, input, badge, menu |
| Meta | `text-xs text-muted-foreground` | Waktu, assignee, keterangan |
| Data teknis | `font-mono text-xs tabular-nums` | ID task, execution ID, token, durasi, log |
| Angka utama | `font-mono text-2xl font-medium tabular-nums` | Token hari ini |

Berat font hanya 400 dan 500. Tidak ada uppercase dengan tracking lebar.

**Elevation.**

| Level | Elemen | Perlakuan |
|---|---|---|
| 0 | Halaman | `bg-background` |
| 1 | Kartu, panel | `bg-card ring-1 ring-foreground/10` |
| 1b | Wadah kolom | `bg-muted/60` |
| 2 | Overlay (dialog, sheet, menu, popover) | Bawaan shadcn: `shadow-md`/`shadow-lg` + backdrop |

## 4. Layar MVP dan komponen

| Layar (PRD 4.4) | Route | Pola ORBIT | Komponen shadcn |
|---|---|---|---|
| Kanban, List, detail task (dengan panel execution live dan thread komentar/chat, PRD 17.4) | `/board` | `Board`, `TaskCard`, `TaskSheet`, `TaskThread`, `ExecutionCard`, `ReasonDialog`, `CreateTaskDialog` | `toggle-group`, `button`, `dropdown-menu`, `sheet`, `dialog`, `field`, `input`, `textarea`, `table`, `badge`, `avatar` |
| Project Chat dengan @mention dan planning with PO (PRD 17.10) | `/chat` | `Chat`, `ProposalCard` | `input-group`, `command`, `select`, `item`, `avatar`, `badge` |
| Daftar agent | `/agents` | `AgentList` | `table`, `badge`, `avatar`, `button` |
| Agent Builder | `/agents/new` | `AgentBuilder` | `field`, `input`, `select`, `radio-group`, `checkbox`, `tabs`, `textarea`, `alert` |
| Org chart matriks | `/org` | `OrgChart` | `select`, `sheet`, `avatar`, `badge` (garis memakai SVG) |
| Dashboard token dan execution log dengan Stop | `/dashboard` | `Dashboard`, `ExecutionCard`, `StopExecutionDialog` | `progress`, `chart` (Recharts), `table`, `alert-dialog` |
| State kosong, memuat, gagal | `/states` | `NoAgents`, `BoardLoading`, `BoardError` | `empty`, `skeleton`, `alert` |
| Shell | semua | `AppShell` | `sidebar`, `button`, `tooltip` |

Aksi task mengikuti state machine MVP (PRD 15.1). UI hanya menawarkan transisi milik Founder:
- Setujui (Founder Approval ke Done).
- Minta revisi (feedback wajib).
- Pindah ke Assigned (syaratnya: ada acceptance criteria, ada assignee, dan semua dependency Done).
- Tandai Blocked (alasan wajib) dan buka blokir (kembali ke status sebelumnya).
- Batalkan (alasan wajib).

Transisi milik assignee atau system tidak muncul sebagai tombol.

## 5. Pola khusus ORBIT

- **Strip "Waiting on you"** (`WaitingOnYou`, PRD 4.4): titik fokus papan. Panel amber subtle `rounded-lg` dengan jumlah item dan satu baris per item. Setiap baris punya aksi langsung:

  | Item | Aksi |
  |---|---|
  | Task Founder Approval | "Review ORB-9" membuka detail task |
  | Execution Waiting for Input | "Answer in chat" ke Project Chat |
  | Execution Suspended | "Resume EXE-468", lalu konfirmasi "resumed and is queued" |
  | Task Blocked | "Review blocker" membuka detail task |

  Strip hanya tampil bila ada isinya. Badge di sidebar menunjukkan jumlah yang sama. Contoh lengkap keempat jenis item ada di `/states`. Sejak PRD v1.15 tidak ada item konfirmasi budget.
- **StatusBadge**: ikon + label + tone, tanpa border, uppercase, atau glow. Untuk status yang sedang berjalan, ikonnya `OrbitIndicator` dengan posisi satelit sesuai waktu berjalan terhadap timeout 60 menit.
- **ActorAvatar**: human berupa lingkaran `bg-human` dengan `ring-1 ring-input`; agent berupa kotak `bg-agent`. Isinya inisial. Di chat, nama agent diberi label "Agent".
- **TaskCard**: baris atas berisi ID mono, penanda "from chat", dan menu aksi. Lalu judul (sebuah `<button>` yang area kliknya menutupi seluruh kartu), satu baris konteks (alasan blocked, feedback revisi, atau dependency yang ditunggu), dan footer berisi assignee, PR, dan token. Menu aksi adalah alternatif drag (WCAG 2.5.7). Tidak ada garis warna di tepi kartu.
- **Detail task** (`TaskSheet`, PRD 17.4): status, judul, assignee, PR, dan token di header. Bila ada execution berjalan, panel live (`ExecutionCard` dengan log) tampil paling atas. Di bawahnya acceptance criteria, dependency, lalu thread komentar. Aksi Founder di footer.
- **TaskThread**: komentar task sekaligus chat dengan agent. Setiap komentar Founder diberi keterangan rute, sesuai PRD 17.4:
  - Mention assignee yang sedang bekerja: "Sent to the running execution as an extra instruction."
  - Mention agent lain: "Started a new invocation for …"
  - Tanpa mention: "Note only. Agents won’t read it until they are next invoked."
- **ProposalCard** (PRD 17.10, v1.16): usulan breakdown task dari PO, tampil di dalam balasan PO di Project Chat.
  - Header: "Proposed breakdown", jumlah task, kalimat "Nothing is created until you approve", lalu "Reject all" (ghost) dan "Approve all (n)" (primary, satu-satunya tombol primary di kartu).
  - Per task: nomor urut, judul, deskripsi, acceptance criteria, usulan assignee (avatar + nama, atau "No assignee proposed"), dependency ("Depends on task 1"). Aksi per task: Reject (ghost), Edit, Approve (outline).
  - Edit membuka form inline: Title (wajib), acceptance criteria (satu per baris), Assignee. Pilihan assignee hanya agent yang Works in proyek itu dan yang atasan berlakunya di proyek itu adalah PO tersebut.
  - Setelah Approve, baris berubah menjadi "Created as ORB-17 in Backlog" (hijau) dan dependency task lain ikut menampilkan ID nyata ("Depends on ORB-17"). Reject mencoret judul.
  - Task yang bergantung pada task yang ditolak tidak bisa di-approve dan menampilkan "Depends on rejected task 1. Edit or reject this task." Approve all melewati task seperti itu.
  - Usulan tidak pernah tampil di papan; hanya task yang sudah disetujui yang dibuat.
- **AgentBuilder** (PRD 4.4, v1.15): Identity (Name, Title), Structure, Runtime (Model, preset izin `read-only`/`coding`), Instructions (Write/Preview, setiap simpan = versi baru). Tidak ada batas token. Structure berisi dua pilihan terpisah:
  - **Reports to**: `Select` berisi agent yang ada, default "No agent manager" yang berarti langsung di bawah Founder. Tidak ada pilihan "Founder" (Founder adalah human). Atasan per proyek diatur di penugasan proyek, bukan di sini.
  - **Works in**: radio "Selected projects" (dengan checkbox proyek, minimal satu) atau "All projects, including ones created later".
- **ExecutionCard**: agent dan task, status, execution ID, durasi terhadap timeout 60 menit, token terpakai (tanpa batas, PRD v1.15), langkah terakhir, dan (di detail task dan dashboard) daftar tool yang dipanggil serta log. Tombol Stop memakai varian `destructive` dan membuka `AlertDialog` (copy di brand-guidelines §3.4). Setelah dihentikan, status menjadi Cancelled.
- **Node org chart**: Founder di puncak sebagai human (PRD 8.1) dan tidak bisa diklik. Node agent adalah `<button>` yang membuka sheet detail.
  - Garis atasan tetap: solid.
  - Garis atasan per proyek: putus-putus dengan label kode proyek.
  - Filter "Highlight project" menebalkan garis proyek terpilih dengan warna primary dan meredupkan garis lain.
  - Jumlah atasan ditampilkan sebagai teks ("3 managers").
- **Kosong, memuat, gagal**: empty state menyebut penyebab dan satu aksi. Skeleton berbentuk seperti konten aslinya. Pesan error menyebut apa yang gagal dan cara memulihkannya.

## 6. State wajib

| Layar | Kosong | Memuat | Gagal |
|---|---|---|---|
| Papan | Kolom: "Empty". Proyek tanpa task: empty state + Create task | Skeleton kolom dan kartu, tanpa animasi | Alert + "Reload board", data lama tetap tampil |
| Detail task | Tanpa acceptance criteria: penjelasan syarat Assigned | Skeleton di sheet | "Task ORB-xx doesn’t exist or was deleted" + kembali ke papan |
| Chat | Placeholder composer menjelaskan @mention; pesan tanpa mention diberi catatan "Saved without starting an execution" | Skeleton pesan | Pesan gagal terkirim + kirim ulang |
| Agent | 0 agent: empty state `orbit-mark` + "Create your first agent" | Skeleton tabel | Error inline per field, isian tidak hilang |
| Org chart | 0 agent: sama dengan Agent | Skeleton node | Alert + coba lagi; siklus reporting line ditolak dengan pesan inline |
| Dashboard | "No executions yet. No tokens used." | Skeleton angka dan grafik | Log terputus: banner + muat ulang; Stop gagal: alert di dalam dialog |

Yang sudah diimplementasikan di `/states`: empty state 0 agent, skeleton papan, dan error papan. Validasi form dan state Cancelled bisa dicoba langsung di `/board`, `/agents/new`, dan `/dashboard`.

## 7. Aksesibilitas

### 7.1 Aturan yang diterapkan

- **Kontras:** teks minimal 4.5:1, elemen UI minimal 3:1, di light dan dark. Dihitung oleh skrip, lihat §7.3.
- **Warna bukan satu-satunya penanda:**
  - Status = ikon + label.
  - Human vs agent = bentuk + label.
  - Garis org = pola garis + label proyek.
  - Navigasi aktif = latar + `aria-current`.
- **Keyboard:** semua aksi memakai `<button>` atau `<a href>`. Dialog dan sheet menjebak fokus dan ditutup dengan Escape (Base UI). Kanban dan org chart adalah region scroll yang bisa difokus. Menu kartu menggantikan drag.
- **Fokus terlihat:** cincin `--ring` (primary, minimal 7:1 terhadap latar).
- **Affordance:** `cursor: pointer` untuk kontrol aktif dan `not-allowed` untuk yang disabled, diatur sekali di `globals.css`.
- **Target sentuh:** di `pointer: coarse` semua kontrol minimal 44 × 44 px (aturan di `globals.css`). Di mouse, kepadatan `base-mira` dipertahankan (tombol default 28 px, `sm` 24 px). Ukuran `xs` dan `icon-xs` (20 px) tidak dipakai karena di bawah target 24 px (WCAG 2.5.8).
- **Chat:** Enter mengirim, Shift+Enter membuat baris baru, dan Enter saat IME sedang menyusun teks diabaikan. Mengetik `@` memindahkan fokus ke daftar agent; Escape mengembalikan fokus ke composer.
- **Dokumen:** `<html lang="en">` (UI full bahasa Inggris, keputusan Founder), judul unik per halaman, landmark `nav`, `main`, `aside`, dan satu `h1` per halaman.
- **Gerak:** tidak ada animasi berulang. `prefers-reduced-motion` mematikan transisi overlay.

### 7.2 Token yang diubah dari nilai preset

Preset `b1ZzrZc6S` memakai warna default shadcn, dan sebagian gagal AA. ORBIT menimpa nilai berikut di `globals.css`. Setiap kali preset diterapkan ulang, jalankan `contrast.py`: nilai ini bisa tertimpa lagi.

| Token | Mode | Preset | ORBIT | Alasan |
|---|---|---|---|---|
| `--primary` | light | `0.488 0.243 264.4` | `0.46 0.23 264.4` | Teks di atas hover `primary/80`: 4.21 → 4.68 |
| `--muted-foreground` | light | `0.556` | `0.52` | Di atas `--muted`: 4.34 → 5.05 |
| `--destructive` | light | `0.577 0.245 27.3` | `0.53 0.21 27` | Teks di atas `destructive/10`: 3.99 → 4.95 |
| `--input` | light | `0.922` | `0.64` | Batas input: 1.26 → 3.36 |
| `--ring` | light | `0.708` | = primary | Cincin fokus: 2.59 → 7.67 |
| `--chart-1..5` | light | dimulai `0.809` | `0.623 → 0.379` | Setiap batang minimal 3:1 |
| `--primary`, `--ring`, `--sidebar-primary` | dark | `0.424 0.199 265.6` | `0.707 0.165 254.6` | Teks dan cincin di atas latar gelap: 2.24 → 7.51 |
| `--input` | dark | putih 15% | putih 36% | Batas input: 1.47 → 3.26 |
| `--chart-1..5` | dark | sampai `0.424` | `0.809 → 0.546` | Setiap batang minimal 3:1 |

### 7.3 Hasil cek kontras

`python3 design/scripts/contrast.py`: **245 pasangan lulus, 0 gagal** (light dan dark). Cakupannya:
- Semua pasangan inti shadcn.
- Setiap status task, execution, dan agent: teks di atas latar subtle, card, dan muted; titik di atas background dan card.
- Avatar human dan agent.
- Batas input, cincin fokus, dan lima warna grafik.

`--border` tidak diuji karena dekoratif. Tabel lengkapnya bisa dicetak dengan `--markdown`.

### 7.4 Bukti click-through (R-35)

Setiap mockup dijalankan dari `next build` + `next start`, lalu diuji otomatis dengan Playwright. Hasilnya 51 cek lulus dan 0 error di console. Yang diuji:
- Navigasi sidebar ke 5 halaman.
- Kanban ↔ List dan tampilkan Cancelled.
- Waiting on you: 4 item di papan; Review blocker membuka detail; Resume mengubah status; di `/states`, Review tanpa papan menjadi link ke `/board`.
- Review membuka sheet; Escape menutupnya.
- Detail task In Progress menampilkan panel execution live dan tool yang dipanggil.
- Rute komentar: mention assignee menjadi instruksi tambahan, mention agent lain memulai invocation baru, tanpa mention menjadi catatan.
- Blocked tanpa alasan memunculkan error; dengan alasan, task pindah kolom.
- Setujui memindahkan task ke Done.
- Buat task: validasi, lalu task muncul di Backlog.
- Chat: pesan tanpa mention diberi catatan; `@` membuka daftar; Enter menyisipkan nama; Escape menutup daftar.
- Planning with PO: kartu usulan 3 task tampil; Edit menyimpan assignee; Approve task 1 membuat ORB-17; Approve all membuat ORB-18 dan ORB-19 dengan dependency ORB-17; Reject task 1 menonaktifkan Approve task 2; usulan tidak muncul di papan.
- Agent Builder: 4 error saat kosong (termasuk Works in tanpa proyek); All projects menyembunyikan daftar proyek; simpan valid menampilkan "It starts as Idle and reports to CTO."
- Org chart: node membuka sheet, filter proyek berfungsi.
- Tema: terang ↔ gelap.
- Dashboard: badge Preparing tampil.
- Stop: Batal membiarkan execution tetap Running; Hentikan mengubahnya menjadi Cancelled.
- Mobile 390 px: tanpa horizontal overflow di 5 halaman; tombol navigasi membuka sheet.
- Tab memberi fokus ke kontrol.
