// AKAR PENYEBAB bug "tanggal transaksi ada di masa depan" (PROJECT_CONTEXT.md
// §7): beberapa tempat di codebase menghitung "hari ini" dengan
//   new Date().toISOString().slice(0, 10)
// -- ini SELALU tanggal kalender UTC, bukan tanggal kalender WIB.
//
// WIB = UTC+7. Antara pukul 00:00-06:59 WIB, waktu UTC masih menunjukkan
// HARI SEBELUMNYA. Jadi kalau ada transaksi yang tanggalnya "hari ini"
// (menurut kalender WIB, benar), tapi validasi jalan di jam-jam itu,
// "today" versi kode akan tercatat sebagai KEMARIN (UTC) -- membuat
// tanggal transaksi yang sebenarnya benar terlihat "lebih besar", alias
// dicap "di masa depan". Ini juga bisa bikin kartu "Hari ini" di dashboard
// atau laporan WA salah menunjuk hari yang salah kalau diminta di jam yang
// sama.
//
// Perbaikan: hitung "hari ini" via Intl.DateTimeFormat dengan timeZone
// eksplisit (default Asia/Jakarta/WIB), bukan lewat toISOString().
//
// BUSINESS_TIMEZONE sengaja dibuat bisa diatur lewat .env.local (bukan
// di-hardcode di banyak tempat) -- supaya kalau ada klien di luar WIB
// (WITA/WIT), cukup ganti 1 baris .env.local, tidak perlu grep-replace
// kode.

const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || "Asia/Jakarta";

/**
 * Tanggal kalender "hari ini" menurut zona waktu bisnis, format YYYY-MM-DD.
 * Locale 'en-CA' dipakai murni karena kebetulan format outputnya ISO
 * (YYYY-MM-DD) -- tidak ada hubungannya dengan Kanada, cuma trik umum.
 */
export function getTodayLocalDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export { BUSINESS_TIMEZONE };
