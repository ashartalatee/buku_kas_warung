# Fitur baru: Kelola Produk & Stok — 5 Sep 2026

## ⚠️ Langkah wajib sebelum jalan: update database dulu

Ada 2 tabel baru (`products`, `stock_adjustments`) di `lib/talatee-core/schema.sql`.
**Setelah timpa file, jalankan ulang schema.sql ke database yang sudah ada:**

```
psql -U <user> -d buku_kas_warung -f lib/talatee-core/schema.sql
```

Aman dijalankan ulang — semua statement pakai `CREATE TABLE IF NOT EXISTS` /
`CREATE INDEX IF NOT EXISTS`, jadi tabel yang sudah ada (transactions, dll)
TIDAK akan tersentuh/hilang datanya. Cuma 2 tabel baru yang akan dibuat.

Kalau lupa langkah ini, halaman `/products` akan error "relation products
does not exist".

## Apa yang ditambahkan

- **`/products`** (halaman admin baru, link dari halaman utama "Kelola produk
  & stok →") — tambah/edit/arsipkan produk, sesuaikan stok, lihat riwayat
- **CRUD produk**: nama, kategori, satuan, harga jual, ambang stok menipis
- **Penyesuaian stok**: SATU-SATUNYA cara mengubah angka stok adalah tombol
  "Sesuaikan stok" (delta + alasan wajib dari daftar tertutup: Stok masuk,
  Terjual manual, Rusak/hilang, Koreksi hitung ulang, Lainnya + catatan
  opsional). Field stok di form edit sengaja read-only — konsisten dengan
  prinsip append-only yang sudah dipakai di `transaction_events`.
- **Riwayat stok per produk** — semua penyesuaian tercatat & bisa dilihat
  (tombol "Riwayat" di tiap produk)
- **Arsip, bukan hapus** — tombol "Arsipkan" itu soft-delete (`is_active =
  false`), data tidak pernah hilang. Bisa "Aktifkan lagi" lewat checkbox
  "Tampilkan produk yang diarsipkan"
- **Badge stok menipis** — kalau `low_stock_threshold` diisi dan stok sudah
  turun ke/bawah itu, muncul badge kuning di produk & ringkasan jumlah di atas

## ⚠️ Batasan penting — JANGAN diklaim ke client

**Stok TIDAK otomatis berkurang saat ada transaksi/penjualan masuk.**
`product_or_service` di `transaction_lines` (dari CSV/Excel) masih teks bebas,
belum di-link ke tabel `products` yang baru ini. Jadi:

- Ini murni **pencatatan stok manual** — dicek & disesuaikan sendiri oleh
  pemilik warung (misalnya tiap pagi hitung stok fisik, atau tiap kali barang
  masuk dari supplier)
- **BUKAN** sistem inventory real-time yang otomatis sinkron dengan penjualan
- Kalau nanti mau bikin auto-decrement, itu pekerjaan terpisah yang jauh lebih
  besar: perlu logic pencocokan nama produk CSV ↔ tabel products (fuzzy match?
  strict match? gimana kalau typo?), keputusan soal urutan proses (validasi
  transaksi dulu atau cek stok dulu), dan apa yang terjadi kalau transaksi
  masuk untuk produk yang belum terdaftar di `products`. Sengaja tidak
  dikerjakan sekarang — di luar scope "kelola stok/produk" yang diminta.

`PROJECT_CONTEXT.md` §3 sudah diupdate mencerminkan ini.

## File yang berubah/ditambah

**Baru:**
- `lib/talatee-core/products.ts` — logic inti (CRUD + adjustStock, transactional)
- `app/api/products/route.ts` — GET list, POST create
- `app/api/products/[productId]/route.ts` — PATCH edit, DELETE arsip (+ reaktivasi via PATCH `{is_active:true}`)
- `app/api/products/[productId]/adjust-stock/route.ts` — POST penyesuaian stok
- `app/api/products/[productId]/history/route.ts` — GET riwayat stok
- `components/ProductsList.tsx` — UI lengkap
- `app/products/page.tsx` — halaman pembungkus

**Diubah:**
- `lib/talatee-core/schema.sql` — tambah tabel `products` + `stock_adjustments`
- `lib/talatee-core/types.ts` — tambah tipe `StockAdjustmentReason`
- `app/page.tsx` — tambah link nav ke `/products`
- `PROJECT_CONTEXT.md` — §3 diupdate (dipindah dari "belum ada" ke "sudah jalan", dengan catatan batasan di atas)

## Cara pasang

1. Extract zip ini, timpa semua file dengan struktur folder yang sama
2. `psql -U <user> -d buku_kas_warung -f lib/talatee-core/schema.sql` (WAJIB — lihat di atas)
3. Restart `npm run dev`
4. Buka `/` (dashboard admin) → klik "Kelola produk & stok →"
5. Tes: tambah 1 produk dengan stok awal, coba "Sesuaikan stok" (+ dan -),
   cek "Riwayat" muncul, coba "Arsipkan" lalu "Aktifkan lagi"
