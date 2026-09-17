// Ganti dari middleware.ts -> proxy.ts, karena file konvensi `middleware`
// sudah deprecated di Next.js 16 versi project ini (lihat
// node_modules/next/dist/docs/.../proxy.md). Perilakunya sama, cuma nama
// file & fungsi yang beda.
//
// Dua jalur proteksi berbeda di sini, karena ada 2 jenis pemanggil:
//   1. Pemilik warung lewat BROWSER  -> wajib cookie sesi (login password)
//   2. Bot WA lewat n8n (server-to-server, tidak bisa login browser)
//      -> wajib header X-Api-Key (N8N_LOCAL_API_KEY)
//
// Endpoint yang dipanggil n8n (lihat n8n-workflows-updated/*.json):
//   /api/transactions/upload, /api/reports/daily, /api/reports/weekly
//
// PENTING (fix 9 Sept 2026): beberapa endpoint di N8N_ROUTES di bawah ini
// JUGA dipanggil langsung dari UI admin lewat browser (bukan cuma n8n) --
// contoh nyata: /api/transactions/upload dipanggil UploadCsvForm.tsx pas
// admin upload manual. Makanya N8N_ROUTES menerima X-Api-Key ATAU cookie
// sesi (salah satu cukup), BUKAN cuma X-Api-Key seperti sebelumnya --
// kalau dipaksa cuma X-Api-Key, upload lewat browser akan SELALU gagal
// walau sudah login, karena browser tidak pernah kirim header itu.
//
// 15 Sept 2026 (multi-tenant): proxy sekarang SATU-SATUNYA tempat yang
// menentukan business_id per request, lalu meneruskannya lewat header
// x-talatee-business-id ke route handler (dibaca getCurrentUser(), lihat
// app/api/_lib/session.ts). Sumbernya salah satu dari 3:
//   - Cookie sesi (login password) -> business_id ada di dalam token
//   - ?key=... di link WA -> business_id ada di dalam key itu sendiri
//     (lihat createShareKey/verifyShareKeyAndGetBusinessId di auth.ts)
//   - X-Api-Key dari n8n -> masih tied ke TALATEE_PILOT_BUSINESS_ID
//     untuk sementara (WA multi-tenant belum dibangun, lihat sesi 15
//     Sept 2026 -- WA disambungkan belakangan per business).
// Route handler TIDAK PERNAH baca env var/cookie/key secara langsung --
// selalu lewat header ini, supaya cuma ada 1 tempat yang perlu benar.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionToken,
  verifyLocalApiKey,
  verifyShareKeyAndGetBusinessId,
  SESSION_COOKIE_NAME,
  PLATFORM_ADMIN_SESSION_ID,
} from "./app/api/_lib/auth";

const BUSINESS_ID_HEADER = "x-talatee-business-id";

const N8N_ROUTES = [
  "/api/transactions/upload",
  "/api/reports/daily",
  "/api/reports/weekly",
  "/api/reports/monthly",
  "/api/backup",
];

// Halaman/endpoint dashboard yang dibagikan lewat link WA -- dibuka
// langsung tanpa login, tapi wajib ?key=... yang cocok (lihat
// verifyShareKeyAndGetBusinessId di auth.ts).
const SHARE_LINK_ROUTES = ["/dashboard", "/api/reports/overview"];

const PUBLIC_ROUTES = ["/login", "/api/login"];

