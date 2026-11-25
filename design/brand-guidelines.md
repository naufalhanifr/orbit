# ORBIT Brand Guidelines

Versi 2.0 · 2026-11-25 · Pemilik: Founder (EVORA Studio) · Mengikuti PRD v1.15
Berlaku untuk: Web UI ORBIT, dokumentasi produk, notifikasi, dan materi tentang ORBIT.
Pendamping: [`design-system.md`](design-system.md) (spesifikasi), implementasi di [`shadcn/`](shadcn/), token di [`shadcn/app/globals.css`](shadcn/app/globals.css), dan mockup di [`mockups/`](mockups/).

---

## 1. Positioning

**ORBIT is the Operating System for AI-Powered Teams.**

ORBIT adalah tempat Founder menyusun human dan AI Agent dalam satu struktur organisasi, lalu memberi mereka pekerjaan yang jelas, batas yang jelas, dan jejak yang bisa diperiksa. ORBIT bukan sekadar project management tool. ORBIT adalah ruang kendali tempat pekerjaan direncanakan, dijalankan agent, dan di-review manusia.

| | |
|---|---|
| Untuk siapa | Founder dan tim kecil yang bekerja bersama AI Agent. Di MVP hanya Founder. |
| Masalah | AI Agent bisa bekerja, tetapi tanpa struktur pekerjaan mereka sulit diarahkan, diawasi, dan dibatasi biayanya. |
| Janji | Setiap pekerjaan punya pemilik, setiap execution punya batas, dan setiap hasil bisa diperiksa. |
| Pembeda | Struktur organisasi nyata (matriks per proyek), kontrol token yang aktif (bukan hanya memantau), dan agent yang hanya berjalan bila ada trigger sah. |

Kalimat pendek yang boleh dipakai: *Organize Projects. Coordinate Agents. Ship within policy.*

## 2. Kepribadian

Tema visual dan verbal: **minimalis**. ORBIT terasa seperti ruang kendali yang tenang. Informasinya padat, tetapi tidak berisik.

| Kami | Bukan |
|---|---|
| **Tenang.** Status buruk disampaikan datar dan jelas, tanpa panik. | Dramatis, penuh tanda seru. |
| **Tegas.** Menyebut apa yang terjadi, siapa pelakunya, dan langkah berikutnya. | Samar ("Terjadi kesalahan"). |
| **Jujur soal biaya dan risiko.** Pemakaian token, timeout, dan aksi yang tidak bisa dibatalkan selalu disebut. | Menyembunyikan konsekuensi. |
| **Manusia memegang kendali.** Agent adalah rekan kerja yang dibatasi policy, bukan sihir. | "AI magic", "autopilot", hype. |

## 3. Tone of Voice

**Bahasa UI: Inggris penuh** (keputusan Founder, 2026-11-25). Semua teks di antarmuka, notifikasi, dan pesan error memakai bahasa Inggris. Nama status, peran, dan istilah domain ditulis persis seperti di PRD: Backlog, In Progress, Founder Approval, Revision, Execution, Agent, Founder, PR. Dokumen internal seperti file ini boleh tetap berbahasa Indonesia.

**Prinsip menulis:**
1. **Subjek jelas.** Sebut pelakunya: "Shared Specialist opened PR #18", bukan "PR opened".
2. **Satu kalimat, satu fakta.** Detail teknis (log, stack trace) diletakkan di panel yang bisa dibuka, bukan di pesan utama.
3. **Angka konkret** dengan format en-US: "84,200 / 300,000 tokens", bukan "almost out".
4. **Kata kerja spesifik di tombol:** "Stop execution", "Create agent", "Review ORB-9". Hindari "OK", "Submit", "Learn more", "Get started".
5. **Tanpa hype, tanpa emoji, tanpa em dash.** Hindari *revolutionary*, *seamless*, *supercharge*, *AI-powered*.
6. **Sentence case** untuk judul dan tombol ("Create task", bukan "Create Task"). Nama status tetap seperti di PRD.
7. **Agent tidak berpura-pura manusia.** Status agent ditulis sebagai fakta sistem.
8. **Tidak menyalahkan pengguna.** Pesan error menjelaskan apa yang terjadi dan apa yang bisa dilakukan.

### 3.1 Microcopy: status

Label status memakai nama dari PRD. Teks bantu di bawah ini dipakai untuk tooltip atau baris kedua.

