# ORBIT Brand Guidelines

Versi 1.0 · 2026-11-25 · Pemilik: Founder (EVORA Studio)
Berlaku untuk: Web UI ORBIT, dokumentasi produk, notifikasi, dan materi tentang ORBIT.
Pendamping: [`design-system.md`](design-system.md) (spesifikasi teknis) dan [`tokens.css`](tokens.css) (token).

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
| **Jujur soal biaya dan risiko.** Token, batas, dan aksi yang tidak bisa dibatalkan selalu disebut. | Menyembunyikan konsekuensi. |
| **Manusia memegang kendali.** Agent adalah rekan kerja yang dibatasi policy, bukan sihir. | "AI magic", "autopilot", hype. |

## 3. Tone of Voice

**Bahasa.** Teks UI ditulis dalam Bahasa Indonesia baku yang santai. Pengguna disapa "kamu". Nama status, peran, dan istilah domain mengikuti PRD dan tidak diterjemahkan: Backlog, In Progress, Review, Execution, Agent, Founder, PR.

**Prinsip menulis:**
1. **Subjek jelas.** Sebut pelakunya: "Agent *Backend Dev* membuka PR #42", bukan "PR dibuka".
2. **Satu kalimat, satu fakta.** Detail teknis (log, stack trace) diletakkan di panel yang bisa dibuka, bukan di pesan utama.
3. **Angka konkret.** "128.400 / 300.000 token", bukan "hampir habis".
4. **Kata kerja di tombol.** "Hentikan execution", "Buat agent". Hindari "OK", "Ya", "Submit".
5. **Tanpa hype dan tanpa emoji.** Hindari kata seperti *revolusioner*, *seamless*, *supercharge*, *unleash*, ✨🚀.
6. **Agent tidak berpura-pura manusia.** Agent tidak memakai "saya merasa". Status agent ditulis sebagai fakta sistem.
7. **Tidak menyalahkan pengguna.** Pesan error menjelaskan keadaan dan jalan keluarnya.

### 3.1 Microcopy: status agent

| Status | Label | Teks bantu (tooltip / baris kedua) |
|---|---|---|
| Idle / Ready | Siap | Menunggu dipanggil. Tidak memakai token. |
| Running | Sedang bekerja | Mengerjakan *ORB-12 Tambah endpoint login* · 4 m 12 d · 38.200 token |
| Waiting for Input | Menunggu jawabanmu | Agent butuh keputusan untuk lanjut. Ditangguhkan otomatis dalam 30 menit. |
| Suspended | Ditangguhkan | Tidak ada jawaban dalam 30 menit. State disimpan, lanjutkan kapan saja. |
| Failed | Gagal | Test gagal setelah 3 percobaan. Lihat log. |
| Draft (belum punya atasan) | Belum siap | Tetapkan atasan agar agent bisa dipakai. |

### 3.2 Microcopy: empty state "belum ada agent"

Ingat: org selalu dimulai dengan 0 agent (PRD §4.4). Empty state ini adalah layar pertama yang dilihat Founder.

> **Belum ada agent**
> Org ORBIT dimulai kosong, dan kamu yang menentukan siapa saja yang bekerja di sini. Agent pertama otomatis menjadi agent puncak yang melapor langsung kepadamu.
> [ Buat agent pertama ]

Variasi singkat (di panel atau dropdown @mention):
> Belum ada agent di proyek ini. **Tambahkan agent** ke proyek untuk memanggilnya di chat.

### 3.3 Microcopy: error

| Situasi | Judul | Isi | Aksi |
|---|---|---|---|
| Budget harian habis | Budget harian tercapai | 3.000.000 dari 3.000.000 token sudah terpakai hari ini. Execution otomatis dijeda sampai 00.00. | Jalankan tetap (perlu konfirmasi) · Lihat pemakaian |
| Execution gagal | Execution gagal | *Backend Dev* berhenti di langkah "Menjalankan test": 2 test gagal. PR dibuka sebagai draft dan task ditandai Blocked. | Lihat log · Buka PR draft |
| Timeout | Execution melewati 60 menit | Execution dihentikan otomatis. Perubahan sampai titik ini tersimpan di branch `orb-12-login`. | Lihat log · Jalankan ulang |
| Koneksi GitHub | Tidak bisa terhubung ke GitHub | ORBIT tidak bisa mengakses repo *sandbox*. Periksa instalasi GitHub App. | Coba lagi |
| Validasi form | (inline, di bawah field) | Atasan wajib diisi, kecuali untuk agent puncak. | (tidak ada) |
| Login terkunci | Terlalu banyak percobaan | Login dikunci sementara selama 15 menit. | (tidak ada) |

Pola error: **apa yang terjadi → dampaknya → apa yang bisa dilakukan.** Jangan menampilkan kode error mentah tanpa penjelasan.

### 3.4 Microcopy: konfirmasi "Stop execution"

Pakai `AlertDialog` (lihat design-system §5.5). Angka di contoh microcopy ini adalah ilustrasi; di UI selalu diisi data execution yang sebenarnya. Tombol aksi bertuliskan kata kerja yang spesifik, dengan varian `destructive`.

> **Hentikan execution ini?**
> *Backend Dev* sedang mengerjakan **ORB-12 Tambah endpoint login** (4 m 12 d, 38.200 token terpakai).
> Execution akan berhenti sekarang dan berstatus Cancelled. Perubahan yang belum di-commit akan hilang. Token yang sudah terpakai tetap tercatat.
>
> [ Batal ]  [ Hentikan execution ]

