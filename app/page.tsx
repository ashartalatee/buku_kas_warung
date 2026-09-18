// Root ("/") -- tujuannya beda tergantung siapa yang login:
//   - Platform Admin (Ashar) -> /ops/clients (kelola semua client)
//   - Business owner (client) -> /dashboard?key=... (omzet mereka)
// SEBELUM INI: selalu ke /dashboard, salah untuk Platform Admin --
// bikin bingung karena kelihatan seperti "dashboard client kosong".

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/api/_lib/session";
import { createShareKey } from "@/app/api/_lib/auth";
import { PLATFORM_ADMIN_SESSION_ID } from "@/app/api/_lib/auth";

export default async function Page() {
  const user = await getCurrentUser();

  if (user.business_id === PLATFORM_ADMIN_SESSION_ID) {
    redirect("/ops/clients");
  }

  const key = createShareKey(user.business_id);
  redirect(`/dashboard?key=${encodeURIComponent(key)}`);
}