| Status agent (PRD 10) | Teks bantu |
|---|---|
| Idle | Not working on a task. Uses no tokens until invoked. |
| Running | Working on *ORB-11 Stream execution logs to the web UI* · 18m 40s · 84,200 tokens |
| Blocked | Stopped mid-task: *ORB-10 is Blocked*. Open the task to unblock it. |

| Status execution | Teks bantu |
|---|---|
| Preparing | Starting the container and loading the agent’s instructions and task context. |
| Waiting for Input | The agent needs your decision to continue. Suspends automatically after 30 minutes. |
| Suspended | No answer within 30 minutes. State is saved; resume any time. |
| Failed | 2 tests still fail after 3 attempts. PR opened as draft. |

### 3.2 Microcopy: empty state "belum ada agent"

Organisasi selalu dimulai dengan 0 agent (PRD 4.4), jadi ini layar pertama yang dilihat Founder.

> **No agents yet**
> Your organization starts empty, and you decide who works here. Agents without a manager report directly to you.
> [ Create your first agent ]

Variasi singkat (daftar @mention tanpa hasil): *No agent with that name in this project.*

### 3.3 Microcopy: error

| Situasi | Judul | Isi | Aksi |
|---|---|---|---|
| Execution gagal | Execution failed | Shared Specialist stopped at "Running tests": 2 tests failed. PR opened as draft and the task is Blocked. | View log · Open draft PR |
| Timeout | Execution passed 60 minutes | The execution was stopped automatically. Changes up to this point are on branch `orb-12-login`. | View log · Run again |
| GitHub | Can’t reach GitHub | ORBIT can’t access the *sandbox* repo. Check the GitHub App installation. | Try again |
| Papan gagal dimuat | Tasks couldn’t load | The server didn’t respond within 10 seconds. Tasks already on screen are unchanged. | Reload board |
| Validasi form | (inline, di bawah field) | Enter instructions. The agent works only from these. | (tidak ada) |
| Login terkunci | Too many attempts | Sign-in is locked for 15 minutes. | (tidak ada) |

Pola error: **apa yang terjadi, dampaknya, lalu apa yang bisa dilakukan.** Jangan menampilkan kode error mentah tanpa penjelasan.

### 3.4 Microcopy: konfirmasi Stop execution

Pakai `AlertDialog` (`StopExecutionDialog`, lihat design-system §5). Angka di contoh ini hanya ilustrasi; di UI selalu diisi data execution yang sebenarnya. Tombol aksi memakai kata kerja spesifik dengan varian `destructive`.

> **Stop this execution?**
> Shared Specialist is working on ORB-11 Stream execution logs to the web UI (18m 40s, 84,200 tokens used). The execution stops now and becomes Cancelled. Uncommitted changes are lost. Tokens already used stay on record.
>
> [ Cancel ]  [ Stop execution ]

Setelah berhasil, kartu execution menampilkan: *Stopped by the Founder. Task returned to Assigned.*

### 3.5 Microcopy lain

- Strip fokus di papan (PRD 4.4): judul *Waiting on you* + jumlah. Baris dan tombolnya:
  - *PR #18 is ready for review* · [Review ORB-9]
  - *Shared Specialist asked a question* · [Answer in chat]
  - *EXE-468 was suspended after 30 minutes without an answer* · [Resume EXE-468]
  - *Blocked: 2 tests still fail after 3 attempts.* · [Review blocker]
- Placeholder composer chat: *Mention an agent with @name. Agents only work when you invoke them.*
- Pesan tanpa @mention: *No agent mentioned. Saved without starting an execution.*
- Keterangan komentar task (PRD 17.4):
  - Mention assignee yang sedang bekerja: *Sent to the running execution as an extra instruction.*
  - Mention agent lain: *Started a new invocation for PO 1.*
  - Tanpa mention: *Note only. Agents won’t read it until they are next invoked.*
- Dependency: *Moves on automatically once ORB-11 is Done.*
- Kolom Kanban kosong: *Empty*.
- Task dari chat: label *from chat*.
- Request revision (dialog): *The task returns to In Progress. Feedback goes to the agent and counts as one revision cycle.*
- Agent Builder, Reports to kosong: *No agent manager* · *Without an agent manager, the agent sits directly under the Founder.*
- Atribusi runtime: *Powered by Claude* (jangan menyebut "Claude Code" di UI, PRD 18.1).

## 4. Logo

Logo ORBIT adalah **logo 2D datar**. File ada di [`design/logo/`](logo/).

