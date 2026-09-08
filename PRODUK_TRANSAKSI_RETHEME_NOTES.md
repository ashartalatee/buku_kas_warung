# Produk & Transaksi ikut tema terang (dash) — 8 Sep 2026

Penutup dari seri redesign admin (`DASHBOARD_TERANG_MOBILE_NOTES.md` →
`OVERVIEW_DECLUTTER_NOTES.md` → ini). Sebelumnya `ProductsList.tsx` dan
`TransactionsList.tsx` masih pakai tema lama "ledger" (krem/`bg-paper`,
font mono) sementara Overview/Sidebar/Header sudah terang (`dash`) —
kelihatan beda sendiri kayak 2 aplikasi berbeda ditempel jadi satu
(kartu produk krem di tengah halaman yang bg-nya abu-abu terang).

## Yang dilakukan

Konversi kelas Tailwind satu-satu (bukan ganti isi/logic sama sekali —
CRUD produk, penyesuaian stok, koreksi transaksi, semua logic-nya utuh):

| Lama (ledger) | Baru (dash) |
|---|---|
| `ledger-card` / `ledger-card--action` | `dash-card` / `dash-card--action` |
| `bg-navy`, `bg-navy-light` (hover), `border-navy` (focus), `text-navy` | `bg-dash-accent`, `hover:opacity-90`, `border-dash-accent`, `text-dash-accent` |
| `bg-paper` | `bg-dash-surface` |
| `bg-cream` | `bg-dash-surface-2` |
| `border-rule` | `border-dash-border` |
| `text-ink` | `text-dash-text` |
| `text-muted` | `text-dash-muted` |
| `text-paper` (teks di atas tombol berwarna) | `text-white` |
| `text-ledger-amber/red/green`, `bg-ledger-red/green` | `text-dash-amber/red/green`, `bg-dash-red/green` |

Ditambah `font-dash` di root komponen/halaman (`ProductsList.tsx`,
`app/transactions/page.tsx`) supaya font-nya ikut Inter (dash) bukan
IBM Plex Mono (default body, bekas tema ledger) lagi.

## Yang SENGAJA tidak disentuh

`app/login/page.tsx` masih tema ledger — itu halaman pra-login, di luar
`AdminShell`, jadi tidak termasuk "panel admin" yang dirapikan kali ini.
Kalau mau diseragamkan juga, bilang saja.

## Cek

Buka `/products` dan `/transactions` — kartu-kartunya sekarang harus
seragam (putih/abu-abu terang, font Inter) dengan Overview & Sidebar,
tidak ada lagi yang krem sendiri. Semua fungsi (tambah/edit/arsipkan
produk, sesuaikan stok, koreksi transaksi, hapus ke Sampah) harus tetap
jalan seperti biasa -- cuma tampilannya yang berubah.
