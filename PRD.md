# Product Requirements Document
## Live Shopping Flash Sale

| Atribut | Nilai |
|---------|-------|
| Nama Produk | Live Shopping Flash Sale |
| Versi | 1.1 |
| Status | Draft siap implementasi MVP |
| Tanggal | 2026-08-19 |
| Pemilik Dokumen | Tim Proyek Kelompok |

## 1. Ringkasan Produk

Live Shopping Flash Sale adalah platform live commerce yang memungkinkan host menyiarkan produk secara langsung, mengaktifkan promo flash sale berbatas waktu, dan menerima pembelian dari penonton tanpa memaksa mereka keluar dari halaman siaran. Produk ini menggabungkan tiga elemen inti: live video, urgensi promosi, dan transaksi instan.

## 2. Masalah yang Ingin Diselesaikan

Pembeli sering ragu membeli produk online hanya dari foto dan deskripsi. Di sisi lain, penjual kesulitan menciptakan urgensi dan interaksi yang cukup tinggi untuk meningkatkan conversion rate. Platform ini menjawab dua masalah itu dengan demonstrasi produk real-time dan sistem promo terbatas yang mendorong keputusan pembelian lebih cepat.

## 3. Tujuan Produk

### Tujuan Bisnis

- Meningkatkan conversion rate penjualan selama sesi live.
- Meningkatkan engagement pengguna melalui interaksi real-time.
- Menyediakan fondasi sistem yang bisa dikembangkan menjadi marketplace live commerce skala lebih besar.

### Sasaran Terukur

| Metrik | Target MVP |
|--------|------------|
| Conversion rate saat live | minimal 8 persen |
| Rata-rata durasi tonton | minimal 5 menit |
| Waktu checkout | kurang dari 30 detik |
| Latensi chat | kurang dari 1 detik |
| Akurasi stok flash sale | tidak terjadi oversell |

## 4. Persona Pengguna

### 4.1 Pembeli

- Ingin melihat produk secara langsung sebelum membeli.
- Ingin proses pembelian sesingkat mungkin.
- Tertarik pada promo terbatas dengan stok yang jelas.

### 4.2 Host

- Ingin menjual sambil berinteraksi dengan audiens.
- Ingin mengontrol produk yang dipromosikan secara real-time.
- Ingin memantau performa siaran, penjualan, dan respon chat.

### 4.3 Admin

- Ingin menjaga kualitas host dan keamanan platform.
- Ingin memonitor transaksi, sesi live, dan pelanggaran konten.

## 5. Ruang Lingkup MVP

### Dalam Lingkup

- Registrasi dan login pengguna.
- Daftar siaran live dan terjadwal.
- Live player untuk penonton.
- Live chat dalam room siaran.
- Manajemen produk dan sesi flash sale oleh host.
- Countdown, harga promo, dan sisa stok real-time.
- Checkout cepat dari halaman live.
- Dashboard ringkas untuk host.
- Monitoring dasar untuk admin.

### Di Luar Lingkup MVP

- Multi-host dan co-streaming.
- Sistem voucher dan loyalty program yang kompleks.
- Integrasi payment gateway produksi penuh.
- Integrasi logistik end-to-end.
- Rekomendasi personalisasi berbasis AI.

## 6. User Stories

### Pembeli

- Sebagai pembeli, saya ingin melihat daftar siaran live agar bisa memilih sesi yang sedang aktif.
- Sebagai pembeli, saya ingin menonton siaran sambil melihat produk yang sedang dipin agar saya paham apa yang sedang dijual.
- Sebagai pembeli, saya ingin melihat harga promo, countdown, dan sisa stok agar saya bisa memutuskan dengan cepat.
- Sebagai pembeli, saya ingin mengirim chat agar saya bisa bertanya langsung kepada host.
- Sebagai pembeli, saya ingin checkout langsung dari halaman live agar proses pembelian tetap cepat.
- Sebagai pembeli, saya ingin melihat status order agar saya tahu transaksi saya berhasil.

### Host

- Sebagai host, saya ingin membuat produk dan mengaitkannya ke sesi flash sale agar promo dapat dikelola per siaran.
- Sebagai host, saya ingin memulai dan mengakhiri siaran agar jadwal siaran dapat dikontrol.
- Sebagai host, saya ingin mem-pin produk tertentu agar perhatian audiens terarah.
- Sebagai host, saya ingin melihat jumlah penonton aktif dan penjualan agar saya bisa menilai performa sesi.

### Admin

- Sebagai admin, saya ingin memverifikasi host agar hanya akun yang valid yang dapat berjualan.
- Sebagai admin, saya ingin memantau transaksi dan siaran agar bisa mendeteksi anomali lebih cepat.
- Sebagai admin, saya ingin menonaktifkan akun atau konten bermasalah agar platform tetap aman.

## 7. Kebutuhan Fungsional dan Acceptance Criteria

