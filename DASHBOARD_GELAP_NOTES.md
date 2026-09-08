# Redesign Dashboard Admin (gaya gelap/sidebar) — 6 Sep 2026

## Ruang lingkup — PENTING dibaca dulu

Ini cuma meng-update halaman **Dashboard (`/`)**. Halaman **Transaksi,
Produk & Stok, dan Upload Data MASIH pakai tema terang lama** (nav dropdown
☰, bukan sidebar) — SENGAJA belum disentuh. Alasannya: komponen di 3
halaman itu (ProductsList, TransactionsList, UploadCsvForm) masih pakai
warna teks GELAP (dirancang untuk latar terang) — kalau langsung dipindah
ke shell gelap tanpa reskin, teksnya jadi gelap-di-atas-gelap alias tidak
kebaca. Reskin 3 halaman itu ke gelap adalah pekerjaan lanjutan yang bisa
dikerjakan terpisah kalau kamu suka arah dashboard ini.

Jadi sekarang: buka `/` → gelap gaya sidebar baru. Klik ke `Transaksi`/
`Produk & Stok`/`Upload Data` dari sidebar → balik ke tampilan lama yang
terang (nav dropdown ☰ masih ada di situ, tidak hilang, cuma belum diganti
gaya sidebar).

## Yang REAL (data asli, bukan karangan)

- **Total Pendapatan, Jumlah Transaksi, Barang Terjual** — dihitung dari
  transaksi ACTIVE hari ini, plus badge "↑/↓ X% vs kemarin" (dihitung dari
  data kemarin yang sebenarnya). Kalau kemarin 0 dan hari ini ada data,
  badge-nya ganti jadi "Data baru, belum ada pembanding" — bukan
  persentase palsu dari pembagian 0.
- **Produk Aktif** — hitungan asli dari tabel produk yang baru kita
  bangun ("X dari Y total produk").
- **Grafik Penjualan** — 14 hari terakhir, data yang sama dengan yang
  dipakai dashboard client. Bentuknya bar chart (bukan line chart kayak
  mockup) -- pola bar ini sudah saya pastikan aman dari bug tinggi-0px
  yang pernah kejadian di dashboard client, jadi saya pertahankan
  polanya di sini daripada bikin ulang line chart dari nol.
- **Transaksi Terbaru** — 5 transaksi asli terakhir. Kolom **Kasir** dan
  **Metode Pembayaran** di mockup TIDAK saya buat — dua konsep itu tidak
  ada sama sekali di data (single-owner, tidak ada catatan cara bayar).
- **Notifikasi** — badge lonceng di header isinya jumlah asli (needs
  review + duplikat + stok menipis). Saya SENGAJA tidak bikin panel
  "Notifikasi & Alert" terpisah seperti di mockup, karena NeedsReviewList
  & DuplicateFlagList yang sudah ada di halaman ini SUDAH berfungsi persis
  sebagai notifikasi (lengkap dengan tombol aksi) — bikin panel kedua
  isinya sama itu duplikasi, bukan tambahan nilai.
- **Data Inbox** — fitur lama, direskin gelap.

## Yang ditandai "SEGERA HADIR" (bukan dikarang)

- **Metode Pembayaran** — tidak ada kolom cara-bayar di database sama
  sekali.
- **Aktivitas Terbaru** — butuh sistem log gabungan lintas-tabel
  (transaksi + stok + upload jadi 1 linimasa) yang belum dibangun.
- **Pelanggan, Laporan, Pengaturan** di sidebar — menu ada tapi sengaja
  TIDAK bisa diklik (bukan `<Link>`, cuma `<div>` dengan cursor
  "not-allowed"), supaya jelas ini rencana, bukan link rusak.
- **AI Assistant** di sidebar — sama, non-klik.
- **Kotak "Fitur Premium"** di bawah sidebar — SENGAJA saya ganti dari
  tombol upsell aktif ("Upgrade Sekarang") jadi kotak statis badge "SEGERA
  HADIR". Belum ada sistem tier/langganan apa pun di project ini — kalau
  saya biarkan tombolnya "hidup", itu menyesatkan siapa pun yang buka
  panel ini nanti.
- **Search box** di header — nonaktif (`disabled`), placeholder-nya bilang
  "(segera hadir)". Belum ada fitur pencarian sama sekali.

## File yang berubah (12 file)

- `lib/talatee-core/metrics.ts` — fungsi baru `getDashboardSummary()`
- `app/api/dashboard-summary/route.ts` (baru)
- `app/globals.css` — token warna gelap baru (terpisah dari tema lama)
- `app/layout.tsx` — font Inter ditambahkan (khusus dashboard baru; tema
  lama tetap pakai IBM Plex Mono)
- `app/page.tsx` — pakai shell baru
- `components/Sidebar.tsx` (baru)
- `components/AdminHeader.tsx` (baru)
- `components/AdminShell.tsx` (baru)
- `components/OverviewPage.tsx` — ditulis ulang total
- `components/NeedsReviewList.tsx`, `DuplicateFlagList.tsx`,
  `DataInboxList.tsx` — direskin gelap (cuma dipakai di halaman ini,
  aman tidak menyentuh halaman lain)

## Cara pasang

1. Extract & timpa 12 file (perhatikan folder `app/api/dashboard-summary/`
   itu baru, pastikan ke-copy utuh)
2. Restart `npm run dev` (font baru + CSS baru perlu recompile)
3. Buka `/` — harus langsung tampil gelap dengan sidebar
4. Cek badge notifikasi di header (lonceng) — angkanya harus sesuai
   jumlah needs-review + duplikat + stok menipis yang beneran ada
5. Klik ke Transaksi/Produk/Upload dari sidebar — pastikan masih normal
   (tema lama, belum berubah, itu memang belum digarap)
