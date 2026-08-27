# Menyambungkan Kembali WhatsApp (WAHA + n8n) ke Backend Baru

Ini menyambungkan workflow n8n lama kamu (`whatsapp-qa-v9-upload`,
`laporan-otomatis-v3`) ke core engine baru yang sudah dites lengkap
(validasi, lifecycle, duplicate detection) — bukan ke Flask API lama
yang cuma append data mentah tanpa filter.

**Filosofi perubahan ini: minim intervensi.** Node "Deteksi Jenis
Pertanyaan", "Susun Jawaban Teks", "Balas Teks via WAHA", "Cek Nomor
Diizinkan" — semuanya **TIDAK diubah sama sekali**. Cuma 3 hal yang
diganti:
1. URL yang dipanggil buat ambil data laporan (dari Flask ke Next.js)
2. URL yang dipanggil buat upload file (dari Flask ke Next.js)
3. Kode "Format Konfirmasi Upload" (karena bentuk respons upload
   sedikit beda — sekarang lebih detail: memisahkan yang butuh review
   dan yang duplikat)

## Langkah 1 — Pasang endpoint baru di project `buku-kas-warung`

Salin file-file ini (sama seperti update Excel sebelumnya — pakai
File Explorer, bukan terminal):

| Dari sini... | ...ke sini |
|---|---|
| `lib_talatee-core/metrics.ts` | `buku-kas-warung/lib/talatee-core/metrics.ts` (timpa) |
| `api_reports_daily/route.ts` | `buku-kas-warung/app/api/reports/daily/route.ts` (buat folder baru) |
| `api_reports_weekly/route.ts` | `buku-kas-warung/app/api/reports/weekly/route.ts` (buat folder baru) |

Restart `npm run dev` setelah itu.

**Cek dulu sebelum lanjut ke n8n** — buka browser:
```
http://localhost:3000/api/reports/daily
http://localhost:3000/api/reports/weekly
```
Harus muncul JSON seperti:
```json
{
  "tanggal": "2026-08-23",
  "total_revenue": 0,
  "total_orders": 0,
  "aov": 0,
  "top_produk": []
}
```
(Angka 0 itu wajar kalau belum ada transaksi di tanggal hari ini —
sama seperti kartu "Hari ini" di dashboard.)

## Langkah 2 — Import workflow baru ke n8n

File di `n8n-workflows-updated/`:
- `whatsapp-qa-v10-nextjs.json` — pengganti `whatsapp-qa-v9-upload`
- `laporan-otomatis-v4-nextjs.json` — pengganti `laporan-otomatis-v3`

Di n8n: **Import from File** → pilih kedua file itu satu-satu.
Jangan aktifkan dulu sebelum Langkah 3 selesai.

## Langkah 3 — Sesuaikan hal-hal yang spesifik ke environment kamu

Workflow yang di-import ini masih bawa beberapa nilai dari setup lama
kamu — cek dan sesuaikan kalau berubah:

- **Node "Balas Teks via WAHA"**: `session` (`REDACTED_SESSION_ID`)
  dan `X-Api-Key` (`REDACTED_API_KEY`) — sesuaikan kalau WAHA session/API key
  kamu sudah beda dari terakhir kali dipakai.
- **Node "Cek Nomor Diizinkan"**: daftar nomor yang boleh pakai bot
  (`REDACTED_PHONE_NUMBER`, dst) — masih sama seperti sebelumnya, edit
  kalau perlu.
- **URL `host.docker.internal:3000`**: ini mengasumsikan n8n jalan di
  Docker dan Next.js jalan di host di port 3000 (default `npm run dev`).
  Kalau port Next.js kamu beda, sesuaikan URL di node "Ambil Metrik
  dari API Next.js" dan "Upload ke Database".

## Langkah 4 — Test

1. Pastikan `npm run dev` jalan (Next.js) dan WAHA session masih
   aktif (scan ulang QR kalau perlu — cek di n8n atau UI WAHA).
2. Aktifkan workflow `whatsapp-qa-v10-nextjs` di n8n.
3. Kirim pesan WA dari nomor yang terdaftar: **"penjualan hari ini"**
   → harus dapat balasan laporan (kemungkinan Rp0 kalau belum ada
   transaksi hari ini — itu normal, sama seperti dashboard).
4. Kirim file CSV (yang formatnya sesuai template) lewat WA → harus
   dapat balasan konfirmasi, dan transaksinya muncul di dashboard web
   (`localhost:3000/transactions`).
5. Aktifkan `laporan-otomatis-v4-nextjs` kalau mau laporan harian jam
   21:00 otomatis terkirim.

## Kenapa ini lebih baik dari sebelumnya

Alur upload file lewat WA yang lama itu langsung `pandas.read_csv()`
→ insert SQLite, **tanpa validasi apa pun**. Sekarang, file yang
dikirim lewat WA melalui **pipeline yang sama persis** dengan yang
dites lengkap di dashboard web: validasi struktural, arithmetic,
duplicate detection, NEEDS_REVIEW gate. Kalau ada baris data yang
aneh, itu di-flag, bukan diam-diam masuk ke laporan — inilah yang
kemungkinan besar jadi penyebab "belum lancar" di versi lama.
