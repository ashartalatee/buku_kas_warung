# Update dashboard client — 5 Sep 2026

Isi zip ini CUMA 3 file yang diubah/ditambah (aman ditimpa, tidak menyentuh
file lain). Tujuan: bikin `/dashboard?key=...` (satu-satunya halaman yang
benar-benar dilihat client) terasa jadi, bukan prototipe.

## File yang berubah

1. **`app/dashboard/page.tsx`** (diubah)
   - Loading state sekarang skeleton yang meniru bentuk halaman asli
     (header + kartu), bukan cuma teks "Memuat dashboard..."
   - Auto-refresh diam-diam setiap 60 detik, supaya badge "LIVE" di
     header jujur — sebelumnya data cuma benar saat halaman pertama
     dibuka. Kalau refresh gagal (mis. jaringan putus sebentar), data
     lama tetap tampil, tidak diganti pesan error (gagal-senyap).
   - Ring badge "LIVE" tadinya border merah tapi titik di dalamnya
     hijau — sekarang konsisten hijau. Titik ikut berkedip pas lagi
     auto-refresh.
   - Grafik tren 14 hari sekarang punya empty state ("Belum ada
     transaksi tercatat...") kalau bisnis baru mulai dan datanya masih
     kosong semua — sebelumnya akan tampil bar-bar kecil yang
     membingungkan (kelihatan seperti ada data padahal semuanya 0).
   - Tooltip di bar grafik sekarang juga menyebut jumlah transaksi,
     bukan cuma rupiah.

2. **`app/dashboard/layout.tsx`** (baru)
   - Kasih `<title>` khusus ("Ringkasan Bisnis — Talatee") ke halaman
     ini — sebelumnya browser tab masih nampilin "Create Next App"
     bawaan `create-next-app`, kentara belum di-finishing.
   - `robots: noindex` — link ini dibagikan lewat WA per-klien, jangan
     sampai ke-crawl/ke-index Google (privasi data bisnis client).
   - `theme-color` navy (`#142850`) — di HP, warna address bar ikut
     jadi navy waktu buka link ini, kesannya lebih "aplikasi", bukan
     sekadar halaman web.

3. **`proxy.ts`** (diubah)
   - Kalau `?key=` di link WA salah/kadaluarsa, sebelumnya yang
     muncul teks polos putih-hitam tanpa styling sama sekali — ini
     titik kontak client yang penting (biasanya kejadian pas link
     kadaluarsa atau ke-forward salah), dan tampilannya benar-benar
     kelihatan "rusak". Sekarang halamannya dibikin senada dengan
     dashboard (navy/krem/mono) + pesan yang jelas: minta link baru
     lewat WA toko.

## Yang TIDAK diubah (sengaja)

- Tidak menyentuh `/` (dashboard admin, `OverviewPage.tsx`) atau
  `/transactions` — itu halaman kerja kamu sendiri, bukan yang dilihat
  client, jadi di luar fokus permintaan ini.
- Tidak menambah fitur baru (retry WA, laporan terjadwal, dll) — itu
  di luar scope "benerin dashboard yang sudah ada", dan beberapa di
  antaranya masih ditandai "belum ada" di `PROJECT_CONTEXT.md`/audit
  kamu sendiri.
- Favicon masih bawaan `create-next-app` — tidak saya ganti karena
  butuh aset gambar baru (di luar scope perubahan kode murni ini).

## Cara pasang

1. Extract zip ini.
2. Timpa 3 file yang sama di project kamu:
   - `proxy.ts`
   - `app/dashboard/page.tsx`
   - `app/dashboard/layout.tsx` (file baru, taruh di folder yang sama)
3. Restart `npm run dev`.
4. Test: buka `/dashboard?key=SALAH` (harus muncul halaman navy/krem
   "Link tidak valid"), lalu `/dashboard?key=<KEY_ASLI>` (harus muncul
   skeleton sebentar, lalu dashboard biasa, dan tab browser judulnya
   "Ringkasan Bisnis — Talatee").
