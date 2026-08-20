# Live Shopping Flash Sale

Platform live commerce untuk proyek kelompok yang menggabungkan streaming produk, flash sale berbasis waktu, chat real-time, dan checkout cepat dalam satu alur. Repositori ini sekarang berisi frontend React + Vite, backend Express + PostgreSQL untuk endpoint inti, realtime service berbasis WebSocket + Redis, media service stub untuk sesi ingest dan playback, dokumen perencanaan produk, dan runtime Docker untuk menjalankan stack awal proyek.

## Ringkasan Proyek

Live Shopping Flash Sale dirancang untuk tiga peran utama:

- Pembeli yang ingin menonton siaran, berinteraksi, dan membeli secepat mungkin.
- Host yang ingin menampilkan produk, mengatur sesi flash sale, dan memantau performa siaran.
- Admin yang ingin memverifikasi host, memoderasi sistem, dan memonitor transaksi.

Value utama produk ini adalah menggabungkan urgensi flash sale dengan kepercayaan dari demonstrasi produk secara live.

## Dokumen Utama

- [Document/DESAIN/README.md](./Document/DESAIN/README.md) berisi desain produk, modul antarmuka, alur pengguna, dan pembagian area kerja.
- [Document/PRD/README.md](./Document/PRD/README.md) berisi kebutuhan bisnis, ruang lingkup MVP, user stories, acceptance criteria, dan milestone.
- [Document/ARCHITECTURE/README.md](./Document/ARCHITECTURE/README.md) berisi arsitektur teknis, diagram sistem, model data, dan deployment Docker.

## Fitur MVP

| Area | Fitur |
|------|-------|
| Discovery | Daftar siaran live dan terjadwal |
| Viewing | Player live, pinned product, countdown, indikator stok |
| Commerce | Buy now, checkout singkat, status order |
| Engagement | Live chat, viewer count, notifikasi sesi |
| Seller Tools | Dashboard host, pengaturan produk, pengaturan sesi flash sale |
| Admin Tools | Verifikasi host, moderasi, monitoring transaksi |

## Tech Stack

- Frontend: React 19, Vite 8, TypeScript, Tailwind CSS v4
- Backend: Node.js, Express, PostgreSQL, pg, idempotent order API
- Realtime: Node.js, Express, WebSocket, Redis pub/sub
- Media control plane: Node.js, Express
- Packaging frontend: Docker multi-stage build + Nginx runtime
- Packaging backend: Docker image terpisah + PostgreSQL di Docker Compose
- Preview lokal: Figma Make preview dan Docker Compose

## Struktur Repositori

```text
live-shopping-flash-sale/
|- src/
|  |- App.tsx               \u2014 router utama, state auth global
|  |- main.tsx
|  |- index.css
|  |- types.ts              \u2014 shared TypeScript types
|  |- utils.ts              \u2014 formatPrice, formatViewer, dll
|  |- api.ts                \u2014 API client dengan fallback mock
|  |- mock-data.ts          \u2014 data demo untuk mode offline
|  |- components/
|  |  |- Header.tsx
|  |  |- StreamCard.tsx
|  |- hooks/
|  |  |- useCountdown.ts    \u2014 countdown timer real-time
|  |  |- useSimulatedChat.ts
|  |  |- useLiveChat.ts     \u2014 WebSocket nyata + fallback simulasi
|  |- pages/
|  |  |- BrowsePage.tsx
|  |  |- LiveRoomPage.tsx
|  |  |- AuthModal.tsx
|  |  |- HostDashboard.tsx
|  |  |- AdminDashboard.tsx
|  |  |- BuyerOrders.tsx
|- backend/
|  |- src/
|  |  |- app.js             \u2014 seluruh route REST API
|  |  |- db.js
|  |  |- server.js
|  |- sql/
|  |  |- init.sql           \u2014 schema lengkap + seed data
|  |- test/
|  |  |- api.test.js
|- realtime/
|  |- src/
|  |  |- server.js          \u2014 WebSocket + Redis pub/sub
|- media/
|  |- src/
|  |  |- server.js          \u2014 control-plane stub
|- gateway/
|  |- nginx.conf            \u2014 reverse proxy routing
|- README.md
|- Document/
|  |- DESAIN/README.md      \u2014 modul UI, visual system, alur navigasi
|  |- PRD/README.md         \u2014 scope, user stories, acceptance criteria
|  |- ARCHITECTURE/README.md \u2014 arsitektur teknis, Docker, sequence diagram
|- Dockerfile
|- docker-compose.yml
|- nginx.conf               \u2014 SPA fallback untuk container frontend
|- package.json
```

## Menjalankan Secara Lokal

```bash
pnpm install
pnpm dev

pnpm --dir backend install
pnpm --dir backend dev
```

Untuk build produksi:

```bash
pnpm build
pnpm test:backend
```

Frontend berjalan di port Vite standar proyek ini, sedangkan backend API berjalan di `http://localhost:3000` jika `DATABASE_URL` sudah tersedia.

