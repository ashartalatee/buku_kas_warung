"use client";

// Root ("/") sekarang jadi redirect otomatis ke dashboard -- supaya
// begitu login, client langsung lihat omzet/laporan (bukan form upload).
// Upload dipindah ke /upload, tetap gampang diakses lewat tombol
// "Upload Data" di dashboard. Redirect ini tetap lewat proxy.ts (butuh
// cookie sesi login), sama seperti sebelumnya.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/dashboard-link")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.url) {
          router.replace(data.url);
        } else {
          // Fallback kalau DASHBOARD_SHARE_KEY belum diset -- jangan
          // biarkan user terjebak di halaman kosong.
          router.replace("/upload");
        }
      })
      .catch(() => router.replace("/upload"));
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream">
      <p className="text-sm text-muted">Memuat dashboard...</p>
    </div>
  );
}
