# Menjalankan ORBIT di komputer lokal (macOS)

Langkah dari clone sampai halaman login terbuka di browser. Diuji di
container Linux (backend + frontend lengkap, login lewat proxy `/api`
berhasil). Langkah khusus macOS (instal Docker Desktop, Homebrew) **belum
diuji di sini** — tandai di bawah.

## 1. Prasyarat

- **Docker Desktop** (untuk Postgres 16). Jika belum ada, unduh di
  https://www.docker.com/products/docker-desktop/ dan buka sekali supaya
  daemon-nya jalan.
- **Node.js 22 LTS** (Next.js 16 butuh ≥ 20.9). Cek versi:

  ```bash
  node -v
  ```

- **Python 3.12 atau lebih baru** (backend butuh ≥ 3.12). Cek versi:

  ```bash
  python3 --version
  ```

Kalau Node/Python belum ada atau versinya kurang, pasang lewat Homebrew:

```bash
brew install node@22 python@3.12
```

## 2. Clone repo

```bash
git clone <url-repo-orbit>
cd orbit
```

## 3. Jalankan Postgres

```bash
cd backend
docker compose up -d db
```

Tunggu sampai sehat:

```bash
docker compose ps
```

Status `db` harus `Up ... (healthy)`.

## 4. Siapkan backend (virtualenv + migrasi)

```bash
python3 -m venv .venv
```

```bash
source .venv/bin/activate
```

```bash
pip install -e ".[dev]"
```

```bash
cp .env.example .env
```

Edit `.env`, set `ORBIT_COOKIE_SECURE=false` (perlu untuk login lewat http
di localhost).

```bash
alembic upgrade head
```

## 5. Buat akun Founder

```bash
python -m orbit.cli create-founder --email founder@example.com --name "Founder" --org "EVORA" --password-stdin
```

Perintah ini minta password lewat stdin (ketik lalu Enter), minimal 12
karakter. Tanpa `--password-stdin`, CLI minta password interaktif dua kali
(ketik + konfirmasi) tanpa tampil di layar.

## 6. Jalankan backend

Di terminal yang masih aktif virtualenv-nya (masih di folder `backend`):

```bash
uvicorn orbit.main:app --reload
```

Backend jalan di http://localhost:8000 (dokumentasi API di
http://localhost:8000/docs). Biarkan terminal ini tetap jalan.

## 7. Jalankan frontend

Buka terminal baru:

```bash
cd frontend
npm ci
```

```bash
npm run dev
```

Frontend jalan di http://localhost:3000. Biarkan terminal ini tetap jalan.

## 8. Buka di browser dan login

Buka http://localhost:3000/login, masukkan email dan password Founder dari
langkah 5.

## 9. Cara berhenti

- Hentikan frontend: `Ctrl+C` di terminal frontend.
- Hentikan backend: `Ctrl+C` di terminal backend.
- Hentikan Postgres:

  ```bash
  cd backend
  docker compose down
  ```

  (Data Postgres tetap tersimpan di volume Docker; `docker compose up -d db`
  nanti memulihkannya. Untuk menghapus data juga: `docker compose down -v`.)

## 10. Troubleshooting

**Port 5432/8000/3000 sudah dipakai program lain**
Cari dan hentikan proses yang memakai port itu, atau ganti port:
- Postgres: ubah mapping port di `backend/docker-compose.yml` (`"5432:5432"`).
- Backend: `uvicorn orbit.main:app --reload --port 8001`, lalu set
  `ORBIT_API_URL=http://localhost:8001` saat jalankan frontend.
- Frontend: `npm run dev -- -p 3001`.

**Docker Desktop belum jalan**
`docker compose up -d db` gagal dengan error "Cannot connect to the Docker
daemon". Buka Docker Desktop, tunggu ikonnya jadi hijau/stabil, ulangi
perintah.

**Migrasi (`alembic upgrade head`) gagal**
- Pastikan `docker compose ps` menunjukkan `db` sudah `healthy` sebelum
  migrasi dijalankan.
- Pastikan `.env` berisi `ORBIT_DATABASE_URL` yang benar (lihat
  `.env.example`); default-nya cocok dengan `docker-compose.yml`.
- Kalau database lama rusak/korup, hapus volume dan ulang dari langkah 3:

  ```bash
  docker compose down -v
  docker compose up -d db
  alembic upgrade head
  ```

**Password Founder ditolak ("Password must be at least 12 characters")**
Pakai password minimal 12 karakter.

**Lupa password Founder**
Dari folder `backend` dengan virtualenv aktif:

```bash
python -m orbit.cli reset-password --email founder@example.com
```

Perintah ini mencabut semua session yang sedang login dan membuka kunci
login (lockout) akun itu.

---

## Status pengujian

Diuji di container Linux ini, urutan penuh clone → login:

| Langkah | Hasil |
|---|---|
| `docker compose up -d db` | Postgres 16 `healthy` |
| venv + `pip install -e ".[dev]"` | OK |
| `alembic upgrade head` | OK, migrasi sampai revisi terbaru (0006) |
| `create-founder --password-stdin` | "Founder created." |
| `uvicorn orbit.main:app` | `/docs` → 200, `/auth/login` → 200, `/auth/me` kembalikan data Founder |
| `npm ci` + `npm run dev` | Next.js jalan di :3000, `/login` → 200, judul "Sign in · ORBIT" |
| Login lewat proxy frontend (`/api/auth/login` → `/api/auth/me`) | 200, kembalikan data Founder — proxy `/api` ke backend berfungsi |

**Belum diuji di sini (khusus macOS, perlu komputer Founder):**
- Instalasi Docker Desktop dan Homebrew sungguhan di macOS.
- Login lewat browser asli (hanya diuji lewat `curl`, bukan klik UI).
- Perilaku form login (validasi, pesan error) di browser.

Folder `frontend/` sudah ada dan lengkap (bukan "menyusul") — bagian
frontend di atas sudah final, bukan draf.
