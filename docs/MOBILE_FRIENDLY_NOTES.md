# Mobile-friendly pass — 5 Sep 2026

Saya cek satu per satu bagian yang berisiko rusak di layar sempit
(320–375px, misal iPhone SE/Android kecil), lalu perbaiki yang konkret.
8 file, semua perubahan CSS/layout saja — tidak ada logic yang berubah.

## Yang diperbaiki

1. **`components/AdminNav.tsx`** — nav bar (nama brand + 3 tab) sebelumnya
   1 baris sejajar; di layar sempit "Buku Kas Warung" + "Overview" +
   "Transaksi" + "Produk & Stok" nyaris pasti kepotong/berdesakan. Sekarang:
   brand & tab jadi 2 baris di mobile (nav bar naik ke 1 baris lagi di layar
   ≥640px), label "Produk & Stok" dipendekkan jadi "Produk" (konsisten
   1-kata dengan "Overview"/"Transaksi"), dan ditambah `overflow-x-auto`
   sebagai jaring pengaman kalau ada layar yang masih terlalu sempit.

2. **`app/dashboard/layout.tsx`** — viewport meta tag untuk `/dashboard`
   (halaman yang PALING sering dibuka dari HP, lewat link WA) sebelumnya
   cuma mendefinisikan `themeColor`, tanpa `width`/`initialScale` eksplisit.
   Berisiko browser mobile merender halaman di lebar desktop lalu di-zoom
   out otomatis (halaman jadi kecil semua, harus pinch-zoom manual).
   Ditambahkan `width: "device-width", initialScale: 1` eksplisit.

3. **`components/NeedsReviewList.tsx`** & **`DuplicateFlagList.tsx`** —
   baris tiap item (teks alasan/keterangan + tombol aksi di sampingnya)
   sebelumnya selalu sejajar 1 baris; kalau teksnya panjang bisa
   berdesakan dengan tombol. Sekarang disusun vertikal di layar sempit,
   sejajar lagi di layar lebar (≥640px).

4. **`components/UploadCsvForm.tsx`** — judul "Upload data penjualan
   (CSV/Excel)" + link "Unduh Template CSV" disusun vertikal di mobile.

5. **`components/TransactionsList.tsx`** — baris transaksi (tanggal + jam +
   jumlah rupiah) + tombol "Koreksi": ditambah `flex-wrap` supaya tombol
   turun ke baris baru kalau teksnya panjang, bukan berdesakan/terpotong.

6. **`components/DataInboxList.tsx`** — nama file upload bisa panjang
   (nama file asli dari user, tidak bisa dikontrol). Ditambah `break-all` +
   `min-w-0` supaya nama file panjang membungkus ke baris baru, bukan
   meluber horizontal (yang akan bikin seluruh halaman bisa di-scroll ke
   samping — pengalaman mobile yang buruk).

7. **`components/ProductsList.tsx`** — nama produk (bisa panjang) di
   `ProductRow`: sama, ditambah `min-w-0`/`break-words` di sisi kiri +
   `shrink-0` di angka stok sisi kanan, supaya nama produk yang panjang
   tidak mendesak angka stok jadi terpotong.

## Yang saya cek tapi TIDAK diubah (sudah cukup aman)

- Form tambah/edit produk (grid 2 kolom) — cukup lega di layar 320px+
- Halaman login — sudah 1 kolom sempit dari awal
- Dashboard client (`/dashboard`) secara keseluruhan — sudah dirancang
  mobile-first (max-width kecil, 1 kolom) sejak awal, cuma viewport
  meta-nya yang perlu diperbaiki (lihat poin 2)

## Cara pasang

Extract & timpa 8 file dengan struktur folder yang sama, restart
`npm run dev`. Cara paling gampang tes: buka DevTools browser (F12) →
toggle device toolbar → pilih "iPhone SE" (375px, salah satu yang paling
sempit yang masih umum dipakai) → cek tiap halaman (`/`, `/transactions`,
`/products`, `/dashboard?key=...`).
