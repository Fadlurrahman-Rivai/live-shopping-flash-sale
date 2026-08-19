# Live Shopping Flash Sale

Platform live commerce untuk proyek kelompok yang menggabungkan streaming produk, flash sale berbasis waktu, chat real-time, dan checkout cepat dalam satu alur. Repositori ini saat ini berisi frontend React + Vite, dokumen perencanaan produk, dokumen desain, arsitektur sistem, dan runtime Docker untuk packaging aplikasi.

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
- Packaging frontend: Docker multi-stage build + Nginx runtime
- Rencana backend: REST API, layanan realtime, PostgreSQL, Redis, object storage
- Preview lokal: Figma Make preview dan Docker Compose

## Struktur Repositori

```text
live-shopping-flash-sale/
|- src/
|  |- App.tsx
|  |- main.tsx
|  |- index.css
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
```

Untuk build produksi:

```bash
pnpm build
```

## Menjalankan Dengan Docker

Frontend pada repo ini sudah siap dijalankan di Docker.

```bash
docker compose up --build -d
```

Lalu akses aplikasi pada `http://localhost:8080`.

Untuk menghentikan container:

```bash
docker compose down
```

Catatan:

- `Dockerfile` membangun aplikasi Vite lalu menyajikannya lewat Nginx.
- `docker-compose.yml` saat ini menjalankan container frontend pada network `live-shopping-network`.
- Blueprint container backend, realtime, database, dan cache dijelaskan di [Document/ARCHITECTURE/README.md](./Document/ARCHITECTURE/README.md).

## Ruang Lingkup Implementasi Saat Ini

- Frontend scaffold dan dokumentasi proyek sudah tersedia.
- Packaging Docker untuk frontend sudah tersedia dan tervalidasi.
- Backend, realtime service, dan penyimpanan data masih berada pada tahap desain arsitektur dan perencanaan implementasi.

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
