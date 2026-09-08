import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Dev server ini kadang diakses lewat IP jaringan lokal (bukan cuma
  // localhost) -- misalnya waktu tes dari HP di WiFi yang sama, lewat
  // Tailscale (IP 100.x.x.x), atau kalau n8n/WAHA jalan di device/VM lain
  // di jaringan yang sama. Tanpa ini, Next.js 16 memblokir CSS/JS/HMR dari
  // origin selain localhost demi keamanan, dan halaman akan tampil polos
  // tanpa styling (atau request API ditolak).
  //
  // "172.21.64.1" = IP WiFi lokal (dari setup sebelumnya).
  // GANTI "100.x.x.x" di bawah dengan IP Tailscale LAPTOP kamu (bukan IP
  // HP) -- cara cek: buka Tailscale di system tray -> klik nama device
  // laptop ini -> IP-nya muncul, atau jalankan `tailscale ip -4` di
  // terminal/PowerShell.
  //
  // Kalau nanti muncul error "Blocked request. This host is not allowed",
  // pesan errornya akan sebutkan persis origin yang harus ditambahkan ke
  // sini -- tinggal salin ke dalam array ini.
  allowedDevOrigins: [
    "172.21.64.1",
    "100.126.173.20", // IP Tailscale laptop (desktop-gj1e4tf)
    "*.ts.net", // MagicDNS Tailscale (kalau nanti pakai nama device, bukan IP)
  ],
};

export default nextConfig;