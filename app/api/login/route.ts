import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../_lib/auth";

function safeEqual(a: string, b: string): boolean {
  // Bandingkan lewat hash dulu supaya panjangnya selalu sama (timingSafeEqual
  // butuh buffer sepanjang sama) tanpa membocorkan panjang password asli.
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  const ownerPassword = process.env.OWNER_PASSWORD;
  if (!ownerPassword || ownerPassword.length < 6) {
    return NextResponse.json(
      {
        error:
          "OWNER_PASSWORD belum diset (atau terlalu pendek) di .env.local server ini. " +
          "Isi minimal 6 karakter lalu restart server sebelum login bisa dipakai.",
      },
      { status: 500 }
    );
  }

  const businessId = process.env.TALATEE_PILOT_BUSINESS_ID;
  if (!businessId) {
    return NextResponse.json(
      { error: "TALATEE_PILOT_BUSINESS_ID belum diset di .env.local server ini." },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body request tidak valid." }, { status: 400 });
  }

  if (!body.password || !safeEqual(body.password, ownerPassword)) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  const token = createSessionToken(businessId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
