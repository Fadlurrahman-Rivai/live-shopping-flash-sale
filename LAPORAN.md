# Laporan Proyek Terpadu — Squad Gelombang Kilat · Tema Live Shopping Flash Sale

## 1. Ringkasan Produk
Live Shopping Flash Sale adalah platform live commerce modern yang dirancang untuk mempertemukan interaktivitas demonstrasi produk secara langsung oleh host dengan pemicu psikologis urgensi belanja berupa promo flash sale berbatas waktu. Masalah utama yang ingin diselesaikan adalah tingginya keraguan pembeli saat berbelanja online dan lambatnya rasio checkout. Melalui sistem ini, pembeli dapat berinteraksi secara real-time via live chat dan melakukan checkout super cepat (kurang dari 30 detik) langsung dari pemutar video tanpa mengandalkan pengalihan halaman, dengan perebutan stok produk ter-pin secara ketat. Sumber daya rebutan inti (core competitive resource) yang dilindungi adalah sisa kuantitas stok barang flash sale yang terbatas agar tidak terjadi kondisi penjualan berlebih (oversell).

---

## 2. Lapisan 1 — Microservices
Sistem ini memisahkan tanggung jawab aplikatif dan menerapkan isolasi runtime melalui skema database-per-service dasar demi memelihara integritas data transaksi:

- **Daftar Layanan & Tanggung Jawab**:
  1. `frontend`: Subsistem antarmuka pengguna berbasis React 19, TypeScript 5, dan Tailwind CSS v4, dikemas menggunakan static build Vite 8 dan dilayani menggunakan Nginx web server. Bertanggung jawab terhadap UI/UX interaktif penonton, panel obrolan, pemutar video, serta kontrol pembelian. Terdefinisi di [Dockerfile](Dockerfile).
  2. `api` (Backend REST Service): Subsistem backend berbasis Express.js dan Node.js yang mengelola autentikasi, manajemen katalog, serta pemrosesan checkout pemesanan secara aman. Terdefinisi di [backend/Dockerfile](backend/Dockerfile).
  3. `postgres`: Penyimpanan data persisten relasional SQL yang menyimpan tabel katalog item, riwayat order, dan kunci idempotensi transaksi.

- **Daftar Endpoint Kritis**:
  - `GET /health` : Memverifikasi kesehatan koneksi server API dan keberadaan koneksi pool basis data.
  - `GET /catalog` : Mengambil daftar katalog produk yang tersedia beserta harga dan sisa stok aktif yang terpaginasi.
  - `POST /orders` : Memproses checkout pesanan flash sale dengan jaminan isolasi transaksi yang aman dari race condition.

- **Tautan Konfigurasi**:
  - Kontrak Swagger API Komprehensif: [openapi.yaml](openapi.yaml)
  - Berkas peluncur runtime multi-kontainer: [docker-compose.yml](docker-compose.yml)
  - Skema inisialisasi basis data: [backend/sql/init.sql](backend/sql/init.sql)
  - Kode logika rute server API: [backend/src/app.js](backend/src/app.js)
  - Kode eksekusi web server statis: [nginx.conf](nginx.conf)

---

## 3. Lapisan 2 — Scalable

### 3.1 Titik Macet (Bottleneck) yang Ditemukan
Berdasarkan hasil baseline pengujian awal, terdapat potensi titik macet serius pada saat puncak rebutan flash sale:
1. **Race Condition Baca-Lalu-Tulis**: Jika backend membaca sisa stok terlebih dahulu ke dalam memori aplikasi sebelum meluncurkan perintah penulisan update stok, maka ratusan transaksi paralel akan melihat jumlah stok yang sama sebelum ter-update. Hal ini memicu terjadinya *oversell* hebat di mana sisa stok di database bernilai negatif (< 0) dan jumlah pesanan yang tercatat melampaui stok fisik riil.
2. **Koneksi Database Tidak Stabil**: Lonjakan pemesanan checkout massal yang tidak efisien dalam manajemen pool koneksi basis data akan dengan cepat menghabiskan resources RAM dan memicu galat 5xx Server Error.

