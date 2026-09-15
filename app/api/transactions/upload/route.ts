// Copy to: app/api/transactions/upload/route.ts (TIMPA file yang lama)
//
// 15 Sept 2026: baca channel_mode dari form (dikirim UploadCsvForm.tsx),
// validasi terhadap daftar yang sama dengan ingest.ts, teruskan ke
// ingestCsv/ingestExcel. Sebelumnya field ini dibaca form tapi tidak
// pernah ditangkap di sini -- channel selalu jatuh ke default "Lainnya".

import { NextRequest, NextResponse } from "next/server";
import { ingestCsv, ingestExcel, CHANNEL_OPTIONS, MIXED_CHANNEL_VALUE } from "@/lib/talatee-core/ingest";
import { syncToTalatee } from "@/lib/talatee-bridge/sync";
import { getDb } from "../../_lib/db";
import { getCurrentUser } from "../../_lib/session";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB, per SPEC.md §3
const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const VALID_CHANNEL_MODES = [...CHANNEL_OPTIONS, MIXED_CHANNEL_VALUE];

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const channelMode = form.get("channel_mode");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Field 'file' wajib berupa file CSV atau Excel." }, { status: 400 });
  }

  if (typeof channelMode !== "string" || !VALID_CHANNEL_MODES.includes(channelMode)) {
    return NextResponse.json(
      { error: 'Pilih "Channel data ini dari mana" dulu sebelum upload.' },
      { status: 400 }
    );
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

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const summary =
      extension === ".csv"
        ? await ingestCsv(db, user.business_id, file.name, fileBuffer.toString("utf-8"), user.user_identifier, channelMode)
        : await ingestExcel(db, user.business_id, file.name, fileBuffer, user.user_identifier, channelMode);

    syncToTalatee({
      db,
      businessId: user.business_id,
      filename: file.name,
      fileBytes: fileBuffer,
    }).catch(() => {
      // syncToTalatee sudah menangkap semua error di dalam dirinya sendiri;
      // .catch() kosong ini murni jaring pengaman tambahan.
    });

    return NextResponse.json({
      status: "COMPLETED",
      ...summary,
      message:
        summary.needs_review_count > 0
          ? `${summary.active_count} transaksi berhasil diproses, ${summary.needs_review_count} butuh review.`
          : `${summary.active_count} transaksi berhasil diproses.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memproses file." }, { status: 422 });
  }
}
