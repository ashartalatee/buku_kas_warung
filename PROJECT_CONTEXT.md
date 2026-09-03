# Buku Kas Warung — Konteks Proyek

> Dokumen ini dibuat supaya siapa pun (termasuk AI assistant lain, atau Anda sendiri
> di laptop yang berbeda) bisa memahami proyek ini dengan cepat: apa tujuannya, apa
> yang sudah jalan, apa yang belum, dan keputusan-keputusan penting yang sudah diambil
> beserta alasannya. Terakhir diperbarui: 3 September 2026.

## 1. Apa ini, dan untuk siapa

**Buku Kas Warung** adalah aplikasi pencatatan transaksi otomatis untuk warung/laundry/
bengkel kecil. Pemilik usaha kirim CSV/Excel transaksi lewat WhatsApp, sistem
memvalidasi dan membersihkan datanya, lalu mengirim laporan otomatis dan link
dashboard kembali lewat WhatsApp — pemilik usaha tidak perlu buka aplikasi apa pun.

Ini adalah **produk turunan** dari ekosistem **Talatee** (lihat bagian 8) — versi
Level 1 yang dirancang untuk 1 instalasi = 1 klien (lihat bagian 4 soal model bisnis).

**Tujuan pemilik proyek (Anda):** menjadikan ini "senjata utama" untuk dipromosikan
lewat konten TikTok/live, dengan tujuan mendapat client (warung/laundry/bengkel) yang
membayar untuk jasa ini.

## 2. Arsitektur teknis

```
WhatsApp (pemilik warung)
    │  kirim CSV/Excel, atau chat "laporan minggu ini"
    ▼
WAHA (WhatsApp HTTP API, Docker, port 3001)
    │  webhook pesan masuk
    ▼
n8n (workflow automation, 2 workflow: whatsapp-qa, laporan-otomatis)
    │  HTTP request ke Next.js
    ▼
Next.js 16 (App Router, Turbopack)  ◄── ini yang Anda develop di VS Code
    │
    ├── proxy.ts          (autentikasi: session cookie / API key / share key)
    ├── app/api/*          (endpoint REST)
    ├── lib/talatee-core/*  (logic inti: validasi, dedup, lifecycle, metrics, backup)
    └── app/dashboard, app/transactions, app/login  (halaman)
    │
    ▼
PostgreSQL 16 (server lokal terpisah, port 5432, database: buku_kas_warung)
    │
    │  (fire-and-forget, tidak boleh mengganggu alur utama)
    ▼
Talatee (command center terpisah, lihat bagian 8)
```

**Stack:** Next.js 16 (App Router, Turbopack — CATATAN: banyak API berbeda dari Next.js
versi lama, termasuk `middleware.ts` yang sudah diganti `proxy.ts`), TypeScript,
PostgreSQL 16 (`pg` driver), Tailwind CSS, WAHA (WhatsApp gateway), n8n (automation).

## 3. Status sebenarnya: sudah jalan vs masih rencana

Ini penting — sempat ada beberapa diagram visi ("Talatee Business System",
"Arsitektur Talatee — Sistem Data & Backup Terbaik") yang jauh lebih ambisius dari
kode yang ada. Tabel ini adalah **kenyataan di kode**, bukan visi:

### Sudah jalan & teruji
- Input data: upload CSV/Excel lewat WA (bukan foto/OCR — itu belum ada)
- Validasi arithmetic (qty × harga = subtotal, dengan toleransi pembulatan)
- Deteksi duplikat berbasis fingerprint (skor, bukan exact match sederhana)
- Lifecycle transaksi lengkap: koreksi = versi baru (row lama SUPERSEDED), void
  (bukan hapus), audit trail penuh via `transaction_events`
- Laporan **harian** otomatis jam 21:00 (terjadwal, n8n)
- Tanya laporan via WA, tapi **cuma 4 kata kunci**: minggu, penjualan/revenue/omset,
  produk terlaris/laris, order/transaksi — di luar itu tidak dikenali
- Dashboard client (`/dashboard?key=...`) — ringkasan visual, gaya nota/buku kas
- Autentikasi dasar: login password untuk dashboard admin (`/login`), API key
  terpisah untuk endpoint yang dipanggil n8n, share-key untuk link dashboard WA
- **Migrasi ke PostgreSQL** (dari SQLite) — selesai total, teruji 15 skenario 2x,
  data pilot (172 transaksi) pindah 100% utuh
- Backup otomatis via `pg_dump`, retensi 14 hari, sudah dites bisa di-restore

### Belum ada (jangan diklaim ke client)
- Laporan **mingguan/bulanan terjadwal otomatis** (mingguan cuma bisa ditanya manual,
  bulanan tidak ada sama sekali)
- Kelola stok/produk, input manual lewat web
- Retry queue / status tracking pengiriman WA (kalau WA gagal, tidak ada retry
  otomatis, tidak ada tracking PENDING→SENT→DELIVERED)