| ID | Fitur | Deskripsi | Acceptance Criteria |
|----|-------|-----------|---------------------|
| FR-01 | Daftar siaran | Menampilkan siaran live dan terjadwal | Pengguna melihat judul siaran, host, status, dan CTA masuk ke room |
| FR-02 | Room live | Menyediakan player, panel chat, dan area pinned product | Penonton dapat menonton dan melihat info produk dalam satu halaman |
| FR-03 | Flash sale card | Menampilkan harga promo, harga normal, stok, countdown | Data berubah real-time saat stok atau waktu berubah |
| FR-04 | Buy now | Membuat order langsung dari room live | Pengguna dapat membuat order dalam maksimal 3 langkah |
| FR-05 | Host product management | Host membuat dan mengubah data produk | Perubahan dapat tersimpan dan tampil pada sesi terkait |
| FR-06 | Host flash sale management | Host mengatur harga promo, stok promo, durasi, kuota | Sistem menolak konfigurasi tidak valid seperti stok negatif |
| FR-07 | Live chat | Pengguna mengirim dan menerima pesan pada room | Pesan baru muncul kurang dari 1 detik pada klien lain |
| FR-08 | Viewer and sales stats | Menampilkan jumlah penonton dan penjualan | Host melihat statistik real-time selama siaran |
| FR-09 | Order history | Menampilkan daftar dan status order pembeli | Pembeli dapat memeriksa status pending, paid, shipped, atau cancelled |
| FR-10 | Admin moderation | Verifikasi host dan moderasi dasar | Admin dapat mengubah status host dan menonaktifkan konten bermasalah |

## 8. Aturan Bisnis Flash Sale

1. Sesi flash sale memiliki waktu mulai, waktu selesai, harga promo, stok promo, dan kuota per user.
2. Harga promo hanya aktif saat sesi masih berjalan dan stok masih tersedia.
3. Perubahan stok harus atomik untuk mencegah oversell.
4. Jika stok habis atau waktu selesai, tombol pembelian berubah menjadi tidak tersedia.
5. Satu pembeli hanya boleh membeli sesuai kuota per sesi.
6. Host tidak dapat mengubah sesi aktif menjadi stok negatif atau waktu selesai sebelum waktu mulai.

## 9. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|----------|-----------|
| Performa | respons UI cepat, build frontend stabil, chat dan update stok kurang dari 1 detik |
| Skalabilitas | siap dikembangkan ke ribuan penonton per room melalui pemisahan API dan realtime service |
| Keandalan | stok tidak oversold, reconnect realtime aman, build Docker dapat diulang |
| Keamanan | autentikasi token, RBAC, validasi input, sanitasi chat, HTTPS atau WSS |
| Observability | logging service, monitoring error, metrik viewer dan penjualan |
| Usability | flow pembelian sederhana dan dapat dipahami pengguna baru |

## 10. Alur Utama Pengguna

```text
Pembeli membuka aplikasi
-> memilih siaran live
-> menonton siaran dan membaca chat
-> melihat produk yang dipin beserta countdown dan stok
-> klik beli sekarang
-> checkout cepat
-> menerima konfirmasi order
-> memantau status pesanan
```

## 11. Ketergantungan dan Asumsi

- Pengguna memiliki koneksi internet yang cukup stabil untuk streaming.
- Host memiliki perangkat yang mendukung upload video real-time.
- MVP dapat menggunakan simulasi pembayaran sebelum integrasi payment gateway produksi.
- Infrastruktur realtime akan menggunakan Redis untuk pub/sub dan sinkronisasi state.

## 12. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Lonjakan trafik saat promo populer | aplikasi lambat atau gagal checkout | rate limiting, autoscaling, cache, queue |
| Oversell akibat race condition | stok tidak konsisten | gunakan decrement atomik di Redis dan rekonsiliasi ke database |
| Latensi tinggi pada chat | pengalaman live memburuk | pisahkan realtime service dari API CRUD |
| Stream bermasalah | penonton gagal menonton | fallback HLS atau notifikasi status siaran |
| Host belum terverifikasi | kualitas merchant rendah | alur verifikasi dan moderasi admin |

## 13. Milestone Rilis

| Milestone | Fokus | Deliverable |
|-----------|-------|-------------|
| M1 | Fondasi produk | auth, role, katalog produk, struktur data |
| M2 | Pengalaman viewer | daftar live, room live, pinned product, UI countdown |
| M3 | Realtime | chat, viewer count, update stok, notifikasi |
| M4 | Commerce | checkout cepat, order history, validasi stok atomik |
| M5 | Operasional | dashboard host, admin moderation, Docker deployment, hardening |

## 14. Definisi Selesai untuk MVP

MVP dianggap selesai jika:

- flow pembeli dari masuk room hingga membuat order bisa didemokan end-to-end,
- host dapat membuat produk dan sesi flash sale,
- stok flash sale dapat berubah secara konsisten,
- dokumentasi desain, PRD, dan arsitektur selaras dengan implementasi awal,
- aplikasi frontend dapat dibuild dan dijalankan dari Docker.
