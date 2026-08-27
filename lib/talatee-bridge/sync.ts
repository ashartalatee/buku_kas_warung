// lib/talatee-bridge/sync.ts
//
// Jembatan SATU ARAH: setiap kali buku-kas-warung berhasil ingest data,
// kirim salinan raw file ke Talatee (command center kamu) lewat endpoint
// POST /ingest/upload yang sudah ada di platform Talatee. Hasilnya: warung
// ini otomatis muncul sebagai satu Business di dashboard Talatee, dengan
// kategori sesuai business_type ('warung' | 'laundry' | 'bengkel').
//
// PRINSIP PALING PENTING: bridge ini TIDAK BOLEH PERNAH menggagalkan atau
// memperlambat alur utama buku-kas-warung secara terasa. Kalau Talatee
// sedang down/tidak terjangkau, upload di buku-kas-warung tetap harus
// sukses seperti biasa untuk pemilik warung — kegagalan sync cukup dicatat
// di log server, TIDAK dilempar sebagai error ke response API.
//
// Konsisten dengan prinsip Talatee sendiri: yang dikirim adalah RAW FILE
// apa adanya (bukan data yang sudah dibersihkan/di-lifecycle-kan) — Talatee
// menyimpan raw copy sebagai source of truth-nya sendiri, terpisah dari
// data yang sudah diproses lifecycle-nya di buku-kas-warung.

import type Database from "better-sqlite3";

const TALATEE_API_URL = process.env.TALATEE_API_URL ?? "http://localhost:8000";
const TALATEE_API_KEY = process.env.TALATEE_API_KEY ?? "";
const TALATEE_SYNC_ENABLED = process.env.TALATEE_SYNC_ENABLED !== "false";

// business_type di buku-kas-warung ('warung'|'laundry'|'bengkel') dipetakan
// LANGSUNG 1:1 ke business_category di Talatee — kedua sisi sengaja dibuat
// pakai istilah yang sama persis, tidak perlu mapping/translasi apa pun.
type BusinessType = "warung" | "laundry" | "bengkel";

interface SyncParams {
  // Tipe Database ASLI dari better-sqlite3 (sama seperti yang dikembalikan
  // getDb() di project ini) — sebelumnya sempat dipakai interface buatan
  // sendiri yang lebih longgar, tapi itu tidak cocok secara struktural
  // dengan tipe Statement.get() milik better-sqlite3 (TS2322). Pakai tipe
  // asli supaya dijamin selalu cocok, apa pun versi better-sqlite3-nya.
  db: Database.Database;
  businessId: string;
  filename: string;
  fileBytes: Buffer;
}

interface TalateeBatchResponse {
  id: string;
  status: string;
  records_saved: number;
  error_message: string | null;
}

/**
 * Kirim raw file ke Talatee. Selalu resolve tanpa throw — pemanggil boleh
 * fire-and-forget (`.catch(() => {})`) atau await untuk logging, tapi tidak
 * perlu try/catch tambahan karena fungsi ini sudah menangkap semua error
 * di dalam dirinya sendiri.
 */
export async function syncToTalatee({
  db,
  businessId,
  filename,
  fileBytes,
}: SyncParams): Promise<void> {
  if (!TALATEE_SYNC_ENABLED) return;

  if (!TALATEE_API_KEY) {
    console.error(
      "[talatee-sync] TALATEE_API_KEY belum diisi di .env.local — sync dilewati. " +
        "Generate key lewat scripts/create_api_key.py di project Talatee."
    );
    return;
  }

  try {
    const business = db
      .prepare(
        `SELECT business_name, business_type FROM businesses WHERE business_id = ?`
      )
      .get(businessId) as
      | { business_name: string; business_type: BusinessType }
      | undefined;

    if (!business) {
      console.error(
        `[talatee-sync] business_id ${businessId} tidak ditemukan di tabel businesses lokal, skip sync.`
      );
      return;
    }

    const form = new FormData();
    form.append("business_name", business.business_name);
    form.append("business_category", business.business_type);
    form.append("source_name", "Buku Kas Warung");
    form.append("dataset_name", "Transactions");
    // new Uint8Array(fileBytes) sengaja dipakai (bukan fileBytes langsung) —
    // tipe Buffer Node.js dianggap TypeScript strict mode berpotensi
    // membungkus SharedArrayBuffer, yang tidak cocok dengan tipe BlobPart.
    // Konversi ini membuat salinan byte yang identik dengan ArrayBuffer biasa.
    form.append("file", new Blob([new Uint8Array(fileBytes)]), filename);

    const res = await fetch(`${TALATEE_API_URL}/ingest/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TALATEE_API_KEY}`,
      },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[talatee-sync] Talatee menolak sync (HTTP ${res.status}): ${body}`);
      return;
    }

    const batch = (await res.json()) as TalateeBatchResponse;
    if (batch.status !== "success") {
      console.error(
        `[talatee-sync] batch ${batch.id} tercatat di Talatee tapi statusnya "${batch.status}": ${batch.error_message}`
      );
      return;
    }

    console.log(
      `[talatee-sync] OK -> business "${business.business_name}", batch ${batch.id}, ${batch.records_saved} records`
    );
  } catch (err) {
    // Sengaja ditangkap di sini, BUKAN di-throw ulang. Kegagalan jaringan,
    // Talatee down, atau apa pun lainnya TIDAK BOLEH menggagalkan response
    // upload utama yang dilihat pemilik warung.
    console.error("[talatee-sync] error tak terduga saat sync ke Talatee:", err);
  }
}