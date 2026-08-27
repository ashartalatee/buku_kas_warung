// Copy this file to: app/api/_lib/db.ts (or lib/db.ts, adjust imports below)
//
// Next.js hot-reloads modules in dev, which would otherwise open a new
// SQLite connection on every request. Caching it on `globalThis` avoids
// that. Swap this whole file for a Postgres pool (e.g. `pg` or a Prisma
// client) when moving off SQLite — nothing in the route handlers below
// needs to change beyond this file, since they only import `getDb()`.

import { openDatabase } from "@/lib/talatee-core/db"; // adjust path after copying into your project
import path from "path";

declare global {
  // eslint-disable-next-line no-var
  var __talateeDb: ReturnType<typeof openDatabase> | undefined;
}

export function getDb() {
  if (!global.__talateeDb) {
    const dbPath = process.env.TALATEE_DB_PATH ?? path.join(process.cwd(), "talatee.sqlite");
    global.__talateeDb = openDatabase(dbPath);
  }
  return global.__talateeDb;
}
