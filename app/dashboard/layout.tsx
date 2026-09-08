// Layout khusus /dashboard -- terpisah dari app/layout.tsx (root) supaya
// halaman ini bisa punya <title> sendiri dan sengaja di-noindex (link
// dibagikan lewat WA, bukan untuk ditemukan lewat Google) tanpa mengubah
// metadata halaman admin lain yang pakai root layout yang sama.

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Ringkasan Bisnis — Talatee",
  description: "Ringkasan transaksi harian & mingguan, dibuka lewat link WhatsApp.",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#142850",
  width: "device-width",
  initialScale: 1,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
