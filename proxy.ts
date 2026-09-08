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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionToken,
  verifyLocalApiKey,
  verifyShareKey,
  SESSION_COOKIE_NAME,
} from "./app/api/_lib/auth";

const N8N_ROUTES = [
  "/api/transactions/upload",
  "/api/reports/daily",
  "/api/reports/weekly",
  "/api/reports/monthly",
  "/api/backup",
];

// Halaman/endpoint dashboard yang dibagikan lewat link WA -- dibuka
// langsung tanpa login, tapi wajib ?key=... yang cocok dengan
// DASHBOARD_SHARE_KEY (lihat auth.ts: verifyShareKey).
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

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  if (SHARE_LINK_ROUTES.some((p) => pathname === p)) {
    const key = request.nextUrl.searchParams.get("key");
    if (!verifyShareKey(key)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Link tidak valid atau kadaluarsa. Minta link terbaru lewat WhatsApp." },
          { status: 401 }
        );
      }
      return invalidShareLinkPage();
    }
    return NextResponse.next();
  }

  if (N8N_ROUTES.some((p) => pathname === p)) {
    const apiKey = request.headers.get("x-api-key");
    if (!verifyLocalApiKey(apiKey)) {
      return NextResponse.json(
        { error: "X-Api-Key tidak valid atau belum diset. Cek N8N_LOCAL_API_KEY di .env.local." },
        { status: 401 }
      );
    }
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Semua path KECUALI file statis Next.js dan aset di /public
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|csv)$).*)",
  ],
};