// Halaman yang dilihat kalau link WA salah/kadaluarsa. Ini titik kontak
// client yang penting -- kalau tampilannya cuma teks polos, kesannya
// aplikasi rusak. Jadi disamakan gaya visualnya (navy/krem/mono) dengan
// app/dashboard/page.tsx, dibuat manual di sini (bukan render React)
// karena proxy jalan di Edge Runtime sebelum masuk ke halaman React mana pun.
function invalidShareLinkPage(): NextResponse {
  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Link tidak valid — Talatee</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#f3efe0;color:#2b2a25;padding:24px;
    font-family:'Courier New',Consolas,monospace;}
  .card{max-width:340px;width:100%;background:#fbfaf3;border:1px solid #e6e0c9;
    border-radius:12px;padding:28px 24px;text-align:center;}
  .badge{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;
    border-radius:999px;background:#142850;color:#fff;font-size:20px;font-weight:700;margin-bottom:14px;}
  h1{font-size:15px;margin:0 0 8px;color:#142850;}
  p{font-size:12.5px;line-height:1.6;color:#5b5748;margin:0;}
  .foot{margin-top:18px;font-size:9.5px;letter-spacing:.12em;color:#a39c85;text-transform:uppercase;}
</style>
</head>
<body>
  <div class="card">
    <div class="badge">!</div>
    <h1>Link dashboard tidak valid</h1>
    <p>Link ini sudah kadaluarsa atau salah ketik. Minta link dashboard terbaru langsung lewat WhatsApp toko Anda.</p>
    <div class="foot">Talatee Automation Lab</div>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/** Terusin request ke handler berikutnya, sambil menyisipkan business_id
 * ke header supaya getCurrentUser() bisa membacanya. */
function nextWithBusinessId(request: NextRequest, businessId: string): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(BUSINESS_ID_HEADER, businessId);
  return NextResponse.next({ request: { headers } });
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  if (SHARE_LINK_ROUTES.some((p) => pathname === p)) {
    const key = request.nextUrl.searchParams.get("key");
    const businessId = verifyShareKeyAndGetBusinessId(key);
    if (!businessId) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Link tidak valid atau kadaluarsa. Minta link terbaru lewat WhatsApp." },
          { status: 401 }
        );
      }
      return invalidShareLinkPage();
    }
    return nextWithBusinessId(request, businessId);
  }

  if (N8N_ROUTES.some((p) => pathname === p)) {
    // FIX (9 Sept 2026): rute ini SEBELUMNYA cuma menerima X-Api-Key,
    // padahal beberapa di antaranya (khususnya /api/transactions/upload)
    // dipanggil dari 2 arah -- n8n (server-to-server) DAN langsung dari
    // UI admin lewat browser (UploadCsvForm.tsx, pakai cookie sesi login,
    // bukan API key). Efeknya: upload lewat halaman Upload Data di admin
    // SELALU gagal dengan "X-Api-Key tidak valid" walau sudah login,
    // karena browser memang tidak pernah kirim header itu.
    // Sekarang terima SALAH SATU: X-Api-Key valid (jalur n8n) ATAU cookie
    // sesi valid (jalur admin browser) -- bukan cuma satu-satunya jalur.
    const apiKey = request.headers.get("x-api-key");
    if (verifyLocalApiKey(apiKey)) {
      // 15 Sept 2026: WA belum multi-tenant (lihat catatan atas file ini)
      // -- n8n masih fixed ke 1 business lewat env var ini, sampai WA
      // disambungkan per client di sesi berikutnya.
      const fallbackBusinessId = process.env.TALATEE_PILOT_BUSINESS_ID;
      if (!fallbackBusinessId) {
        return NextResponse.json(
          { error: "TALATEE_PILOT_BUSINESS_ID belum diset -- wajib untuk jalur n8n/WA." },
          { status: 500 }
        );
      }
      return nextWithBusinessId(request, fallbackBusinessId);
    }

    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const businessIdFromSession = verifySessionToken(sessionCookie);
    if (businessIdFromSession) {
      return nextWithBusinessId(request, businessIdFromSession);
    }

    return NextResponse.json(
      {
        error:
          "Butuh salah satu: header X-Api-Key yang valid (untuk n8n, cek N8N_LOCAL_API_KEY di .env.local) atau login admin yang masih aktif.",
      },
      { status: 401 }
    );
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const businessId = verifySessionToken(sessionCookie);

  if (!businessId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Belum login. Silakan login lagi." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 12 Sept 2026: /ops (Panel Admin Lengkap) HANYA untuk Platform Admin
  // (Ashar sendiri) -- BUKAN untuk business owner/client biasa, walau
  // sesi mereka valid. Sebelum ini, /ops cuma "tersembunyi" (tidak ada
  // link ke situ), bukan benar-benar terkunci -- client yang iseng coba
  // alamat itu bisa masuk. Sekarang benar-benar ditolak di level proxy.
  if (pathname.startsWith("/ops") && businessId !== PLATFORM_ADMIN_SESSION_ID) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return nextWithBusinessId(request, businessId);
}

export const config = {
  matcher: [
    // Semua path KECUALI file statis Next.js dan aset di /public
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|csv)$).*)",
  ],
};
