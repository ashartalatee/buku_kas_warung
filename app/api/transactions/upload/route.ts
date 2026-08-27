// Copy to: app/api/transactions/upload/route.ts (TIMPA file yang lama)
//
// PERUBAHAN dari versi sebelumnya (cuma 2 hal, "minim intervensi"):
// 1. File sekarang dibaca SEKALI jadi Buffer di awal (bukan .text() dan
//    .arrayBuffer() terpisah seperti sebelumnya) — sedikit lebih efisien,
//    dan Buffer yang sama dipakai ulang untuk sync ke Talatee.
// 2. Setelah ingest lokal sukses, ada 1 panggilan syncToTalatee() —
//    fire-and-forget, TIDAK di-await terhadap response, TIDAK BISA
//    menggagalkan upload kalau Talatee down. Detail penjelasan ada di
//    lib/talatee-bridge/sync.ts.
//
// Semua node/logic ingestCsv/ingestExcel/lifecycle/duplicate-detection
// yang sudah ada TIDAK DIUBAH SAMA SEKALI.

import { NextRequest, NextResponse } from "next/server";
import { ingestCsv, ingestExcel } from "@/lib/talatee-core/ingest"; // adjust path after copying into your project
import { syncToTalatee } from "@/lib/talatee-bridge/sync";
import { getDb } from "../../_lib/db";
import { getCurrentUser } from "../../_lib/session";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB, per SPEC.md §3
const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Field 'file' wajib berupa file CSV atau Excel." }, { status: 400 });
  }

  const extension = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json(
      { error: `Format file tidak didukung (${extension}). Gunakan .csv, .xlsx, atau .xls.` },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File terlalu besar (maks ${MAX_UPLOAD_BYTES / 1024 / 1024}MB).` },
      { status: 413 }
    );
  }

  const user = getCurrentUser();
  const db = getDb();

  // Dibaca SEKALI di sini, dipakai ulang untuk ingest lokal DAN sync ke
  // Talatee — Blob/File boleh dibaca berkali-kali (bukan stream sekali
  // pakai), tapi baca sekali lebih hemat & lebih sederhana.
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const summary =
      extension === ".csv"
        ? ingestCsv(db, user.business_id, file.name, fileBuffer.toString("utf-8"), user.user_identifier)
        : ingestExcel(db, user.business_id, file.name, fileBuffer, user.user_identifier);

    // Sync ke Talatee (command center). Sengaja TIDAK di-await terhadap
    // response — kalau Talatee lambat/down, pemilik warung tetap dapat
    // response cepat seperti biasa. Kegagalan sync cukup masuk log server
    // (lihat lib/talatee-bridge/sync.ts), tidak pernah jadi error di sini.
    syncToTalatee({
      db,
      businessId: user.business_id,
      filename: file.name,
      fileBytes: fileBuffer,
    }).catch(() => {
      // syncToTalatee sudah menangkap semua error di dalam dirinya sendiri;
      // .catch() kosong ini murni jaring pengaman tambahan.
    });

    // Never return a silent success — always report what actually
    // happened, per the "never silently fail" principle.
    return NextResponse.json({
      status: "COMPLETED",
      ...summary,
      message:
        summary.needs_review_count > 0
          ? `${summary.active_count} transaksi berhasil diproses, ${summary.needs_review_count} butuh review.`
          : `${summary.active_count} transaksi berhasil diproses.`,
    });
  } catch (err: any) {
    // Distinguish "file rejected outright" (exact duplicate, bad headers)
    // from unexpected errors — both are reported explicitly either way.
    // Catatan: kalau ingest lokal gagal di sini, TIDAK ada sync ke Talatee
    // sama sekali — hanya upload yang benar-benar diterima buku-kas-warung
    // yang diteruskan sebagai raw copy ke Talatee.
    return NextResponse.json({ error: err.message ?? "Gagal memproses file." }, { status: 422 });
  }
}
