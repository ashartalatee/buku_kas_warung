# Redesign UI Panel Admin — 5 Sep 2026

Semua halaman ADMIN (Overview `/`, Transaksi `/transactions`, Produk & Stok
`/products`, Login `/login`) dirombak tampilannya. **Tidak menyentuh**
`/dashboard?key=...` (dashboard client via link WA) — itu desain terpisah
yang sudah kamu tes & approve sebelumnya, sengaja dibiarkan.

## Konsep: "Buku Kas" (ledger)

Satu font (IBM Plex Mono) di semua tempat — bukan gaya "developer tool",
tapi karena aplikasi ini secara harfiah BUKU KAS: di ledger fisik, angka
berbaris rapi di kolom seperti mesin ketik/kalkulator kasir. Warna: navy
`#142850` (satu-satunya warna "brand", dipakai di nav bar & tombol utama),
krem `#f6f2e6` (background halaman), putih-gading `#fffdf6` (permukaan
kartu). Hijau/merah-bata/amber CUMA dipakai untuk makna semantik (uang
masuk/perlu perhatian/bahaya) — tidak didekorasi ke tempat lain.

Kartu pakai garis tipis (hairline), tanpa shadow, radius kecil (4px) — bukan
kartu-SaaS seragam berbayang lembek. Seksi yang BUTUH TINDAKAN (Needs
Review, Duplikat, Stok Menipis) ditandai garis tebal di sisi kiri; seksi
yang cuma informasi (Data Inbox, riwayat) polos tanpa aksen warna.

Link navigasi lama ("Lihat semua transaksi →") diganti jadi tab yang jelas
statusnya (aktif/tidak) di bar navy atas, konsisten di 3 halaman.

## File yang berubah (14 file, semua admin)

- `app/globals.css` — token warna & font (CSS variables)
- `app/layout.tsx` — font IBM Plex Mono (ganti Geist bawaan), title tab
  browser diperbaiki (tadinya "Create Next App")
- `components/AdminNav.tsx` (baru) — bar navigasi tab
- `app/page.tsx`, `app/products/page.tsx`, `app/transactions/page.tsx` —
  pakai AdminNav
- `app/login/page.tsx` — restyle penuh
- `components/OverviewPage.tsx`, `NeedsReviewList.tsx`,
  `DuplicateFlagList.tsx`, `DataInboxList.tsx`, `UploadCsvForm.tsx`,
  `TransactionsList.tsx`, `ProductsList.tsx` — semua disamakan token warna
  & kartunya, TIDAK ADA perubahan logic/fungsi, murni tampilan

## Cara pasang

1. Extract, timpa 14 file dengan struktur folder yang sama
2. Restart `npm run dev` (font baru perlu recompile)
3. Cek semua halaman: `/`, `/transactions`, `/products`, `/login` (logout
   dulu lewat hapus cookie atau tunggu sesi habis kalau mau lihat halaman
   login) — pastikan tab nav di atas berfungsi & warnanya konsisten
