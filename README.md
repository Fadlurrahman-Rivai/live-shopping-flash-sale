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
|  |- App.tsx
|  |- main.tsx
|  |- index.css
|- backend/
|  |- src/
|  |  |- app.js
|  |  |- db.js
|  |  |- server.js
|  |- sql/
|  |  |- init.sql
|  |- test/
|  |  |- api.test.js
|- realtime/
|  |- src/
|  |  |- server.js
|- media/
|  |- src/
|  |  |- server.js
|- README.md
|- Document/
|  |- DESAIN/
|  |  |- README.md
|  |- PRD/
|  |  |- README.md
|  |- ARCHITECTURE/
|  |  |- README.md
|- Dockerfile
|- docker-compose.yml
|- nginx.conf
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

- Frontend scaffold dan dokumentasi proyek sudah tersedia.
- Backend MVP untuk katalog dan order sudah tersedia di folder `backend`.
- Realtime service starter sudah tersedia di folder `realtime`.
- Media service starter sudah tersedia di folder `media`.
- Packaging Docker untuk frontend, API, realtime, media, PostgreSQL, dan Redis sudah tersedia.
- Object storage dan pipeline media produksi penuh masih berada pada tahap desain arsitektur dan perencanaan implementasi.

## Pembagian Tugas Kelompok

| Peran | Tanggung Jawab Utama |
|------|-----------------------|
| Project Lead | sinkronisasi requirement, backlog, presentasi progres |
| Frontend Engineer | halaman viewer, host dashboard, state UI, integrasi API |
| Backend Engineer | auth, CRUD produk, flash sale, order, integrasi database |
| Realtime and DevOps | WebSocket, cache, streaming, Docker, deployment |
| QA and Documentation | test scenario, verifikasi acceptance criteria, dokumentasi |

## Referensi Cepat

- PRD untuk scope dan acceptance criteria: [Document/PRD/README.md](./Document/PRD/README.md)
- Desain produk dan modul UI: [Document/DESAIN/README.md](./Document/DESAIN/README.md)
- Diagram sistem dan Docker deployment: [Document/ARCHITECTURE/README.md](./Document/ARCHITECTURE/README.md)

Dokumen ini ditujukan sebagai pintu masuk utama untuk anggota kelompok, dosen, dan reviewer proyek.
