# Redesign Panel Admin (gelap → terang) + App-Shell Mobile — 7 Sep 2026

Lanjutan dari `DASHBOARD_GELAP_NOTES.md` (6 Sep). Dua perubahan besar:
1. Tema dashboard admin diganti dari gelap ke **terang**, mengikuti mockup
   baru (sidebar navy + konten terang, brand "Talatee").
2. Shell-nya sekarang **app-shell beneran**: tinggi dikunci ke layar
   (sidebar & header diam, cuma konten yang scroll), dan sidebar jadi
   **drawer geser** di layar sempit (<1024px), bukan dipaksa tampil penuh.

## Ruang lingkup — PENTING dibaca dulu

Beda dari redesign 6 Sep (yang cuma menyentuh `/`), kali ini **AdminShell
dipasang di SEMUA halaman admin** (`/`, `/transactions`, `/products`,
`/upload`) — supaya sidebar & app-shell konsisten di seluruh panel, bukan
cuma di Overview. TAPI konten di dalam `TransactionsList`/`ProductsList`/
`UploadCsvForm` (variant default) **belum ikut direskin ke tema terang
baru** — masih pakai tema "ledger" lama (font mono, warna cream/paper/ink).
Ini bukan bug, sengaja: reskin isi 3 halaman itu satu-satu adalah pekerjaan
lanjutan yang lebih besar lagi, di luar scope "bagian admin"-nya sendiri
(sidebar/header/shell) yang diminta kali ini. Efeknya cuma soal warna
tidak 100% seragam saat pindah halaman — bukan sesuatu yang rusak.

## Kenapa cuma ganti NILAI token, bukan nama-nya

Semua class `dash-*` (dash-card, text-dash-text, bg-dash-green/15, dst)
DIPERTAHANKAN persis sama. Yang berubah cuma nilai variabel `--color-dash-*`
di `app/globals.css`, dari gelap ke terang. Efeknya: NeedsReviewList,
DuplicateFlagList, DataInboxList — yang sebelumnya sudah dark-mode — ikut
otomatis jadi terang TANPA saya sentuh isi filenya sama sekali. Sidebar
sendiri sengaja TETAP gelap (kontras dengan konten), makanya dapat token
baru terpisah: `--color-dash-sidebar-*`.

## App-shell: apa bedanya dari sebelumnya

Sebelumnya `AdminShell` cuma `min-h-screen flex` — sidebar & header ikut
scroll bareng seluruh halaman. Sekarang:
- Pembungkus terluar: `h-dvh overflow-hidden` (tinggi dikunci ke layar).
- `<main>` (area konten): `flex-1 overflow-y-auto` + parent-nya `min-h-0`
  (kunci flexbox yang sering kelewat — tanpa `min-h-0`, `overflow-y-auto`
  di flex child tidak akan benar-benar scroll, dia malah memaksa parent
  melar).
- Sidebar: `lg:sticky lg:top-0` di desktop (ikut tinggi shell, tidak
  scroll terpisah), tapi `fixed` + `-translate-x-full`/`translate-x-0` di
  mobile (drawer).

## Sidebar jadi drawer di mobile

- `<1024px` (breakpoint `lg`): sidebar `position: fixed`, mulai di luar
  layar, digeser masuk kalau `open=true`. Ada backdrop gelap yang menutup
  drawer kalau ditekan, dan drawer **otomatis tertutup tiap pindah
  halaman** (`useEffect` yang dengar `pathname`) — supaya tidak ketinggalan
  terbuka menutupi halaman baru.
- `>=1024px`: sidebar selalu tampil (`lg:translate-x-0`), tombol hamburger
  di header disembunyikan (`lg:hidden`).
- State buka/tutup di-lift ke `AdminShell` (jadi client component sekarang,
  sebelumnya server component) supaya dipakai bareng oleh `AdminHeader`
  (tombol ☰) dan `Sidebar` (drawer + backdrop) tanpa nambah context/library
  baru.

## Yang REAL (data asli, bukan karangan) — bagian baru

- **Sistem Online / Sistem Gangguan** — hasil fetch `/api/sources` beneran
  dites; kalau gagal, kartu berubah jadi "Sistem Gangguan" (bukan
  klaim statis "online" terus-terusan).
- **Data Terakhir Masuk, Proses Terakhir** — dari baris Data Inbox
  (`/api/sources`) paling baru, sumber sama dengan `DataInboxList`.
- **Total Transaksi Tersimpan** — panjang array `/api/transactions`
  (SEMUA status, karena ini "berapa baris tersimpan", bukan "berapa yang
  valid" — itu ada di kartu "Jumlah Transaksi" di section Ringkasan
  Bisnis).
- **Data Perlu Diperiksa** — needs-review + duplikat, basis hitung sama
  dengan badge lonceng di header.
- **Aktivitas Terakhir & Log Sistem** — 1 komponen (`RecentActivityFeed`,
  2 variant tampilan) yang menggabung & mengurutkan 3 sumber nyata: upload
  (`/api/sources`), needs-review (`/api/needs-review`), duplikat
  (`/api/duplicates`). TIDAK ada "automation started"/"backup completed"
  seperti di mockup — itu tidak ada sumber datanya di sistem ini sekarang.
- **Status Pipeline Sistem** — statis (server component, tanpa fetch),
  menandai 7 tahapan yang MEMANG sudah dibangun & jalan (lihat
  `PROJECT_CONTEXT.md`). Subjudulnya sengaja bilang "sudah dibangun &
  berjalan (bukan status real-time per transaksi)" — supaya tidak
  terkesan mengklaim ada monitoring live yang sebenarnya belum ada.
