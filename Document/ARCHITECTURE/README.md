# Arsitektur Sistem
## Live Shopping Flash Sale

Dokumen ini menjelaskan arsitektur teknis target sistem, status implementasi repo saat ini, dan bagaimana proyek ini dihubungkan ke Docker untuk pengembangan serta deployment awal.

## 1. Status Implementasi Saat Ini

Saat dokumen ini ditulis, repositori sudah memiliki:

- frontend React + Vite,
- backend Express + PostgreSQL untuk endpoint inti,
- dokumentasi desain produk,
- dokumentasi PRD,
- `Dockerfile` untuk build produksi frontend,
- `backend/Dockerfile` untuk build service API,
- `docker-compose.yml` untuk menjalankan frontend, API, dan PostgreSQL di Docker.

Komponen realtime, Redis, object storage, dan media service masih berstatus blueprint arsitektur implementasi berikutnya.

## 2. Gambaran Sistem Target

```mermaid
flowchart LR
    Buyer[Pembeli] --> Frontend[Frontend Web\nReact + Vite]
    Host[Host] --> Frontend
    Admin[Admin] --> Frontend

    Frontend -->|HTTPS REST| API[API Service]
    Frontend -->|WebSocket| Realtime[Realtime Service]
    Host -->|RTMP or WebRTC| Media[Media Service]
    Media -->|HLS or WebRTC| Frontend

    API --> Postgres[(PostgreSQL)]
    API --> Redis[(Redis)]
    API --> ObjectStore[(Object Storage)]
    Realtime --> Redis
    Realtime --> Postgres
```

## 3. Container View Dengan Docker

Diagram berikut menunjukkan rancangan deployment berbasis Docker Compose untuk lingkungan pengembangan dan demo proyek.

```mermaid
flowchart LR
    User[Browser Client] -->|http://localhost:8080| FE

    subgraph DockerHost[Docker Host]
        subgraph Network[live-shopping-network]
            FE[frontend\nNginx + Vite build]
            API[api\nNode.js REST API]
            RT[realtime\nWebSocket or signaling]
            PG[(postgres)]
            RD[(redis)]
            OS[(object storage)]
        end
    end

    FE --> API
    FE --> RT
    API --> PG
    API --> RD
    API --> OS
    RT --> RD
```

Catatan implementasi:

- Yang benar-benar tersedia di repo saat ini adalah container `frontend`, `api`, dan `postgres`.
- Service `realtime`, `redis`, dan `object storage` masih menjadi target stack fase berikutnya.
- Semua service dirancang untuk berada pada network Docker yang sama agar komunikasi antar-service tetap sederhana pada lingkungan development.

## 4. Komponen Utama

### 4.1 Frontend Web

- Framework: React 19, Vite 8, Tailwind CSS v4.
- Tanggung jawab: daftar siaran, room live, kartu flash sale, chat panel, checkout, dashboard host, panel admin.
- Integrasi: REST untuk data CRUD dan order; WebSocket untuk chat, presence, dan update stok.

### 4.2 API Service

- Menangani autentikasi, otorisasi, CRUD produk, stream, flash sale, dan order.
- Implementasi saat ini sudah menyediakan endpoint `GET /health`, `GET /catalog`, dan `POST /orders`.
- Menyimpan data persisten ke PostgreSQL.
- Untuk MVP sekarang, operasi stok atomik memakai query `UPDATE ... WHERE sisa >= qty RETURNING ...` di PostgreSQL.
- Redis tetap menjadi opsi evolusi saat write contention meningkat dan realtime service mulai dipisah.

### 4.3 Realtime Service

- Menangani room chat, presence, push stok, dan event siaran.
- Mengonsumsi pub/sub Redis untuk sinkronisasi lintas instance.
- Menjadi jalur komunikasi real-time antara frontend dan backend.

### 4.4 Media Service

- Menangani ingest stream dari host.
- Menyediakan distribusi stream ke penonton lewat WebRTC atau HLS.
- Dapat dipisahkan dari realtime service agar scaling media tidak bercampur dengan scaling chat.

### 4.5 Data Layer

- PostgreSQL sebagai source of truth data produk, order, user, dan stream.
- Redis sebagai layer cepat untuk stok flash sale, pub/sub, session singkat, dan cache.
- Object storage untuk gambar produk, thumbnail, dan rekaman siaran bila diperlukan.

## 5. Model Data Inti

Implementasi backend saat ini masih memakai bentuk tabel MVP yang lebih sederhana: `items`, `orders`, dan `idempotency_keys`. Model domain di bawah ini adalah arah struktur target saat sistem berkembang.

```text
User
  id, name, email, password_hash, role, status, created_at

Product
  id, host_id, name, description, image_url, normal_price, stock, created_at

Stream
  id, host_id, title, status, started_at, ended_at, viewer_peak

FlashSale
  id, product_id, stream_id, sale_price, sale_stock, quota_per_user,
  start_time, end_time, status

Order
  id, buyer_id, flash_sale_id, quantity, total_price, status, created_at

ChatMessage
  id, stream_id, user_id, content, created_at
```

