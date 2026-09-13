// Autentikasi sederhana untuk Phase 1 (single-OWNER per instalasi, lihat
// session.ts). BUKAN sistem multi-user — kalau nanti butuh multi-user
// (mode SaaS mandiri), ganti dengan NextAuth/Clerk; file ini & middleware.ts
// yang perlu diganti, route handler lain tidak perlu tahu.
//
// Desainnya sengaja minim dependency (tanpa jsonwebtoken dll) — cukup HMAC
// pakai modul `crypto` bawaan Node, supaya tidak nambah beban install untuk
// pilot yang cuma dipakai 1 pemilik warung per instalasi.

import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE_NAME = "talatee_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET belum diisi di .env.local (atau terlalu pendek, minimal 16 karakter). " +
        "Ini dipakai untuk menandatangani cookie login — WAJIB diisi sebelum aplikasi dipakai."
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Bikin token sesi baru untuk business_id tertentu, berlaku 30 hari. */
export function createSessionToken(business_id: string): string {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${business_id}.${expires}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

/** Cek token dari cookie. Return business_id kalau valid, null kalau tidak. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [business_id, expiresStr, sig] = parts;

  const expected = sign(`${business_id}.${expiresStr}`);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null; // tanda tangan tidak cocok -> token dipalsukan/rusak
  }

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) {
    return null; // kedaluwarsa
  }

  return business_id;
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };

/**
 * Cek header X-Api-Key untuk endpoint yang dipanggil MESIN (n8n), bukan
 * browser: /api/transactions/upload, /api/reports/daily, /api/reports/weekly.
 * Pakai key terpisah dari TALATEE_API_KEY (itu punya Talatee, ini punya
 * n8n) supaya masing-masing bisa dirotasi sendiri-sendiri.
 */
/**
 * Cek ?key=... di link dashboard yang dikirim lewat WA (/dashboard,
 * /api/reports/overview). Ini BUKAN pengganti login sungguhan -- cuma
 * "kunci pintu" ringan supaya link tidak kebuka sembarangan kalau
 * ke-forward/ke-screenshot orang lain, sambil tetap bisa dibuka
 * langsung dari WA tanpa perlu ketik password.
 */
export function verifyShareKey(keyValue: string | null): boolean {
  const expected = process.env.DASHBOARD_SHARE_KEY;
  if (!expected || expected.length < 8) return false;
  if (!keyValue) return false;
  const a = Buffer.from(keyValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyLocalApiKey(headerValue: string | null): boolean {
  const expected = process.env.N8N_LOCAL_API_KEY;
  if (!expected || expected.length < 8) {
    // Sengaja fail-closed: kalau env var belum diisi, JANGAN anggap semua
    // request valid — daripada diam-diam tanpa proteksi.
    return false;
  }
  if (!headerValue) return false;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Session id khusus buat Platform Admin (Ashar sendiri) -- BUKAN
 * business_id asli mana pun. proxy.ts memakai ini untuk membatasi
 * /ops hanya bisa diakses session ini, bukan session business owner
 * (client) biasa walau sudah login. */
export const PLATFORM_ADMIN_SESSION_ID = "__platform_admin__";
