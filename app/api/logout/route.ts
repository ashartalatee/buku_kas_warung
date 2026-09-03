import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "../_lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
