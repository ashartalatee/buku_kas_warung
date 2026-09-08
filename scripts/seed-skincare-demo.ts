import "./_load-env";

// Seed data latihan/demo -- skincare marketplace (8 Sept 2026).
// Menambah katalog produk lewat createProduct() yang SAMA PERSIS dipakai
// halaman Kelola Produk & Stok (bukan INSERT manual terpisah), supaya
// aturan bisnisnya (nama tidak boleh dobel, dst) tetap kepakai.
//
// Aman dijalankan berkali-kali -- produk yang namanya sudah ada dilewati
// (bukan error/berhenti), jadi bisa di-run ulang kalau sebagian sempat
// gagal di run sebelumnya.
//
// Pakai:
//   npx tsx scripts/seed-skincare-demo.ts

import { openDatabase } from "../lib/talatee-core/db";
import { createProduct, ProductError } from "../lib/talatee-core/products";

const PRODUCTS = [
  { name: "Serum Vitamin C 20ml", category: "Serum", price: 85000, initial_stock: 40, low_stock_threshold: 10 },
  { name: "Serum Niacinamide 10%", category: "Serum", price: 65000, initial_stock: 55, low_stock_threshold: 10 },
  { name: "Facial Oil Rosehip 30ml", category: "Serum", price: 72000, initial_stock: 22, low_stock_threshold: 6 },
  { name: "Toner Centella Asiatica 150ml", category: "Toner", price: 55000, initial_stock: 35, low_stock_threshold: 8 },
  { name: "Exfoliating Toner AHA/BHA", category: "Toner", price: 62000, initial_stock: 25, low_stock_threshold: 6 },
  { name: "Micellar Water 200ml", category: "Cleanser", price: 45000, initial_stock: 30, low_stock_threshold: 8 },
  { name: "Facial Wash Salicylic Acid", category: "Cleanser", price: 38000, initial_stock: 45, low_stock_threshold: 10 },
  { name: "Moisturizer Ceramide 30g", category: "Moisturizer", price: 78000, initial_stock: 28, low_stock_threshold: 6 },
  { name: "Sunscreen SPF50 PA+++", category: "Sunscreen", price: 68000, initial_stock: 60, low_stock_threshold: 15 },
  { name: "Sheet Mask Aloe Vera", category: "Masker", price: 12000, initial_stock: 120, low_stock_threshold: 20 },
  // Stok sengaja diset DEKAT/DI BAWAH ambang -- biar begitu produk ini
  // ikut "terjual" lewat transaksi contoh, kartu "stok menipis" beneran
  // kepicu (bukan cuma teori), buat latihan.
  { name: "Eye Cream Retinol 15ml", category: "Eye Care", price: 95000, initial_stock: 6, low_stock_threshold: 5 },
  { name: "Lip Balm Shea Butter", category: "Lip Care", price: 25000, initial_stock: 50, low_stock_threshold: 10 },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const business_id = process.env.TALATEE_PILOT_BUSINESS_ID;
  if (!connectionString || !business_id) {
    console.error("DATABASE_URL / TALATEE_PILOT_BUSINESS_ID belum diisi di .env.local.");
    process.exit(1);
  }

  const db = openDatabase(connectionString);
  const created_by = process.env.TALATEE_PILOT_OWNER_ID ?? "seed-script";

  let created = 0;
  let skipped = 0;

  for (const p of PRODUCTS) {
    try {
      await createProduct(db, business_id, { ...p, unit: "pcs" }, created_by);
      console.log(`✅ ${p.name}`);
      created++;
    } catch (err) {
      if (err instanceof ProductError) {
        console.log(`⏭️  ${p.name} -- dilewati (${err.message})`);
        skipped++;
      } else {
        throw err;
      }
    }
  }

  console.log(`\nSelesai: ${created} produk dibuat, ${skipped} dilewati.`);
  await db.end();
}

main().catch((err) => {
  console.error("Seed gagal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