## Endpoint Backend Yang Sudah Tersedia

- `GET /health` untuk health check service.
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, dan `GET /me` untuk autentikasi dasar.
- `GET /catalog?page=1&limit=20` untuk daftar produk berpaginasinya backend.
- `GET/POST/PATCH /products` untuk CRUD dasar produk.
- `GET/POST/PATCH /streams` untuk CRUD dasar stream.
- `GET/POST/PATCH /flash-sales` untuk CRUD dasar flash sale.
- `GET /orders` untuk daftar order sesuai peran pengguna.
- `POST /orders` untuk membuat order dengan pengurangan stok atomik.
- `GET/POST /streams/:streamId/chat` untuk persistence chat yang nantinya bisa dikonsumsi realtime service.

Contoh request order:

```bash
curl -X POST http://localhost:3000/orders \
	-H "Content-Type: application/json" \
	-H "Idempotency-Key: order-demo-1" \
	-d '{"itemId":1,"qty":1}'
```

## Menjalankan Dengan Docker

Frontend, backend, realtime, media stub, PostgreSQL, dan Redis sudah disiapkan di Docker Compose.

```bash
docker compose up --build -d
```

Endpoint yang tersedia setelah container hidup:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3000`
- Realtime service: `http://localhost:4000`
- Media service: `http://localhost:5000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Untuk menghentikan container:

```bash
docker compose down
```

Catatan:

- `Dockerfile` membangun aplikasi Vite lalu menyajikannya lewat Nginx.
- `backend/Dockerfile` membangun service API Express secara terpisah.
- `realtime` service menerima event chat, presence, dan stok melalui WebSocket dan Redis pub/sub.
- `media` service saat ini adalah control-plane stub untuk metadata sesi ingest dan playback, belum pipeline HLS atau WebRTC penuh.
- `docker-compose.yml` sekarang menjalankan container frontend, API, realtime, media, PostgreSQL, Redis, dan network `live-shopping-network`.
- Blueprint container backend, realtime, database, dan cache dijelaskan di [Document/ARCHITECTURE/README.md](./Document/ARCHITECTURE/README.md).

## Ruang Lingkup Implementasi Saat Ini

- Frontend UI lengkap: 6 halaman (Browse, Live Room, Auth, Host Dashboard, Admin Dashboard, Pesanan Saya).
- Tema visual Mobbin-inspired dengan Tailwind CSS v4 dan Inter font.
- Integrasi REST API dan WebSocket nyata dengan fallback mock data otomatis.
- Backend MVP lengkap: auth, produk, stream, flash sale, order atomik, chat persistence.
- Realtime service: WebSocket, Redis pub/sub, broadcast chat dan stok.
- Nginx gateway sebagai reverse proxy antar seluruh service.
- Docker Compose untuk menjalankan seluruh stack (gateway, frontend, API, realtime, media, PostgreSQL, Redis).
- Mock data dan demo mode untuk presentasi tanpa backend hidup.
- Object storage dan pipeline media produksi penuh masih berada pada tahap desain arsitektur.

## Pembagian Tugas Kelompok

| Peran | Tanggung Jawab Utama |
|------|-----------------------|
| Project Lead | sinkronisasi requirement, backlog, presentasi progres |
| Frontend Engineer | halaman viewer, host dashboard, state UI, integrasi API |
| Backend Engineer | auth, CRUD produk, flash sale, order, integrasi database |
| Realtime and DevOps | WebSocket, cache, streaming, Docker, deployment |
| QA and Documentation | test scenario, verifikasi acceptance criteria, dokumentasi |

## Demo Akun UI

Frontend menggunakan mock data dan mock auth. Jika backend tidak berjalan, login tetap berhasil menggunakan akun demo berikut.

| Role | Cara Login | Akses |
|------|-----------|-------|
| **Pembeli** | Email + password apapun → pilih role **Pembeli** | Browse, Live Room, Checkout |
| **Host** | Email + password apapun → pilih role **Host** | Browse + tab **Dashboard** (kelola siaran, produk, flash sale, pesanan) |
| **Admin** | Gunakan email `admin@flashlive.id` + password apapun | Browse + tab **Dashboard** + tab **Admin** (monitor user, blokir akun, semua transaksi) |

> Catatan: email `admin@flashlive.id` secara khusus menghasilkan mock user dengan role `admin`. Email lain menghasilkan role sesuai pilihan saat registrasi.

Jika backend berjalan (`docker compose up`), login menggunakan akun nyata yang terdaftar di database.

## Referensi Cepat

- PRD untuk scope dan acceptance criteria: [Document/PRD/README.md](./Document/PRD/README.md)
- Desain produk dan modul UI: [Document/DESAIN/README.md](./Document/DESAIN/README.md)
- Diagram sistem dan Docker deployment: [Document/ARCHITECTURE/README.md](./Document/ARCHITECTURE/README.md)

Dokumen ini ditujukan sebagai pintu masuk utama untuk anggota kelompok, dosen, dan reviewer proyek.
