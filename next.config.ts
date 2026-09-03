import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Dev server ini kadang diakses lewat IP jaringan lokal (bukan cuma
  // localhost) -- misalnya waktu tes dari HP di WiFi yang sama, atau kalau
  // n8n/WAHA jalan di device/VM lain di jaringan yang sama. Tanpa ini,
  // Next.js 16 memblokir CSS/JS/HMR dari origin selain localhost demi
  // keamanan, dan halaman akan tampil polos tanpa styling.
  //
  // Kalau IP jaringan Anda beda, tambahkan/ganti di sini.
  allowedDevOrigins: ["172.21.64.1"],
};

export default nextConfig;