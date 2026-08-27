# Talatee Bridge — Integrasi buku-kas-warung ke Talatee

Menyambungkan `buku-kas-warung` (produk vertikal) ke **Talatee** (command center kamu),
supaya tiap warung yang pakai buku-kas-warung otomatis muncul sebagai satu **Business**
di dashboard Talatee — bisa dipantau dari satu layar bareng semua klien lain.

## Prinsip

- **Satu arah**: buku-kas-warung -> Talatee. Talatee tidak pernah menulis balik ke
  buku-kas-warung.
- **Tidak pernah menggagalkan alur utama**: kalau Talatee down/tidak terjangkau, upload
  di buku-kas-warung tetap sukses seperti biasa untuk pemilik warung. Kegagalan sync
  cukup masuk log server (`console.error`), bukan error yang dilihat user.
- **Raw copy, bukan data olahan**: yang dikirim ke Talatee adalah file mentah apa adanya
  (persis yang diupload user) — konsisten dengan prinsip Talatee sendiri (raw data =
  source of truth, tidak pernah ditimpa).
- **Minim intervensi**: tidak ada logic ingest/lifecycle/duplicate-detection yang diubah
  sama sekali. Hanya nambah 1 file baru + sedikit ubahan di 1 route yang sudah ada.

## File yang ditambahkan/diubah

```
lib/talatee-bridge/sync.ts                       <- BARU
app/api/transactions/upload/route.ts             <- DIUPDATE (timpa yang lama)
```

## Cara pasang

### 1. Copy file baru
Taruh `lib/talatee-bridge/sync.ts` di lokasi yang sama di project buku-kas-warung kamu.

### 2. Timpa route upload
Ganti isi `app/api/transactions/upload/route.ts` dengan versi baru yang disertakan.
Diff-nya kecil — cuma 2 perubahan:
- File dibaca sekali jadi `Buffer` di awal (bukan `.text()`/`.arrayBuffer()` terpisah)
- Setelah ingest lokal sukses, ada 1 panggilan `syncToTalatee(...)` yang fire-and-forget

### 3. Tambah environment variable
Di `.env.local` buku-kas-warung, tambahkan:

```
TALATEE_API_URL=http://localhost:8000
TALATEE_SYNC_ENABLED=true
```

- `TALATEE_API_URL` — alamat backend Talatee. Kalau nanti Talatee di-hosting terpisah
  (bukan localhost lagi), tinggal ganti nilai ini.
- `TALATEE_SYNC_ENABLED` — set `false` untuk MATIKAN sync sementara (misal saat develop
  buku-kas-warung tanpa Talatee jalan), tanpa perlu hapus kode.

### 4. Pastikan business_type di buku-kas-warung sesuai kategori Talatee
Kategori di Talatee sudah diperluas supaya cocok dengan constraint
`business_type IN ('warung', 'laundry', 'bengkel')` yang sudah ada di skema
buku-kas-warung — tidak perlu mapping/translasi apa pun, nilainya dikirim apa adanya.

### 5. Build & test
```
npm run build
```
Pastikan tidak ada TypeScript error. Lalu jalankan seperti biasa (`npm run dev`), upload
1 file CSV/Excel test, dan cek:
- Response upload di buku-kas-warung tetap sama seperti sebelumnya (tidak berubah)
- Di terminal Next.js, harus muncul log `[talatee-sync] OK -> business "...", batch ..., N records`
- Buka dashboard Talatee (`localhost:5173/businesses`) — warung ini harus muncul sebagai
  Business baru dengan kategori yang sesuai `business_type`-nya

## Verifikasi Talatee down tidak menggagalkan upload

Test penting: matikan backend Talatee (`Ctrl+C` di terminal `uvicorn`), lalu coba upload
lagi di buku-kas-warung. **Response upload harus tetap sukses** seperti biasa — cuma akan
muncul log error `[talatee-sync] error tak terduga saat sync ke Talatee: ...` di terminal
Next.js, bukan error yang dilihat pemilik warung.

## Yang BELUM termasuk (di luar scope integrasi ini)

- Distribusi self-install (docker-compose gabungan buku-kas-warung + Talatee + n8n + WAHA)
- Mode SaaS/managed (kamu hosting satu Talatee pusat, tiap warung baru = 1 Business)
- Sinkronisasi dua arah, edit/koreksi transaksi dari sisi Talatee
