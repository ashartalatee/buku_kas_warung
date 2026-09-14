# Fix bug "tanggal transaksi ada di masa depan" — 5 Sep 2026

9 file di zip ini: 7 diubah/ditambah untuk PERBAIKAN KODE (akar bug),
1 diubah untuk dokumentasi (`PROJECT_CONTEXT.md`), dan `package.json`
cuma nambah 1 baris script. Aman ditimpa satu-satu — tidak menyentuh file
lain.

## Akar penyebab

5 tempat di kode menghitung "hari ini" dengan:
```
new Date().toISOString().slice(0, 10)
```
Ini SELALU tanggal kalender **UTC**, bukan WIB. WIB = UTC+7, jadi antara
jam **00:00–06:59 WIB**, versi UTC masih menunjukkan **tanggal kemarin**.
Akibatnya: transaksi yang tanggalnya "hari ini" (WIB, benar), kalau
divalidasi di jam segitu, dibandingkan ke "hari ini" versi kode yang
masih mundur 1 hari → tanggal transaksi keliatan "lebih besar" → ditandai
NEEDS_REVIEW dengan pesan "ada di masa depan". Ini juga berpotensi bikin
laporan/dashboard "hari ini" salah nunjuk hari di jam-jam yang sama.

## File yang diubah (perbaikan kode, akar penyebab)

1. **`lib/talatee-core/date-utils.ts`** (baru) — `getTodayLocalDate()`,
   hitung tanggal via `Intl.DateTimeFormat` dengan `timeZone: "Asia/Jakarta"`
   eksplisit (bisa diatur lewat `BUSINESS_TIMEZONE` di `.env.local` kalau
   nanti ada klien di WITA/WIT).
2. **`lib/talatee-core/validation.ts`** — pakai `getTodayLocalDate()`,
   bukan `toISOString()`. Ini yang bikin NEEDS_REVIEW salah.
3. **`lib/talatee-core/metrics.ts`** — 2 titik fallback (`getWeeklyReport`,
   `getDailyTrend`) saat belum ada transaksi ACTIVE sama sekali.
4. **`app/api/metrics/daily/route.ts`** — default `?date=` kalau kosong.
5. **`app/api/reports/daily/route.ts`** — default `?date=` (dipakai n8n
   untuk laporan harian & WA Q&A "penjualan hari ini").
6. **`app/api/reports/overview/route.ts`** — "hari ini" untuk kartu di
   `/dashboard`.

Yang SENGAJA tidak disentuh: `lib/talatee-core/backup.ts` (2 pemakaian
`toISOString()` di sana cuma untuk nama file/metadata backup, bukan
perbandingan tanggal — timezone tidak relevan di situ) dan
`metrics.ts:shiftDate()` (sudah timezone-safe dari awal karena murni
operasi UTC pada tanggal, tidak bergantung pada "sekarang").

## File baru — remediasi data lama

**`scripts/fix-future-date-false-positives.ts`** — perbaikan kode di atas
CUMA mencegah bug baru ke depannya. Transaksi lama yang SUDAH kadung
ke-flag NEEDS_REVIEW (per catatan kamu: banyak dari Agustus 2026) tidak
otomatis ke-benerin sendiri. Script ini:

- Cari baris `status = NEEDS_REVIEW` yang `validation_notes`-nya menyebut
  "masa depan"
- Cuma auto-selesaikan baris yang (a) errornya PERSIS SATU pesan itu saja
  (bukan gabungan dengan error lain), DAN (b) setelah dihitung ulang pakai
  tanggal WIB yang benar, ternyata memang tidak di masa depan
- Baris yang errornya gabungan, atau yang tanggalnya BENAR di masa depan
  (kemungkinan salah ketik asli, bukan gara-gara bug) — dilewati, tetap
  tampil di daftar untuk kamu cek manual lewat dashboard seperti biasa
- **Default dry-run** — cuma menampilkan daftar, tidak mengubah apa pun

Cara pakai (setelah `npm install` & `.env.local` terisi):
```
npm run fix-future-dates                 # dry run — lihat dulu apa yang akan diubah
npm run fix-future-dates -- --apply      # baru benar-benar terapkan
```

## Dokumentasi

`PROJECT_CONTEXT.md` §7 dan §10 diupdate: item ini ditandai selesai,
dengan ringkasan akar penyebab & cara perbaikannya, supaya AI assistant
lain atau kamu sendiri nanti tidak perlu investigasi ulang dari nol.

## Cara pasang

1. Extract zip ini, timpa file dengan struktur folder yang sama di
   project kamu (`lib/talatee-core/...`, `app/api/...`, `scripts/...`,
   `package.json`, `PROJECT_CONTEXT.md`)
2. Restart `npm run dev`
3. `npm run fix-future-dates` dulu (dry run) — lihat berapa baris yang
   kena, baca daftar yang dilewati kalau ada
4. Kalau hasilnya masuk akal, `npm run fix-future-dates -- --apply`
5. Cek dashboard admin (`/`) — jumlah NEEDS_REVIEW harusnya turun sesuai
   jumlah yang di-apply barusan
