# AI-LOG — Jejak Interaksi Copilot Seluruh Kelompok · Live Shopping Flash Sale

Kumpulan log harian dan tinjauan kritis terhadap seluruh saran, otomatisasi, dan kode yang direkomendasikan oleh GitHub Copilot untuk squad ini.

---

### [Arsitek] · Lapisan 1 · Entri 1
- **Konteks**: Merancang struktur relasi tabel database untuk mendukung fungsionalitas flash sale multiproduk dan multiroom secara performan.
- **Prompt**: `"Design highly scalable PostgreSQL schemas for live shopping flash sale with tables for users, items, orders, streams, flash_sales, and idempotency_keys with appropriate indexes"`
- **Diterima**: Rekomendasi rancangan tabel `idempotency_keys` untuk memastikan bahwa transaksi checkout yang dikirimkan berulang kali dengan key yang sama tidak membuat pemesanan ganda di database.
- **Ditolak**: Copilot menyarankan relasi yang rumit dengan tabel penengah khusus untuk state ketersediaan stok. Hal ini ditolak karena untuk MVP, field sisa stok langsung diletakkan pada tabel `items` dengan safety constraints SQL atomik agar pengembangan tetap lincah namun database konsisten.
- **Verifikasi**: Sukses mengeksekusi skema awal lewat berkas [backend/sql/init.sql](backend/sql/init.sql).

---

### [Data / Backend] · Lapisan 2 · Entri 1
- **Konteks**: Menerapkan fungsi pengurangan stok yang aman dari kondisi rebutan (*race condition*) pada endpoint checkout harian `/orders`.
- **Prompt**: `"Write express js post handler for /orders with pg transaction, checking stock and decrementing stock securely"`
- **Diterima**: Metode eksekusi query PostgreSQL menggunakan kueri tunggal yang ter-lock: `UPDATE items SET sisa = sisa - $1 WHERE id = $2 AND sisa >= $1 RETURNING ...`. Ini mengeliminasi *race condition* secara elegan karena database membatasi modifikasi baris data secara berurutan.
- **Ditolak**: Saran awal Copilot adalah pola baca-lalu-tulis (*read-then-write*) di dalam transaction level `READ COMMITTED`. Ditolak karena jika 300 request masuk bersamaan, semuanya akan membaca stok awal yang sama dan melakukan penulisan berlebih (*oversell*).
- **Verifikasi**: Pengurangan stok atomik berjalan sukses di unit test [backend/test/api.test.js](backend/test/api.test.js).

---

### [QA / Doc] · Lapisan 2 · Entri 2
- **Konteks**: Membuat berkas uji tingkat beban rebutan (*concurrency rate limit*) berskala tinggi untuk mensimulasikan serbuan pemesanan flash sale oleh ratusan penonton.
- **Prompt**: `"Buat uji node.js test runner untuk menembakkan 300 POST ke /orders secara paralel memakai Promise.all, kemudian baca stok sisa dari GET /catalog"`
- **Diterima**: Rekomendasi penggunaan `Promise.all` untuk mengirimkan seluruh request secara paralel murni (sehingga merefleksikan kondisi rebutan yang sesungguhnya) dan kalkulasi filter status respon untuk 201 dan 409.
- **Ditolak**: Kode rujukan yang menganggap status respon 409 (Conflict) sebagai kegagalan sistem pengujian. Hal ini ditolak karena respon 409 (Stok Habis / STOK_HABIS) adalah perilaku valid dan diinginkan demi mencegah oversell. Assertions diatur agar status 409 dinilai sebagai sukses pengujian.
- **Verifikasi**: Mengeksekusi `node --test test/rebutan.test.js` menghasilkan status kelulusan sempurna (sukses = 5, ditolak = 295, sisa stok di database = 0).
