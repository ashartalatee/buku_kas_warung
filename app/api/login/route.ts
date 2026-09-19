import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, PLATFORM_ADMIN_SESSION_ID } from "../_lib/auth";
import { verifyPassword } from "@/lib/talatee-core/password";
import { getDb } from "../_lib/db";

// 16 Sept 2026: rate limiting -- 5x gagal berturut-turut per identifier
// (business_id atau Platform Admin) -> terkunci 15 menit. Mencegah
// orang coba tebak password tanpa batas ke 1 link login tertentu.

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function checkLock(db: ReturnType<typeof getDb>, identifier: string): Promise<string | null> {
  const row = (await db.get(`SELECT locked_until FROM login_attempts WHERE identifier = $1`, [
    identifier,
  ])) as { locked_until: string | null } | undefined;

  if (row?.locked_until && new Date(row.locked_until) > new Date()) {
    return `Terlalu banyak percobaan gagal. Coba lagi dalam ${LOCKOUT_MINUTES} menit.`;
  }
  return null;
}

async function recordFailure(db: ReturnType<typeof getDb>, identifier: string): Promise<void> {
  const row = (await db.get(
    `INSERT INTO login_attempts (identifier, failed_count, updated_at)
     VALUES ($1, 1, now())
     ON CONFLICT (identifier) DO UPDATE
       SET failed_count = login_attempts.failed_count + 1, updated_at = now()
     RETURNING failed_count`,
    [identifier]
  )) as { failed_count: number };

  if (row.failed_count >= MAX_FAILED_ATTEMPTS) {
    await db.run(
      `UPDATE login_attempts SET locked_until = now() + interval '${LOCKOUT_MINUTES} minutes' WHERE identifier = $1`,
      [identifier]
    );
  }
}

async function recordSuccess(db: ReturnType<typeof getDb>, identifier: string): Promise<void> {
  await db.run(
    `UPDATE login_attempts SET failed_count = 0, locked_until = NULL, updated_at = now() WHERE identifier = $1`,
    [identifier]
  );
}

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

  const db = getDb();
  const identifier = body.business_id || PLATFORM_ADMIN_SESSION_ID;

  const lockMessage = await checkLock(db, identifier);
  if (lockMessage) {
    return NextResponse.json({ error: lockMessage }, { status: 429 });
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

  const platformHash = process.env.PLATFORM_ADMIN_PASSWORD_HASH;
  if (platformHash && verifyPassword(body.password, platformHash)) {
    await recordSuccess(db, identifier);
    return issueSession(PLATFORM_ADMIN_SESSION_ID, "platform");
  }

  if (!body.business_id) {
    await recordFailure(db, identifier);
    return NextResponse.json(
      { error: "Link login tidak lengkap. Hubungi Talatee untuk link login yang benar." },
      { status: 400 }
    );
  }

  const row = (await db.get(
    `SELECT business_id, password_hash, is_active FROM businesses WHERE business_id = $1 AND password_hash IS NOT NULL`,
    [body.business_id]
  )) as { business_id: string; password_hash: string | null; is_active: boolean } | undefined;

  if (!row || !verifyPassword(body.password, row.password_hash)) {
    await recordFailure(db, identifier);
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  if (!row.is_active) {
    await recordFailure(db, identifier);
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  await recordSuccess(db, identifier);
  return issueSession(row.business_id, "owner");
}