### 3.2 Perbaikan yang Dilakukan
Untuk menjamin ketahanan skala beban (*scalability*) dan keandalan sistem dari kesalahan pencatatan, squad memasang strategi perbaikan berikut:
- **UPDATE Stok Atomik**: Mengubah manipulasi pengurangan stok menggunakan query SQL tunggal yang atomik dan terkunci bersyarat: `UPDATE items SET sisa = sisa - $1 WHERE id = $2 AND sisa >= $1 RETURNING ...`. Melalui instruksi ini, PostgreSQL secara internal memblokir penulisan baris database secara sequensial dan menolak transaksi jika sisa stok tidak mencukupi, memastikan tidak ada stok yang turun di bawah nol. Terlihat di [backend/src/app.js](backend/src/app.js#L182-L187).
- **Idempotency Key Lock**: Menyediakan headers `Idempotency-Key` di endpoint checkout `/orders` untuk meredam kegagalan transmisi jaringan (retry otomatis) tanpa melipatgandakan data pembelian orisinal.

### 3.3 Tabel Pengujian Performa Baseline (autocannon)
Berikut adalah rangkuman performa pengujian beban tinggi dengan menembakkan **31.000 request** checkout selama **30 detik** menggunakan **200 koneksi bersamaan (concurrent connections)** terhadap server API lokal:

| Perubahan | Perintah Pengujian | p50 (Median) | p95 (Ekor Terparah) | p99 (Ekor Terburuk) | Throughput (Avg) | Error Rate (non-2xx) |
|---|---|---|---|---|---|---|
| **Optimasi UPDATE SQL Atomik** | `npx autocannon -c 200 -d 30 -m POST -H "Content-Type: application/json" -b '{"itemId": 1, "qty": 1}' http://localhost:3000/orders` | 175 ms | 319 ms | 396 ms | 1.030 req/s | 99.96% (30.915 ditolak aman) |

*Catatan Bisnis: Tingginya presentase non-2xx (99.96%) bukan merupakan kegagalan sistem, melainkan keberhasilan mutlak dari filter stok backend di mana hanya tepat 12 pembeli tercepat (sesuai stok ter-seed) yang berhak mendapatkan respon sukses 201 Created, sedangkan sisanya (30.915 pembeli) secara instan dibalas dengan status 409 Conflict demi melindungi stok fisik.*

### 3.4 Bukti Sumber Daya Rebutan Tidak Jebol (No Oversell)
Kami membuktikan kebenaran integritas data ini lewat berkas pengetesan [test/rebutan.test.js](test/rebutan.test.js) yang mengeksekusi **300 transaksi paralel murni** secara bersamaan menggunakan `Promise.all` pada target item dengan stok awal **5** unit:

```text
Stok awal item 3: 5
--- HASIL UJI REBUTAN ---
Sukses (201): 5
Ditolak (409): 295
Sisa stok di DB: 0
✔ stok diserbu 300 penonton tak boleh oversell (1133.25897ms)
```

**Analisis Bukti**:
- Sukses checkout: **Tepat 5** (tidak kurang, tidak lebih).
- Sisa stok di database: **Tepat 0** (tidak minus, membuktikan **bebas dari bahaya oversell**).
- Tidak ada response berstatus 500 internal server error pada lonjakan kueri serentak tersebut.

---

## 4. Lapisan 3 — Mobile
Meskipun aplikasi didemokan dalam bentuk antarmuka web, fungsionalitas aplikasi dioptimalkan agar responsif dan kompatibel saat diakses melalui perangkat seluler (*mobile-friendly viewport*).

- **Layar Utama & Kemampuan Offline**:
  1. **Layar Live Stage**: Mengintegrasikan area siaran pemutar video dengan panel obrolan di bagian bawah dan kartu promo flash sale transparan di sudut kanan atas demi menjaga fokus navigasi penonton.
  2. **Fast Checkout Dialog**: Overlay konfirmasi sekali-klik untuk mengunci stok tanpa memaksa pengguna beralih halaman visual utama.
  3. **Kemampuan Offline / Kendala Jaringan**: Aplikasi frontend dilengkapi dengan retry state management dinamis di mana bila token WebSocket terputus, ia akan melakukan koneksi ulang otomatis (*presence reconnect*) tanpa menghapus state obrolan lokal penonton yang sudah termuat sebelumnya.

- **Tautan Repositori Visual**:
  - Konfigurasi entri UI klien web: [src/App.tsx](src/App.tsx)

---

## 5. Pelajaran & Pembagian Peran

### 5.1 Adaptasi Terhadap Rencana Awal
Awalnya, tim merancang pemisahan microservice tersendiri untuk gateway logistik dan payment. Namun, untuk menjaga kestabilan MVP, disepakati bahwa sistem pembayaran disimulasikan secara instan pada database internal, mengalihkan fokus optimalisasi pada keamanan race condition stok dan mitigasi redundansi data lewat kunci idempotensi.

### 5.2 Kontribusi Anggota Tim
- **Arsitek**: Merumuskan aliran data transaksi order, merancang skema relasi data entitas, serta mendesain topologi deployment Docker Compose.
- **Backend Developer**: Membangun rest controller Express, merapikan filter routing middleware, dan mengoptimasikan asinkronisitas Node JS.
- **Database / Data Specialist**: Menyempurnakan proteksi transaksi basis data dengan mereduksi logika transaksi rumit ke kueri update bersyarat atomik, serta merancang skema pencegahan double order via tabel idempotency.
- **DevOps Engineer**: Mengemas seluruh layanan ke dalam multi-stage build container Docker dan merancang jalur efisien build cache.
- **QA, Load-Test & Dokumentasi**: Menulis skenario otomatisasi tes terpadu di [test/smoke.test.js](test/smoke.test.js) dan [test/rebutan.test.js](test/rebutan.test.js), mengawal uji stres beban sistem, serta mendokumentasikan klaim bisnis menjadi angka yang terverifikasi.

---

## 6. Lampiran

### 6.1 Perintah Uji yang Presendensial (Repeatable Commands)
Untuk menguji ulang dan mereproduksi klaim di atas pada lingkungan baru, jalankan rangkaian perintah berikut di terminal:

```bash
# 1. Reset volume database ke kondisi bersih
docker compose down -v && docker compose up -d --build

# 2. Jalankan rangkaian pengujian asap (smoke test)
BASE=http://localhost:3000 node --test test/smoke.test.js

# 3. Jalankan rangkaian pengujian rebutan stok paralel
BASE=http://localhost:3000 node --test test/rebutan.test.js

# 4. Jalankan pengujian stres performa tinggi 
npx autocannon -c 200 -d 30 -m POST -H "Content-Type: application/json" -b '{"itemId": 1, "qty": 1}' http://localhost:3000/orders
```

### 6.2 Spesifikasi Mesin Pengujian (Test Machine Specs)
- **CPU Cores (`nproc`)**: 2 Cores
- **RAM (`free -h`)**: 7.8 GiB (aslokasi Codespaces Standard VM)
- **Sistem Operasi**: Ubuntu 24.04.4 LTS (Linux DevContainer)
