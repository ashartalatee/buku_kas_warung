# Fitur Sampah (Hapus + Pulihkan + Hapus Permanen) — 7 Sep 2026

Lanjutan diskusi di `DASHBOARD_TERANG_MOBILE_NOTES.md`. Kebutuhannya:
data yang dipakai sekarang masih data LATIHAN/TESTING, jadi butuh cara
bersih-bersih yang aman -- kadang salah hapus (perlu bisa dipulihkan),
kadang memang harus beneran hilang (perlu hapus permanen).

## Kenapa bukan sekadar nambah tombol DELETE

Sistem ini dari awal dibangun *append-only* — VOID transaksi tidak
menghapus barisnya (cuma ubah status, demi audit trail bisnis asli), dan
`transaction_events`/`duplicate_flags` menempel ke `transactions.row_id`
TANPA `ON DELETE CASCADE`. Hard-delete langsung bakal nabrak foreign key,
atau (kalau di-cascade) ikut menghapus jejak audit yang sengaja
dipertahankan. Karena kebutuhannya sekarang murni untuk BERSIH-BERSIH DATA
UJI (bukan mengubah cara VOID bekerja untuk transaksi bisnis asli),
solusinya dibuat SATU LAPIS DI ATAS mekanisme yang sudah ada, bukan
mengganti apa pun yang lama.

## Pola: 2 tahap, ortogonal terhadap `status`

1. **Hapus (ke Sampah)** — kolom baru `deleted_at` (+ `deleted_by`) di
   `transactions` dan `sources`. SENGAJA bukan status baru (`'DELETED'`)
   supaya makna ACTIVE/NEEDS_REVIEW/VOID/SUPERSEDED yang sudah dipakai di
   banyak tempat (constraint, laporan, dst) tidak perlu diubah. "Dihapus"
   di sini murni soal "boleh tampil di query normal atau tidak" — baris
   dengan `deleted_at` terisi otomatis hilang dari SEMUA tempat (Overview,
   Transaksi, laporan harian/mingguan/bulanan, deteksi duplikat saat
   upload baru, dst — lihat daftar file di bawah), tanpa perlu dihapus
   fisik. Reversibel kapan saja lewat "Pulihkan".
2. **Hapus Permanen** — betulan `DELETE FROM ...`, membersihkan semua
   yang menempel dulu (urutan penting, FK tidak cascade):
   `transaction_events` → `duplicate_flags` → `previous_row_id` di baris
   lain yang menunjuk balik → baris `transactions` itu sendiri (`
   transaction_lines` ikut lewat CASCADE bawaan). SENGAJA cuma bisa
   dipanggil untuk baris yang SUDAH ada di Sampah (dicek di dalam fungsi
   `hardDeleteTransaction`/`hardDeleteSource` sendiri, bukan cuma di rute
   API) — jadi selalu butuh 2 aksi sadar sebelum data beneran hilang.
   Produk ikut pola sama: `archiveProduct()` (sudah ada dari awal) →
   `hardDeleteProduct()` (baru, cuma jalan kalau `is_active = false`).

## 2 level: per-transaksi & per-batch-upload

Selain hapus 1 transaksi, ada juga hapus 1 BATCH UPLOAD sekaligus
(`softDeleteSource`/`hardDeleteSource`) — source + semua transaksi
turunannya, 1 DB transaction (semua-atau-tidak-sama-sekali). Ini yang
paling kepakai buat latihan: upload file test yang salah/berantakan,
tinggal hapus 1 batch dari Data Inbox, tidak perlu hapus satu-satu di
halaman Transaksi.

**Simplifikasi yang disengaja** (ditulis eksplisit di kode juga):
`restoreSource()` memulihkan SEMUA transaksi dari source itu yang sedang
di Sampah — termasuk yang kebetulan sebelumnya dihapus sendiri-sendiri
lewat `softDeleteTransaction`, bukan cuma yang ikut lewat aksi hapus
batch. Sistem ini tidak menyimpan "baris ini kehapus gara-gara aksi
mana", cuma "kapan". Untuk data uji ini cukup aman.

## Efek samping yang perlu diketahui: upload file yang sama lagi

`sources` tadinya punya `UNIQUE (business_id, file_hash)` biasa —
kalau dibiarkan, upload ulang file test yang sama setelah di-hapus-ke-
Sampah bakal tetap DITOLAK (baris lama masih ada secara fisik, cuma
ditandai). Diganti jadi **partial unique index**
(`WHERE deleted_at IS NULL`) — file yang sama boleh diupload ulang begitu
batch lamanya di Sampah, tapi tetap ditolak kalau batch lamanya masih
aktif (mencegah upload dobel tanpa sengaja seperti sebelumnya).

## Migrasi database

`schema.sql` sudah diupdate (berlaku untuk instalasi BARU). Untuk
database yang SUDAH JALAN, jalankan sekali:

