import "./_load-env";

// Utilitas kecil: hash 1 password buat ditaruh manual di .env.local
// (dipakai buat PLATFORM_ADMIN_PASSWORD_HASH). TIDAK menyentuh database
// atau file apa pun -- cuma print hash-nya ke layar.
//
// Pakai:
//   npx tsx scripts/hash-password.ts "password_baru_kamu"

import { hashPassword } from "../lib/talatee-core/password";

const password = process.argv[2];
if (!password || password.length < 6) {
  console.error('Pakai: npx tsx scripts/hash-password.ts "password_baru_kamu" (minimal 6 karakter)');
  process.exit(1);
}

console.log(hashPassword(password));