**Status:** versi 1, dibuat atas permintaan Founder (logo ORBIT 2D). Menunggu persetujuan Founder sebelum dipakai di luar aplikasi.

**Konsep:** sebuah inti (titik tengah) dikelilingi lintasan orbit yang terbuka di satu titik, tempat sebuah satelit berada. Inti melambangkan Founder dan tujuan organisasi. Lintasan melambangkan struktur kerja. Satelit melambangkan agent yang bergerak di dalam batas yang ditetapkan. Celah di lintasan menegaskan bahwa satelit adalah bagian dari lintasan, bukan hiasan. Pada wordmark, simbol ini sekaligus menjadi huruf **O**. Huruf RBIT digambar dengan garis geometris berketebalan sama dengan lintasan, sehingga tidak bergantung pada font.

| File | Pakai untuk |
|---|---|
| `orbit-logo.svg` | Logo horizontal di latar terang (halaman login, header dokumen). |
| `orbit-logo-dark.svg` | Logo horizontal di latar gelap. |
| `orbit-logo-mono.svg` | Satu warna (`currentColor`), mengikuti warna teks. Dipakai di dalam aplikasi. |
| `orbit-mark.svg` / `-dark` / `-mono` | Simbol saja: sidebar ringkas, avatar sistem, favicon. |
| `orbit-app-icon.svg` | Ikon aplikasi / PWA / favicon besar (simbol di kotak `#0a0a0a`). |

**Warna logo.** Inti dan lintasan memakai warna foreground: `#0a0a0a` di latar terang, `#fafafa` di latar gelap. Satelit adalah satu-satunya aksen, memakai primary: `#1141d5` di latar terang, `#51a2ff` di latar gelap. Versi mono seluruhnya satu warna.

**Clear space.** Ruang kosong minimal di semua sisi = diameter satelit × 2 (≈ 1/6 tinggi simbol).

**Ukuran minimum.** Simbol 16 px (favicon). Logo horizontal tinggi 20 px.

**EVORA Studio.** Belum ada logo EVORA. Sampai ada, tulis sebagai teks *by EVORA Studio* dalam `text-xs text-muted-foreground`. Jangan dikunci (lock-up) dengan logo ORBIT.

**Jangan:**
- Menambah gradien, bayangan, glow, efek 3D, atau outline.
- Mengganti warna satelit dengan warna status (hijau, merah, dan lainnya).
- Memutar, memiringkan, atau meregangkan logo.
- Mengetik ulang "ORBIT" dengan font untuk menggantikan wordmark.
- Menaruh logo berwarna di atas foto atau latar ramai. Gunakan versi mono.

## 5. Warna

Palet minimalis: **netral tinta + satu aksen + tiga sinyal.** Basisnya palet shadcn di repo (`baseColor: neutral`, primary biru). Perubahan nilai hanya dilakukan demi kontras AA. Kalau sebuah warna tidak menyampaikan aksi utama atau sinyal, warnanya netral.

### 5.1 Warna inti

| Peran | Token | Light | Dark | Kegunaan |
|---|---|---|---|---|
| Background | `--background` | `#ffffff` | `#0a0a0a` | Latar halaman. |
| Foreground / tinta | `--foreground` | `#0a0a0a` | `#fafafa` | Teks utama, avatar agent, status "sedang dikerjakan". |
| Card | `--card` | `#ffffff` | `#171717` | Kartu task, panel, dialog. |
| Muted | `--muted` / `--muted-foreground` | `#f5f5f5` / `#696969` | `#262626` / `#a1a1a1` | Wadah kolom, teks bantu, metadata. |
| Border | `--border` | `#e5e5e5` | putih 10% | Pemisah dekoratif. |
| Input | `--input` | `#8c8c8c` | putih 36% | Batas field dan bingkai avatar human (≥ 3:1). |
| **Primary (aksen)** | `--primary` | `#1141d5` | `#51a2ff` | Satu tombol aksi utama per layar, satelit logo dan `OrbitIndicator`, cincin fokus. |
| Destructive | `--destructive` | `#c90f1a` | `#ff6467` | Stop execution, batalkan task. |

Nilai di atas adalah konversi hex dari oklch di `globals.css` (sumber kebenaran).

### 5.2 Sinyal status