```
npx tsx scripts/migrate-add-trash.ts
```

Aman dijalankan berkali-kali (semua langkah pakai IF NOT EXISTS/IF
EXISTS). Menambah `deleted_at`/`deleted_by` ke `transactions` & `sources`,
bikin index buat query Sampah, dan mengganti constraint file_hash jadi
partial index seperti dijelaskan di atas.

## File yang berubah/baru

**Skema & migrasi**
- `lib/talatee-core/schema.sql` — kolom `deleted_at`/`deleted_by`, partial
  unique index file_hash
- `scripts/migrate-add-trash.ts` (baru)

**Logic inti**
- `lib/talatee-core/lifecycle.ts` — `softDeleteTransaction`,
  `restoreTransaction`, `hardDeleteTransaction`, `softDeleteSource`,
  `restoreSource`, `hardDeleteSource`, class `DeletionBlockedError`
- `lib/talatee-core/products.ts` — `hardDeleteProduct`
- `lib/talatee-core/metrics.ts` — filter `deleted_at IS NULL` ditambah ke
  SEMUA query yang baca `transactions`/`sources` untuk tampilan normal
  (getDailyMetrics, getDashboardSummary, getNeedsReviewQueue,
  getPendingDuplicateFlags, getVersionHistory, listTransactions,
  getDataInbox, getTopProducts, getWeeklyReport, getMonthlyReport,
  getDailyTrend, getBusiestSlot) + fungsi baru `listTrashTransactions`,
  `listTrashSources` khusus halaman Sampah
- `lib/talatee-core/duplicate.ts` — kandidat duplikat tidak lagi termasuk
  transaksi yang sudah di Sampah
- `lib/talatee-core/ingest.ts` — cek file_hash duplikat kini abaikan
  batch yang sudah di Sampah

**API baru**
- `POST /api/transactions/{rowId}/delete` — ke Sampah
- `POST /api/transactions/{rowId}/restore` — pulihkan
- `POST /api/sources/{sourceId}/delete` — ke Sampah (1 batch)
- `POST /api/sources/{sourceId}/restore` — pulihkan (1 batch)
- `GET /api/trash` — daftar semua isi Sampah
- `DELETE /api/trash/transactions/{rowId}` — hapus permanen
- `DELETE /api/trash/sources/{sourceId}` — hapus permanen (1 batch)
- `DELETE /api/products/{productId}/purge` — hapus produk permanen
  (`DELETE /api/products/{productId}` yang lama TETAP jalan seperti
  biasa untuk arsip/soft-delete, tidak diubah)

**UI**
- `components/TrashPage.tsx` + `app/trash/page.tsx` (baru) — halaman
  Sampah, Pulihkan (langsung) / Hapus Permanen (`window.confirm` dengan
  penekanan eksplisit)
- `components/TransactionsList.tsx` — tombol "🗑️ Hapus" per baris
  (konfirmasi inline, ringan, karena reversibel)
- `components/DataInboxList.tsx` — tombol "🗑️ Hapus" per batch upload
  (konfirmasi inline, sebut jumlah transaksi yang ikut terhapus)
- `components/ProductsList.tsx` — tombol "Hapus Permanen" untuk produk
  yang sudah diarsipkan (`window.confirm`, sama pola dengan tombol
  "Arsipkan" yang sudah ada)
- `components/Sidebar.tsx` — "Sampah" jadi item nav beneran (`/trash`)
- `components/AdminHeader.tsx` — judul halaman untuk `/trash`

## Cara cek

1. Jalankan migrasi (`npx tsx scripts/migrate-add-trash.ts`) kalau
   database sudah pernah dipakai sebelumnya.
2. Upload 1 file CSV test → cek muncul di Overview & Transaksi.
3. Di halaman Transaksi, klik "🗑️ Hapus" salah satu baris → konfirmasi →
   baris hilang dari daftar (dan dari semua angka di Overview).
4. Buka `/trash` (menu Sampah di sidebar) → baris tadi ada di sana →
   klik "↺ Pulihkan" → balik muncul di Transaksi.
5. Coba lagi, kali ini di `/trash` klik "Hapus Permanen" → konfirmasi 2x
   (browser + kode) → baris beneran hilang, cek juga tidak nyangkut di
   `transaction_events`/`duplicate_flags` (query manual ke database kalau
   mau pastikan).
6. Di Data Inbox (bagian bawah Overview), coba "🗑️ Hapus" 1 batch upload
   utuh → semua transaksi dari file itu ikut hilang sekaligus. Cek juga
   bisa upload ulang file yang SAMA setelah itu (tidak lagi ditolak
   "sudah pernah diupload").
7. Di halaman Produk, arsipkan 1 produk → tombol "Hapus Permanen" baru
   muncul setelah diarsipkan (coba tanpa arsip dulu — pastikan tidak ada
   jalan pintas untuk hard-delete produk yang masih aktif).
