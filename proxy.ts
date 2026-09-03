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
  "/api/backup",
];

// Halaman/endpoint dashboard yang dibagikan lewat link WA -- dibuka
// langsung tanpa login, tapi wajib ?key=... yang cocok dengan
// DASHBOARD_SHARE_KEY (lihat auth.ts: verifyShareKey).
const SHARE_LINK_ROUTES = ["/dashboard", "/api/reports/overview"];

const PUBLIC_ROUTES = ["/login", "/api/login"];

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
      return new NextResponse(
        "Link tidak valid. Minta link dashboard terbaru lewat WhatsApp toko Anda.",
        { status: 401 }
      );
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
