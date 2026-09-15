// Root ("/") redirect ke dashboard, dilakukan di SERVER (bukan client)
// supaya tidak ada roundtrip fetch() dari browser sebelum redirect
// terjadi -- browser langsung terima instruksi redirect dari server,
// lebih cepat daripada nunggu JS jalan dulu baru fetch baru redirect.
// Proteksi login tetap sama seperti sebelumnya (proxy.ts sudah
// memvalidasi cookie sesi sebelum request ini sampai ke sini).

import { redirect } from "next/navigation";

export default function Page() {
  const key = process.env.DASHBOARD_SHARE_KEY;

  if (key && key.length >= 8) {
    redirect(`/dashboard?key=${encodeURIComponent(key)}`);
  }

  // Fallback kalau DASHBOARD_SHARE_KEY belum diset -- jangan biarkan
  // user terjebak di halaman kosong.
  redirect("/upload");
}