- **Upload Data (drag & drop)** — `UploadCsvForm` dapat `variant="dash"`
  baru (drag & drop + radio "Sumber Data"), tapi logic upload-nya SAMA
  PERSIS dengan variant lama (`/upload`) — 1 fungsi `submitFile()` dipakai
  keduanya. Radio "Google Sheets"/"API" non-aktif + "Segera Hadir" (tidak
  ada integrasi itu); "Kasir" dari mockup DIHAPUS total karena tidak ada
  konsep sumber POS sama sekali di sistem ini (semuanya lewat file CSV/
  Excel).
- **Data Bermasalah** — tabel ringkas needs-review + duplikat. Kolom
  "Produk" di mockup DIGANTI "Jenis" (Perlu Review/Duplikat) — data kita
  di level TRANSAKSI, bukan per baris produk, jadi tidak jujur kalau
  dipaksa nampilin nama produk yang sebenarnya tidak nyambung ke
  masalahnya. Tombol "Periksa" scroll ke `#butuh-perhatian` (section
  NeedsReviewList/DuplicateFlagList di atas) — TIDAK menduplikasi logic
  resolve, biar cuma 1 tempat yang bisa mengubah data.
- **Jam & tanggal di header** — jalan tiap 30 detik (bukan sekali pas
  mount), dipaksa zona WIB lewat `Intl` (`timeZone: "Asia/Jakarta"`).
- **Menu Keluar** di avatar header — akhirnya benar-benar dipakai
  memanggil `POST /api/logout`. Endpoint ini sudah ada dari awal tapi
  sebelum ini TIDAK PERNAH dipanggil dari UI mana pun.
- **`getPendingDuplicateFlags`** — nambah `created_at` ke SELECT (kolomnya
  sudah ada dari awal di schema, cuma belum pernah dipilih) supaya
  `RecentActivityFeed` bisa mengurutkan flag duplikat bareng kejadian lain
  berdasarkan waktu asli.

## Yang TIDAK saya buang

Section "Ringkasan Bisnis" (kartu Pendapatan/Transaksi/Barang Terjual,
grafik 14 hari, Transaksi Terbaru, Data Inbox) dari redesign 6 Sep TETAP
ada, ditaruh di bawah section-section baru — ini data nyata & berguna,
menghapusnya cuma demi cocok 1:1 dengan mockup terasa seperti kemunduran.
Kalau kamu mau benar-benar 1:1 dengan mockup (tanpa section ini), tinggal
bilang, tinggal saya hapus.

## Nav sidebar: siapa yang link, siapa yang "Segera Hadir"

- **Overview, Upload Data, Transaksi, Produk** — link beneran.
- **Validasi** — beda kasus dari yang lain: fiturnya SUDAH ADA & jalan
  (NeedsReviewList + DuplicateFlagList di Overview), cuma belum jadi
  halaman sendiri. Diarahkan ke `/` dengan badge "Ada di Overview" (bukan
  "Segera Hadir" seperti Processing/dkk yang memang belum ada sama
  sekali).
- **Processing, Automation, Activity Log, Settings** — non-klik, belum
  ada halamannya.

## File yang berubah/baru

- `app/globals.css` — token dash diganti terang, token sidebar baru
- `components/AdminShell.tsx` — app-shell + state drawer (jadi client)
- `components/Sidebar.tsx` — drawer, grup nav baru, footer status/brand
- `components/AdminHeader.tsx` — hamburger, judul dinamis per halaman,
  jam real-time, menu Keluar
- `components/OverviewPage.tsx` — ditulis ulang, struktur ikut mockup +
  Ringkasan Bisnis lama di bawahnya
- `components/SystemStatusStrip.tsx` (baru) — 5 kartu status
- `components/RecentActivityFeed.tsx` (baru) — Aktivitas Terakhir + Log
  Sistem
- `components/SystemPipelineCard.tsx` (baru) — Status Pipeline Sistem
- `components/DataBermasalahTable.tsx` (baru)
- `components/UploadCsvForm.tsx` — tambah `variant="dash"`
- `lib/talatee-core/metrics.ts` — `getPendingDuplicateFlags` +created_at
- `app/transactions/page.tsx`, `app/products/page.tsx`,
  `app/upload/page.tsx` — pindah dari `AdminNav` ke `AdminShell`
- `components/AdminNav.tsx` — **dihapus** (sudah tidak dipakai di mana pun)

## Cara pasang & cek

1. Extract & timpa seluruh isi zip ke project (folder `app/`, `components/`,
   `lib/` sesuai path masing-masing).
2. `npm run dev`.
3. Desktop (>=1024px): buka `/` — sidebar navy selalu tampil, konten
   terang, scroll cuma di area konten (coba scroll panjang, sidebar &
   header harus diam).
4. Mobile — buka DevTools → toggle device toolbar → pilih "iPhone SE"
   (375px): sidebar harus TERSEMBUNYI by default, ada tombol ☰ di header.
   Tap ☰ → drawer geser masuk dari kiri + backdrop gelap. Tap backdrop
   atau ✕ → tertutup. Tap salah satu menu → drawer otomatis tertutup &
   pindah halaman.
5. Cek tiap halaman admin (`/`, `/transactions`, `/products`, `/upload`)
   — semua sekarang punya sidebar & header yang sama.
6. Coba avatar → Keluar di header → harus benar-benar logout (redirect ke
   `/login`, tidak bisa buka `/` lagi tanpa login ulang).
