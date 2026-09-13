// Copy to: lib/talatee-core/password.ts
//
// Hashing password OWNER (12 Sept 2026) -- dipindah dari OWNER_PASSWORD
// (plaintext di .env.local) ke kolom password_hash di tabel businesses.
// Pakai scrypt bawaan modul `crypto` Node -- BUKAN bcrypt/argon2 package
// eksternal, konsisten dengan filosofi "minim dependency" yang sudah
// dipegang di auth.ts (HMAC session token juga cuma pakai `crypto` bawaan).

import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

/** Hash password baru. Format tersimpan: "salt_hex:hash_hex". */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

/** Verifikasi password terhadap hash tersimpan. Timing-safe. */
export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const candidate = scryptSync(plain, salt, KEY_LENGTH);
  const expected = Buffer.from(hashHex, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
