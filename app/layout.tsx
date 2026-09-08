import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

// Satu keluarga font untuk panel admin LAMA (tema terang "buku kas") --
// IBM Plex Mono, dipertahankan supaya halaman yang belum di-redesign
// (Transaksi/Produk/Upload) tidak berubah.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Inter -- khusus dashboard admin BARU (gaya gelap/sidebar). Dipisah dari
// Plex Mono supaya tidak mempengaruhi halaman lama; dipakai lewat class
// "font-dash" di halaman yang sudah di-redesign.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Buku Kas Warung — Panel Admin",
  description: "Panel kelola transaksi, produk, dan stok — Talatee Automation Lab.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${plexMono.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
