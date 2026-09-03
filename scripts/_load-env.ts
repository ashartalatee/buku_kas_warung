// Next.js otomatis membaca .env.local waktu `npm run dev` / `next build`.
// Tapi script yang dijalankan langsung lewat `npx tsx scripts/xxx.ts`
// TIDAK lewat Next.js sama sekali -- jadi .env.local tidak otomatis
// kebaca, dan process.env.DATABASE_URL dkk akan kosong.
//
// File ini isinya parser .env.local manual yang sangat sederhana (tanpa
// perlu install package `dotenv` tambahan) -- import ini di baris PALING
// ATAS setiap script yang butuh baca .env.local.
//
// Pakai:  import "./_load-env";   (di baris paling atas file)

import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  let content = fs.readFileSync(envPath, "utf-8");

  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  if (content.includes("\u0000")) {
    content = fs.readFileSync(envPath, "utf16le");
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  }

  let foundCount = 0;
  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
    foundCount++;
  }

  if (process.env.DEBUG_ENV_LOAD) {
    console.log(`[_load-env] Berhasil baca ${foundCount} baris dari ${envPath}`);
    console.log(`[_load-env] DATABASE_URL terbaca: ${process.env.DATABASE_URL ? "YA" : "TIDAK"}`);
  }
} else {
  console.warn(`[_load-env] File .env.local tidak ditemukan di ${envPath} -- lanjut pakai env yang ada saja.`);
}