| Tone | Makna | Dipakai oleh |
|---|---|---|
| Netral | Belum berjalan atau tidak aktif | Backlog, Assigned, Cancelled, Queued, Preparing, agent Idle |
| Tinta | Sedang dikerjakan | In Progress, Running (execution dan agent) |
| **Amber** | **Menunggu kamu** (Founder) | Founder Approval, Waiting for Input, Suspended |
| Merah | Bermasalah | Blocked (task dan agent), Failed |
| Hijau | Selesai dengan hasil | Done, Completed |

Biru tidak dipakai untuk status, supaya tetap bekerja sebagai aksen. Human dan agent dibedakan oleh bentuk dan isi warna (lingkaran terang vs kotak membulat berwarna tinta), bukan oleh warna tambahan.

## 6. Tipografi

Mengikuti setup di `design/shadcn/app/layout.tsx`:

| Peran | Font | Catatan |
|---|---|---|
| UI dan heading | **Noto Sans** (`--font-sans`, `--font-heading`) | Alasan: sudah dipasang di proyek shadcn; humanis dan netral sehingga teks panjang (deskripsi task, chat) tetap nyaman dibaca, dan cakupan glyph-nya luas untuk nama orang dan proyek. |
| Data teknis | **Geist Mono** (`--font-mono`) | Alasan: sudah dipasang di proyek; lebar karakter seragam membuat ID, hash, dan angka token sejajar, dan 0/O serta 1/l mudah dibedakan. Hanya untuk data teknis berukuran kecil, tidak untuk heading. Dipakai untuk ID task (`ORB-12`), nama branch, hash commit, angka token, durasi, log execution, kode. |

Gunakan angka tabular (`tabular-nums`) untuk kolom angka dan penghitung token yang berubah. Skala lengkap ada di design-system §3.

## 7. Ikonografi

- Library: **lucide** (`lucide-react`). Alasan: sudah menjadi `iconLibrary` di `components.json` proyek dan dipakai internal oleh komponen shadcn, sehingga satu set garis yang sama dipakai di seluruh UI. Jangan mencampur dengan library ikon lain.
- Ikon hanya dipakai bila maknanya langsung terkait konten (status, aksi). Tidak ada ikon dekoratif, dan tidak ada ikon "AI" generik (sparkle, magic, robot, orb).
- Ukuran 16 px (`size-4`) di dalam teks dan tombol; 14 px (`size-3.5`) di badge padat; 20 px untuk empty state. Stroke bawaan 2.
- Ikon status (selalu dipasangkan dengan teks):

Daftar ikon per status ada di design-system §2.3. Status yang sedang berjalan (In Progress, Running) tidak memakai ikon lucide; ikonnya adalah `OrbitIndicator` (lintasan + satelit), yang statis dan tanpa animasi. Tombol Stop memakai `square`.

- Ikon tanpa label wajib memiliki `aria-label` dan `Tooltip`.

## 8. Do & Don't

| Do | Don't |
|---|---|
| Satu tombol primary per layar atau area kerja. Sisanya `outline` atau `ghost`. | Beberapa tombol biru berdampingan, atau biru dipakai untuk status. |
| Status = ikon + teks + warna. | Status hanya berupa warna atau hanya titik. |
| Bedakan agent dan human lewat bentuk avatar (kotak vs lingkaran), warna, **dan** label "Agent". | Membedakan hanya dengan warna. |
| Tampilkan token dan durasi di setiap execution. | Menyembunyikan biaya di halaman lain. |
| Latar datar, border tipis, tanpa bayangan kecuali overlay. | Gradien, glassmorphism, glow, blob dekoratif, ilustrasi 3D, latar grid/titik. |
| Status ditandai badge atau baris teks. | Garis warna tipis di tepi kiri kartu sebagai penanda. |
| Tanda baca biasa: koma, titik, titik dua, kurung. | Em dash (tanda pisah panjang) di teks UI dan dokumen. |
| Teks bantu pakai `muted-foreground`. | Menurunkan opacity teks untuk membuat teks bantu (bisa gagal kontras). |
| Gerak hanya untuk hover, focus, dan transisi overlay bawaan. | Animasi berulang (spinner, denyut skeleton), confetti, efek ketik. |
| Microcopy yang menyebut pelaku, angka, dan langkah berikutnya. | "Oops!", "Something went wrong", emoji, CTA generik ("Learn more", "Get started", "Explore"). |
| Konfirmasi untuk aksi yang tidak bisa dibatalkan, misalnya Stop execution. | Konfirmasi untuk hal kecil yang bisa di-undo. |
