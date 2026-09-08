# Rampingkan Overview + Pindah Upload Data — 7 Sep 2026

Lanjutan diskusi setelah `DASHBOARD_TERANG_MOBILE_NOTES.md`. Keluhannya:
Overview kepenuhan section yang saling tumpang tindih (efek dari
ngikutin mockup 1:1 minggu lalu), dan halaman Upload Data di navbar masih
pakai form lama yang polos padahal sudah ada versi bagus (drag & drop) —
cuma nyasar dipakai di Overview, bukan di halaman Upload Data-nya sendiri.

## Upload Data: 1 widget, 1 tempat

Sebelumnya `UploadCsvForm` punya 2 variant (`"ledger"` untuk `/upload`,
`"dash"` untuk widget di Overview) karena 2 tempat itu temanya beda.
Sekarang disederhanakan jadi 1 tampilan aja (drag & drop, tema dash) —
dipakai HANYA di `/upload`. Widget kembar di Overview dibuang total,
bukan disembunyikan.

## Yang dibuang dari Overview, dan kenapa

Semua section di bawah ini DIBUANG (bukan disembunyikan/dikomentari —
file-nya dihapus kalau memang sudah tidak dipakai di tempat lain):

| Section | Kenapa dibuang |
|---|---|
| 5 kartu Status Strip (Sistem Online/Data Terakhir Masuk/Total Transaksi/Data Perlu Diperiksa/Proses Terakhir) | Info-nya sudah kepakai di section lain (Butuh Perhatian, Ringkasan Bisnis) — 5 kartu ini malah tumpang tindih SATU SAMA LAIN sendiri ("Data Terakhir Masuk" & "Proses Terakhir" nyaris sama persis) |
| Status Pipeline Sistem | Statis, cuma dekorasi "sistem kami keren" — bukan info yang dicek harian oleh pemilik warung |
| Data Bermasalah (tabel) | Duplikat PERSIS dari NeedsReviewList/DuplicateFlagList di section "Butuh Perhatian", cuma versi read-only |
| Log Sistem | Duplikat PERSIS dari "Aktivitas Terakhir" (sumber data sama), cuma beda gaya render — dulu dipertahankan demi ngikutin mockup, sekarang jujur nggak nambah value |
| Upload Data (widget) | Pindah ke `/upload` (lihat di atas) |
| "Metode Pembayaran" (Segera Hadir) | Placeholder kosong, belum ada datanya sama sekali |
| "Total Pendapatan" (kartu metrik di Ringkasan Bisnis) | Tumpang tindih dengan kartu "Hari" di Omzet per Periode (hero baru) — angkanya identik, cuma beda tempat |

File yang ikut dihapus karena jadi tidak dipakai di mana pun lagi:
`components/SystemStatusStrip.tsx`, `components/SystemPipelineCard.tsx`,
`components/DataBermasalahTable.tsx`.

`RecentActivityFeed.tsx` disederhanakan dari 2 variant (`timeline`/`log`)
jadi 1 tampilan saja (dulu buat "Log Sistem", sekarang dibuang).

## Struktur Overview sekarang (lebih pendek)

1. **Omzet per Periode** (hero, paling atas)
2. **Butuh Perhatian** (NeedsReviewList + DuplicateFlagList)
3. **Aktivitas Terakhir**
4. **Ringkasan Bisnis** — 3 kartu metrik (Jumlah Transaksi/Barang
   Terjual/Produk Aktif), Grafik 14 Hari, Transaksi Terbaru, Data Inbox

## File yang berubah

- `components/UploadCsvForm.tsx` — hapus variant, sisa 1 tampilan (dash)
- `app/upload/page.tsx` — pakai `UploadCsvForm` baru
- `components/OverviewPage.tsx` — ditulis ulang, struktur dirampingkan
- `components/RecentActivityFeed.tsx` — hapus variant "log"
- `components/Sidebar.tsx` — perbaiki komentar basi yang masih nyebut
  komponen yang sudah dihapus
- **Dihapus**: `components/SystemStatusStrip.tsx`,
  `components/SystemPipelineCard.tsx`, `components/DataBermasalahTable.tsx`
