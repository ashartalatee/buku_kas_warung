"use client";

// Copy to: components/AdminShell.tsx
//
// App-shell untuk seluruh halaman admin (redesign 7 Sept 2026, mengikuti
// mockup sidebar navy + konten terang). Strukturnya DIKUNCI ke tinggi
// layar (h-dvh + overflow-hidden di pembungkus terluar), supaya sidebar
// & header "diam" saat konten discroll -- yang scroll cuma <main>, bukan
// seluruh halaman. Ini beda dari versi sebelumnya yang cuma "min-h-screen"
// (seluruh halaman ikut scroll bareng, sidebar/header ikut naik-turun).
//
// Jadi "use client" (sebelumnya server component) karena butuh state untuk
// buka/tutup drawer sidebar di layar sempit, dan state itu dipakai bareng
// oleh 2 komponen berbeda (tombol hamburger di AdminHeader, drawer-nya
// sendiri di Sidebar) -- paling sederhana di-lift ke sini, tanpa nambah
// context/library baru (konsisten dengan gaya project ini: plain useState).
//
// Dipakai membungkus SEMUA halaman admin (Overview/Transaksi/Produk/
// Upload), bukan cuma Overview -- supaya sidebar & app-shell ini konsisten
// di seluruh panel admin, bukan cuma di 1 halaman.

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { AdminHeader } from "./AdminHeader";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div style={{ background: "var(--color-dash-bg)" }} className="flex h-dvh overflow-hidden">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      {/* min-w-0 wajib di anak flex row -- tanpa ini, konten lebar (mis.
          tabel) bisa memaksa kolom ini melebar dan mendorong sidebar. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader onMenuClick={() => setNavOpen(true)} />

        {/* min-h-0 wajib di flex column -- tanpa ini, overflow-y-auto di
            bawah ini tidak akan benar-benar scroll (dia akan memaksa
            parent melar mengikuti tinggi konten, bukan mengunci tinggi
            layar lalu men-scroll isinya sendiri). */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