Setelah berhasil, tampilkan toast: *Execution dihentikan. Task kembali ke Assigned.*

### 3.5 Microcopy lain yang sering dipakai

- Konfirmasi run saat budget habis: **"Jalankan meski budget harian tercapai?"** · "Execution ini bisa memakai hingga 300.000 token di atas batas harian." · [Batal] [Jalankan]
- Empty Kanban kolom: *Kosong*. (Cukup satu kata. Kolom kosong bukan masalah.)
- Empty chat: *Panggil agent dengan @nama. Agent hanya bekerja saat kamu panggil.*
- Task dari chat: label *dari chat*.
- Atribusi runtime: *Powered by Claude* (jangan menyebut "Claude Code" di UI, PRD §18.1).

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

ORBIT memakai palet bawaan proyek shadcn di repo (`baseColor: neutral`, primary biru). Perubahan hanya dilakukan untuk memenuhi kontras AA. Prinsipnya: **netral untuk struktur, biru untuk aksi, warna lain hanya untuk status.** Kalau sebuah warna tidak menyampaikan status atau aksi, warnanya abu-abu.

### 5.1 Warna inti

| Peran | Token | Light | Dark | Kegunaan |
|---|---|---|---|---|
| Background | `--background` | `#ffffff` | `#0a0a0a` | Latar halaman. |
| Foreground | `--foreground` | `#0a0a0a` | `#fafafa` | Teks utama. |
| Card | `--card` | `#ffffff` | `#171717` | Kartu task, panel, dialog. |
| Muted | `--muted` / `--muted-foreground` | `#f5f5f5` / `#696969` | `#262626` / `#a1a1a1` | Latar sekunder, teks bantu, metadata. |
| Border | `--border` | `#e5e5e5` | putih 10% | Pemisah dekoratif. |
| Input | `--input` | `#8c8c8c` | putih 36% | Batas field (≥ 3:1). |
| **Primary** | `--primary` | `#1141d5` | `#51a2ff` | Satu aksi utama per layar, link, fokus, satelit logo. |
| Destructive | `--destructive` | `#c90f1a` | `#ff6467` | Stop execution, hapus, arsipkan. |

Hex di atas adalah konversi dari nilai oklch di `tokens.css` (sumber kebenaran).

### 5.2 Warna status (tone)

Delapan tone. Setiap tone memiliki tiga varian: **solid** untuk titik, ikon, dan garis; **subtle** untuk latar badge; **foreground** untuk teks.

| Tone | Makna | Dipakai oleh |
|---|---|---|
| Gray | Belum dimulai / selesai tanpa hasil | Backlog, Cancelled, Queued, human |
| Sky | Sudah ada pemilik | Assigned |
| Blue | Sedang berjalan | In Progress, Running |
| Amber | **Menunggu kamu** (Founder) | Review, Waiting for Input |
| Orange | Ditangguhkan sistem | Suspended |
| Red | Butuh perhatian, ada masalah | Blocked, Failed |
| Green | Selesai dengan hasil | Done, Completed |
| Violet | **Agent** | avatar, nama, dan label agent |

Amber dipakai secara konsisten untuk "bola ada di tangan Founder". Violet khusus untuk identitas agent dan tidak pernah dipakai sebagai status.

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

| Status | Ikon lucide |
|---|---|
| Backlog | `circle-dashed` |
| Assigned | `circle-user` |
| In Progress | `circle-dot` |
| Review | `git-pull-request` |
| Blocked | `octagon-alert` |
| Done | `circle-check` |
| Cancelled | `circle-slash` |
| Queued | `clock` |
| Running | `loader` (berputar; diam bila reduced motion) |
| Waiting for Input | `message-circle-question` |
| Completed | `check` |
| Failed | `x` |
| Suspended | `circle-pause` |
| Stop | `square` |

- Ikon tanpa label wajib memiliki `aria-label` dan `Tooltip`.

## 8. Do & Don't

| Do | Don't |
|---|---|
| Satu tombol primary per area kerja. Sisanya `outline` atau `ghost`. | Beberapa tombol biru berdampingan. |
| Status = ikon + teks + warna. | Status hanya berupa warna atau hanya titik. |
| Bedakan agent dan human lewat bentuk avatar (kotak vs lingkaran), warna, **dan** label "Agent". | Membedakan hanya dengan warna. |
| Tampilkan token dan durasi di setiap execution. | Menyembunyikan biaya di halaman lain. |
| Latar datar, border tipis, tanpa bayangan kecuali overlay. | Gradien, glassmorphism, glow, blob dekoratif, ilustrasi 3D, latar grid/titik. |
| Status ditandai badge atau baris teks. | Garis warna tipis di tepi kiri kartu sebagai penanda. |
| Tanda baca biasa: koma, titik, titik dua, kurung. | Em dash (tanda pisah panjang) di teks UI dan dokumen. |
| Teks bantu pakai `muted-foreground`. | Menurunkan opacity teks untuk membuat teks bantu (bisa gagal kontras). |
| Animasi hanya untuk status hidup (Running) dan transisi overlay ≤ 200 ms. | Animasi dekoratif, confetti, efek ketik. |
| Microcopy yang menyebut pelaku, angka, dan langkah berikutnya. | "Oops!", "Something went wrong", emoji, CTA generik ("Pelajari", "Mulai", "Get Started"). |
| Konfirmasi untuk aksi yang tidak bisa dibatalkan atau memakan budget besar. | Konfirmasi untuk hal kecil yang bisa di-undo. |
