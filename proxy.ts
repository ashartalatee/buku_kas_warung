// Ganti dari middleware.ts -> proxy.ts, karena file konvensi `middleware`
// sudah deprecated di Next.js 16 versi project ini.
//
// 15 Sept 2026 (multi-tenant): proxy SATU-SATUNYA tempat yang menentukan
// business_id per request, diteruskan lewat header x-talatee-business-id.
//
// 16 Sept 2026 (nonaktifkan client): proxy JUGA yang cek is_active di
// sini, SEBELUM request sampai ke halaman/route mana pun -- supaya
// client yang dinonaktifkan langsung diarahkan ke /login dengan pesan
// jelas, bukan macet di "Memuat..." di berpuluh komponen berbeda.
// Sebelumnya pengecekan ini ada di session.ts (dipanggil tiap route
// handler) -- dipindah ke sini supaya cuma 1 tempat, dan hasilnya
// redirect yang rapi, bukan error mentah yang bikin fetch() gagal parse.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionToken,
  verifyLocalApiKey,
  verifyShareKeyAndGetBusinessId,
  SESSION_COOKIE_NAME,
  PLATFORM_ADMIN_SESSION_ID,
} from "./app/api/_lib/auth";
import { getDb } from "./app/api/_lib/db";

const BUSINESS_ID_HEADER = "x-talatee-business-id";

const N8N_ROUTES = [
  "/api/transactions/upload",
  "/api/reports/daily",
  "/api/reports/weekly",
  "/api/reports/monthly",
  "/api/backup",
];

const SHARE_LINK_ROUTES = ["/dashboard", "/api/reports/overview"];

const PUBLIC_ROUTES = ["/login", "/api/login"];

async function isBusinessActive(businessId: string): Promise<boolean> {
  if (businessId === PLATFORM_ADMIN_SESSION_ID) return true;
  const db = getDb();
  const row = (await db.get(`SELECT is_active FROM businesses WHERE business_id = $1`, [businessId])) as
    | { is_active: boolean }
    | undefined;
  return !!row?.is_active;
}

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

function nextWithBusinessId(request: NextRequest, businessId: string): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(BUSINESS_ID_HEADER, businessId);
  return NextResponse.next({ request: { headers } });
}

/** Client dinonaktifkan -- hapus cookie sesi lamanya (biar tidak nyangkut)
 * dan arahkan ke /login dengan pesan jelas, bukan biarkan macet. */
function redirectInactive(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", "inactive");
  const res = NextResponse.redirect(loginUrl);
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}

function jsonInactive(): NextResponse {
  return NextResponse.json(
    { error: "Akun ini sudah tidak aktif. Hubungi Talatee untuk info lebih lanjut." },
    { status: 403 }
  );
}

export default async function proxy(request: NextRequest) {
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
    if (!(await isBusinessActive(businessId))) {
      if (pathname.startsWith("/api/")) return jsonInactive();
      return invalidShareLinkPage();
    }
    return nextWithBusinessId(request, businessId);
  }

  if (N8N_ROUTES.some((p) => pathname === p)) {
    const apiKey = request.headers.get("x-api-key");
    if (verifyLocalApiKey(apiKey)) {
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
      if (!(await isBusinessActive(businessIdFromSession))) return jsonInactive();
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

  if (!(await isBusinessActive(businessId))) {
    if (pathname.startsWith("/api/")) return jsonInactive();
    return redirectInactive(request);
  }

  if (pathname.startsWith("/ops") && businessId !== PLATFORM_ADMIN_SESSION_ID) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return nextWithBusinessId(request, businessId);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|csv)$).*)",
  ],
};
