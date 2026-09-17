import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, PLATFORM_ADMIN_SESSION_ID } from "../_lib/auth";
import { verifyPassword } from "@/lib/talatee-core/password";
import { getDb } from "../_lib/db";

// 12 Sept 2026: sekarang ada 2 jenis login, dicek berurutan:
//   1. Platform Admin (Ashar) -- PLATFORM_ADMIN_PASSWORD_HASH di
//      .env.local, TIDAK terikat business_id mana pun, akses ke /ops.
//   2. Business owner (client) -- password_hash di tabel businesses,
//      terikat 1 business_id, akses ke "/" dan "/dashboard", DITOLAK
//      dari /ops oleh proxy.ts walau sesinya valid.
//
// 15 Sept 2026 (multi-tenant): business_id SEKARANG dikirim dari client
// (form login baca ?biz=... dari URL, lihat app/login/page.tsx), BUKAN
// lagi dari TALATEE_PILOT_BUSINESS_ID env var -- itu artinya 1 deployment
// bisa layani banyak business sekaligus, tiap business dapat link login
// sendiri (/login?biz=<business_id>). Pesan error tetap digeneralisasi
// ("Password salah") baik untuk business_id yang tidak ada maupun
// password yang salah -- supaya link login yang salah ketik tidak
// membocorkan "business ini ada tapi passwordnya salah" ke orang asing.

export async function POST(req: NextRequest) {
  let body: { password?: string; business_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body request tidak valid." }, { status: 400 });
  }

  if (!body.password) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  function issueSession(businessId: string, role: "platform" | "owner") {
    const token = createSessionToken(businessId);
    const res = NextResponse.json({ ok: true, role });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return res;
  }

  // 1. Coba Platform Admin dulu -- tidak butuh business_id sama sekali.
  const platformHash = process.env.PLATFORM_ADMIN_PASSWORD_HASH;
  if (platformHash && verifyPassword(body.password, platformHash)) {
    return issueSession(PLATFORM_ADMIN_SESSION_ID, "platform");
  }

  // 2. Kalau bukan, coba business owner (client) biasa -- WAJIB tahu
  // business_id mana yang mau di-login, dikirim dari link unik client itu.
  if (!body.business_id) {
    return NextResponse.json(
      { error: "Link login tidak lengkap. Hubungi Talatee untuk link login yang benar." },
      { status: 400 }
    );
  }

  const db = getDb();
  const row = (await db.get(
    `SELECT business_id, password_hash FROM businesses WHERE business_id = $1 AND password_hash IS NOT NULL`,
    [body.business_id]
  )) as { business_id: string; password_hash: string | null } | undefined;

  if (!row || !verifyPassword(body.password, row.password_hash)) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  return issueSession(row.business_id, "owner");
}