- Alert otomatis (penjualan turun, stok menipis, anomali)
- Fallback channel lain (Email dll) kalau WA down
- Enkripsi data at-rest
- Auth multi-user / multi-tenant sungguhan (lihat bagian 4)
- OCR foto struk

## 4. Model bisnis: keputusan yang BELUM final

Dua arah dibahas, **belum diputuskan final**, tapi arsitektur saat ini (SQLite dulu,
sekarang Postgres single-database-per-instalasi) paling dekat dengan **Jasa Langsung**:

- **Jasa Langsung**: Anda install & kelola 1 instalasi per klien (warung/laundry/
  bengkel), Anda jadi operator/tech support-nya. Ini yang paling siap dari sisi kode
  sekarang.
- **SaaS Mandiri**: klien daftar & pakai sendiri tanpa Anda turun tangan. Ini
  **jauh** dari siap — butuh auth multi-user sungguhan, onboarding self-serve
  (scan QR WA sendiri), billing, hosting multi-tenant. Belum dikerjakan sama sekali.

**Kenapa Postgres dipilih (bukan tetap SQLite):** pemilik proyek sudah familiar
Postgres + pgAdmin4 (dipakai juga di Talatee), dan lebih memilih migrasi sekarang
(saat masih 1 warung pilot, low-stakes) daripada nanti setelah ada client bayar
sungguhan (high-stakes, reputasi dipertaruhkan kalau ada bug migrasi). Ini keputusan
sadar, bukan default teknis.

## 5. Environment variables yang dibutuhkan

Semua ada di `.env.local` (**tidak pernah ke-commit ke git**, cek sendiri kalau pindah
laptop — harus dibuat ulang manual). Daftar keynya (tanpa nilai):

| Variabel | Untuk apa |
|---|---|
| `DATABASE_URL` | Koneksi Postgres, format `postgresql://user:pass@host:port/db` |
| `SESSION_SECRET` | Tanda tangan cookie login (string acak, jangan diketik manual) |
| `OWNER_PASSWORD` | Password login dashboard admin (`/login`) |
| `N8N_LOCAL_API_KEY` | API key yang dicek untuk endpoint dipanggil n8n (upload, reports) |
| `DASHBOARD_SHARE_KEY` | Key di URL `/dashboard?key=...` yang dikirim ke WA client |
| `TALATEE_API_URL` | Alamat Talatee command center (untuk sync bridge) |
| `TALATEE_API_KEY` | API key punya Talatee (beda dari `N8N_LOCAL_API_KEY`) |
| `TALATEE_SYNC_ENABLED` | `true`/`false`, matikan sync ke Talatee kalau perlu |
| `TALATEE_PILOT_BUSINESS_ID` | UUID business ini di tabel `businesses` (Postgres) |
| `TALATEE_PILOT_OWNER_ID` | Identitas pemilik (nomor WA/nama) |
| `BACKUP_DIR` | Folder tujuan backup, default `./backups` |
| `BACKUP_RETENTION_DAYS` | Berapa hari backup disimpan sebelum dihapus, default 14 |

Script standalone (`scripts/*.ts`, dijalankan via `npx tsx`) **tidak otomatis** baca
`.env.local` — makanya ada `scripts/_load-env.ts` yang harus di-`import` di baris
paling atas tiap script (parser manual, tahan UTF-8 BOM dan UTF-16, karena Notepad
Windows kadang simpan file dalam encoding yang bikin parser biasa gagal).

## 6. Keputusan desain penting & alasannya

- **Lifecycle transaksi (koreksi/void)**: tidak pernah UPDATE/DELETE langsung.
  Koreksi = row lama jadi `SUPERSEDED`, row baru `ACTIVE` (versi baru). Void = status
  jadi `VOID`, data tetap ada. Semua perubahan tercatat di `transaction_events`. Ini
  setara praktik akuntansi/audit sungguhan — jangan disederhanakan demi "kecepatan".
- **`uq_one_active_per_transaction`**: constraint database yang memastikan maksimal
  1 row `ACTIVE` per `transaction_id` — inilah yang mencegah race condition kalau
  ada 2 proses koreksi barengan (`createCorrection` di `lifecycle.ts` sengaja pakai
  Postgres transaction BEGIN/COMMIT + cek `rowCount` untuk deteksi conflict).
- **Kolom uang pakai `DOUBLE PRECISION`, BUKAN `NUMERIC`**: driver `pg` Node.js
  mengembalikan `NUMERIC` sebagai *string*, bukan angka — kalau dipaksa pakai
  `NUMERIC`, semua perhitungan arithmetic di `validation.ts`/`metrics.ts` akan diam-
  diam rusak. `COUNT(*)` juga di-cast eksplisit `::int` di tiap query karena
  defaultnya `BIGINT` (juga jadi string di driver `pg`).
- **`proxy.ts` bukan `middleware.ts`**: Next.js 16 yang dipakai project ini sudah
  deprecate `middleware.ts`, diganti `proxy.ts` (perilaku sama, cuma nama beda).
  Kalau nanti upgrade Next.js lagi, cek dulu apakah ada perubahan konvensi baru.