Relasi utama:

- satu host memiliki banyak produk,
- satu stream dapat memiliki banyak sesi flash sale,
- satu flash sale menghasilkan banyak order,
- satu stream memiliki banyak chat message.

## 6. Alur Kritis

### 6.1 Pembelian Flash Sale

```mermaid
sequenceDiagram
    participant U as Pembeli
    participant FE as Frontend
    participant API as API Service
    participant PG as PostgreSQL

    U->>FE: Klik beli sekarang
    FE->>API: POST /orders
  API->>PG: BEGIN
  API->>PG: UPDATE items SET sisa = sisa - qty WHERE sisa >= qty
    alt stok tersedia
    API->>PG: INSERT INTO orders
    API->>PG: COMMIT
        API-->>FE: Response order berhasil dibuat
  else stok habis atau item tidak ada
    API->>PG: COMMIT
        API-->>FE: Response stok habis
    end
```

Catatan:

- Implementasi backend saat ini memakai PostgreSQL atomik untuk mencegah oversell pada MVP.
- Redis masih relevan jika nanti throughput transaksi meningkat dan stok perlu dipisahkan ke layer cache khusus.

### 6.2 Live Chat dan Presence

```mermaid
sequenceDiagram
    participant ClientA as Viewer A
    participant WS as Realtime Service
    participant Redis as Redis PubSub
    participant ClientB as Viewer B

    ClientA->>WS: Kirim pesan chat
    WS->>Redis: Publish room event
    Redis-->>WS: Sebarkan ke subscriber
    WS-->>ClientB: Tampilkan pesan baru
```

## 7. Keputusan Arsitektur

| Keputusan | Alasan |
|-----------|--------|
| Pisahkan frontend, API, dan realtime | pola beban dan strategi scaling berbeda |
| PostgreSQL atomik untuk stok pada MVP | lebih sederhana untuk dioperasikan sekarang, tetapi tetap aman dari race condition dasar |
| Redis sebagai evolusi berikutnya | relevan saat skala realtime dan kontensi tulis meningkat |
| PostgreSQL sebagai source of truth | relasi data transaksi lebih kuat dan konsisten |
| Docker untuk packaging awal | memudahkan demo, deployment, dan konsistensi environment |
| Nginx untuk runtime frontend | ringan, stabil, dan cocok untuk static build Vite |

## 8. Deployment Docker Di Repo Ini

### 8.1 Artefak Docker yang Tersedia

- `Dockerfile` menggunakan multi-stage build dari `node:22-alpine` ke `nginx:alpine`.
- `backend/Dockerfile` menjalankan service API berbasis Node.js dan Express.
- `docker-compose.yml` menjalankan service `frontend`, `api`, dan `postgres`.
- `backend/sql/init.sql` menyiapkan schema awal dan seed catalog di PostgreSQL.
- `nginx.conf` mengaktifkan fallback `index.html` agar siap untuk SPA routing.
- `.dockerignore` mengurangi ukuran build context.

### 8.2 Jalur Request Saat Ini

```mermaid
flowchart LR
  Browser -->|HTTP 8080| FrontendContainer[live-shopping-frontend]
  Browser -->|HTTP 3000| ApiContainer[live-shopping-api]
  FrontendContainer --> Nginx[Nginx Runtime]
  ApiContainer --> Postgres[(live-shopping-postgres)]
  Nginx --> StaticBuild[Dist dari Vite Build]
```

### 8.3 Perintah Operasional

```bash
docker compose up --build -d
docker compose down
```

## 9. Keamanan dan Keandalan

- Gunakan JWT dan RBAC untuk membedakan buyer, host, dan admin.
- Tambahkan rate limiting pada checkout dan chat untuk mencegah abuse.
- Sanitasi input chat untuk mencegah XSS.
- Audit log untuk perubahan status order dan moderasi admin.
- Backup periodik untuk PostgreSQL dan object storage.

## 10. Skalabilitas

- Frontend dapat dipasang di CDN atau reverse proxy bila sudah stabil.
- API dapat di-scale horizontal di belakang load balancer.
- Realtime service dapat memakai Redis adapter agar room sinkron antar-instance.
- Media service diisolasi supaya lonjakan streaming tidak mengganggu transaksi.

## 11. Roadmap Arsitektur

1. Tahap 1: frontend + Docker packaging untuk demo.
2. Tahap 2: API sederhana + PostgreSQL untuk katalog dan order atomik.
3. Tahap 3: realtime service terpisah untuk chat, notifikasi, dan update stok.
4. Tahap 4: integrasi media service dan observability.
5. Tahap 5: optimasi scaling, keamanan, dan deployment cloud.

Arsitektur ini sengaja dibuat bertahap agar sesuai dengan progres proyek kelompok: bisa didemokan sekarang, tetapi tetap punya jalur evolusi yang jelas menuju sistem live commerce yang lebih realistis.
