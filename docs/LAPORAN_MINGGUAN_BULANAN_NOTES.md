# Laporan Mingguan/Bulanan — 6 Sep 2026

## Yang selesai di sisi KODE (4 file ini)

1. **`lib/talatee-core/metrics.ts`** — fungsi baru `getMonthlyReport()`.
   Kalender bulan penuh (tanggal 1 s/d akhir bulan) — bukan trailing
   30-hari — supaya cocok mental model "laporan Agustus". Default ke
   **bulan kalender sebelumnya** kalau tidak diberi parameter (soalnya
   kalau dikirim otomatis tanggal 1, "bulan ini" baru punya 0-1 hari
   data). Bisa dikasih `year`/`month` spesifik untuk query manual.
   Bentuk return-nya sama persis dengan `getWeeklyReport` yang sudah ada
   (`periode`, `total_revenue`, `total_orders`, `aov`, `top_produk`).

2. **`app/api/reports/monthly/route.ts`** (baru) — `GET /api/reports/monthly`
   (bulan lalu) atau `GET /api/reports/monthly?year=2026&month=8` (bulan
   tertentu). Sama persis pola-nya dengan `/api/reports/weekly` yang sudah
   ada.

3. **`proxy.ts`** — daftarkan `/api/reports/monthly` ke `N8N_ROUTES`, jadi
   otomatis butuh header `X-Api-Key` (sama seperti daily/weekly), bisa
   dipanggil n8n.

4. **`PROJECT_CONTEXT.md`** — §3 dan §10 diupdate mencerminkan status
   sebenarnya (lihat bagian "Yang BELUM selesai" di bawah — PENTING).

## Yang BELUM selesai — ini di n8n, bukan di kode Next.js ini

Saya tidak punya akses ke instance n8n kamu, jadi bagian ini **wajib kamu
kerjakan sendiri di UI n8n**:

1. **Buat 2 workflow baru** (atau tambah ke yang sudah ada):
   - Cron Trigger tiap **Senin jam 08:00** → panggil `GET /api/reports/weekly`
     (header `X-Api-Key: <N8N_LOCAL_API_KEY>`) → format jadi teks WA → kirim
     via WAHA
   - Cron Trigger tiap **tanggal 1 jam 08:00** → panggil
     `GET /api/reports/monthly` → format teks → kirim WA
   - Bisa dicontek persis dari workflow laporan harian yang sudah jalan
     (`laporan-otomatis-v4-nextjs`) — tinggal ganti Cron schedule dan URL
     endpoint-nya saja, struktur response JSON-nya mirip (periode/
     total_revenue/total_orders/aov/top_produk).

2. **Tambah keyword WA baru** ("bulan ini"/"bulan lalu") di workflow WA
   Q&A (`whatsapp-qa-v10-nextjs`) kalau mau bisa ditanya manual juga,
   sama seperti "minggu ini" sekarang — panggil endpoint yang sama
   (`/api/reports/monthly`).

3. **Baru setelah kedua Cron Trigger itu benar-benar jalan dan dites**
   (tunggu minimal 1 siklus mingguan + tunggu tanggal 1 bulan berikutnya,
   atau majukan jam sistem buat tes), laporan mingguan/bulanan otomatis
   boleh diklaim ke client. Sebelum itu, tetap seperti kata kamu sendiri —
   **jangan diklaim ada**.

## Cara tes cepat endpoint baru (tanpa n8n dulu)

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" ... # (tidak perlu, ini tes API bukan DB)
```
Pakai `curl` atau Postman ke:
```
GET http://localhost:3000/api/reports/monthly
Header: X-Api-Key: <isi N8N_LOCAL_API_KEY dari .env.local>
```
Harus balas JSON periode bulan lalu dengan angka yang masuk akal (atau
semua 0 kalau memang belum ada transaksi ACTIVE di bulan itu).

## Cara pasang

Extract & timpa 4 file, restart `npm run dev`, tes endpoint di atas dulu
sebelum lanjut setup di n8n.