- **3 jenis autentikasi berbeda** (bukan cuma 1) karena ada 3 jenis pemanggil
  berbeda: manusia lewat browser (session cookie), mesin n8n (API key di header),
  link WA yang dibuka tanpa login (share key di query param). Jangan disatukan jadi
  1 mekanisme — kebutuhan keamanannya beda.
- **Sync ke Talatee sengaja "fire-and-forget"**: `syncToTalatee()` di
  `lib/talatee-bridge/sync.ts` menangkap semua error di dalam dirinya sendiri,
  tidak pernah `throw`. Kalau Talatee down, upload di Buku Kas Warung untuk pemilik
  warung TETAP harus sukses — sync ke Talatee adalah bonus, bukan dependency.

## 7. Isu yang diketahui, belum terselesaikan

- **"Tanggal transaksi ada di masa depan"** — banyak transaksi lama (Agustus 2026)
  ditandai `NEEDS_REVIEW` dengan pesan ini. Penyebabnya belum diinvestigasi — perlu
  dicek logic validasi tanggal di `lib/talatee-core/validation.ts`, kemungkinan
  device/server yang jadi sumber timestamp beda zona waktu atau salah baca "hari
  ini" dari OS.
- **WhatsApp rentan putus** — dokumentasi setup sendiri (`Setup_waha_n8n.md`, tidak
  di-commit ke git karena berisi kredensial) mencatat WebSocket suka putus-putus di
  jaringan tertentu, belum terdiagnosis. Sesi WA juga harus login ulang manual kalau
  expired/container restart — tidak ada auto-reconnect.
- **Kredensial default lemah** — WAHA API key (`REDACTED_API_KEY`) dan Postgres Talatee
  (`talatee`/`talatee`) masih default, dicatat eksplisit di `Setup_waha_n8n.md`
  sebagai "HARUS DIGANTI sebelum VPS/publik". Belum diganti per tanggal dokumen ini.
- **File upload tanpa validasi tipe yang jelas ke user** — kalau client kirim file
  selain CSV/Excel lewat WA, file itu diam-diam diabaikan tanpa pesan error balik.

## 8. Hubungan dengan Talatee

**Talatee** adalah command center terpisah (project lain, folder `talatee-database`)
yang memantau banyak business (warung, laundry, bengkel, dll) dari 1 dashboard.
Setiap kali Buku Kas Warung berhasil ingest data, ada sync satu-arah (fire-and-forget)
yang mengirim salinan raw file ke Talatee lewat `POST /ingest/upload`, supaya warung
ini otomatis muncul sebagai 1 "Business" di dashboard Talatee.

- Talatee pakai **PostgreSQL sendiri**, jalan di **Docker** (`talatee-database-
  postgres-1`, port **5434**, database `talatee_platform`) — **sengaja dipisah**
  dari Postgres Buku Kas Warung (port 5432) supaya eksperimen di Talatee tidak
  berisiko mengganggu data client yang sedang real dipakai.
- Ada juga fitur "Laboratorium" di dashboard Talatee — pipeline 7 langkah (Ambil
  Data → Bersihkan → Validasi → Analisis → Insight → Dashboard → Kirim WA) untuk
  menguji dataset sebelum "dipromosikan" jadi Project resmi. Langkah 5 (Insight AI)
  dan 7 (Kirim WA) masih placeholder "Segera hadir" — backend-nya belum ada.
- **Ada dashboard client versi lama** (gaya visual navy/krem/mono yang jadi acuan
  desain `/dashboard` sekarang) yang sempat dikira hilang — ternyata itu bukan
  bagian dari kedua project ini, kemungkinan project terpisah yang sudah tidak ada
  foldernya lagi. Desain barunya sudah dibangun ulang dari nol berdasarkan
  screenshot, bukan reuse kode lama.

## 9. Cara mulai kerja lagi dari nol (laptop baru / AI assistant baru)

1. Clone repo dari GitHub
2. Install PostgreSQL 16 terpisah (lihat bagian 4 — jangan gabung dengan server
   Talatee), buat database `buku_kas_warung`, import `lib/talatee-core/schema.sql`
3. Buat `.env.local` sendiri (lihat daftar variabel di bagian 5 — tidak ada
   template `.env.example` di repo per tanggal dokumen ini, PR yang bagus untuk
   ditambahkan)
4. `npm install`
5. `npx tsx scripts/verify-postgres-setup.ts` — harus keluar "✅ SEMUA TES LULUS"
   sebelum lanjut develop apa pun
6. `npm run dev`

## 10. Roadmap yang sudah disepakati (urutan prioritas)

1. ~~Backup otomatis~~ ✅ selesai
2. ~~Migrasi Postgres~~ ✅ selesai
3. Investigasi bug "tanggal di masa depan"
4. Ganti semua kredensial default sebelum dipakai produksi/demo ke client
5. Perbaiki klaim laporan mingguan/bulanan (bangun beneran, atau jangan diklaim di
   materi promosi dulu)
6. Auth multi-user sungguhan — HANYA kalau arah bisnis jelas condong ke SaaS Mandiri
