import { randomUUID } from "crypto";
import { Db } from "./db";
import { StockAdjustmentReason } from "./types";

export class ProductError extends Error {}

export interface Product {
  product_id: string;
  business_id: string;
  name: string;
  category: string | null;
  unit: string;
  price: number | null;
  stock_qty: number;
  low_stock_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Daftar produk aktif (default) atau semua termasuk yang diarsipkan. */
export async function listProducts(
  db: Db,
  business_id: string,
  opts: { includeInactive?: boolean } = {}
): Promise<Product[]> {
  const filter = opts.includeInactive ? "" : "AND is_active = true";
  return db.all<Product>(
    `SELECT * FROM products WHERE business_id = $1 ${filter} ORDER BY name ASC`,
    [business_id]
  );
}

export async function getProduct(db: Db, product_id: string, business_id: string): Promise<Product> {
  const product = await db.get<Product>(
    `SELECT * FROM products WHERE product_id = $1 AND business_id = $2`,
    [product_id, business_id]
  );
  if (!product) throw new ProductError("Produk tidak ditemukan.");
  return product;
}

/** Produk baru. stock_qty awal opsional (default 0) -- kalau diisi, dicatat
 * juga sebagai 1 baris stock_adjustments (reason "Stok masuk") supaya
 * tidak ada angka stok yang muncul tanpa jejak, bahkan yang pertama kali. */
export async function createProduct(
  db: Db,
  business_id: string,
  input: {
    name: string;
    category?: string | null;
    unit?: string;
    price?: number | null;
    low_stock_threshold?: number | null;
    initial_stock?: number;
  },
  created_by: string
): Promise<Product> {
  const name = (input.name ?? "").trim();
  if (!name) throw new ProductError("Nama produk wajib diisi.");
  const initialStock = input.initial_stock ?? 0;
  if (initialStock < 0) throw new ProductError("Stok awal tidak boleh negatif.");

  const existing = await db.get(
    `SELECT product_id FROM products WHERE business_id = $1 AND lower(name) = lower($2) AND is_active = true`,
    [business_id, name]
  );
  if (existing) {
    throw new ProductError(`Produk dengan nama "${name}" sudah ada. Gunakan nama lain atau edit produk yang ada.`);
  }

  const product_id = randomUUID();
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO products
         (product_id, business_id, name, category, unit, price, stock_qty, low_stock_threshold, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        product_id,
        business_id,
        name,
        input.category?.trim() || null,
        input.unit?.trim() || "pcs",
        input.price ?? null,
        initialStock,
        input.low_stock_threshold ?? null,
        created_by,
      ]
    );

    if (initialStock > 0) {
      await client.query(
        `INSERT INTO stock_adjustments
           (adjustment_id, product_id, business_id, delta, stock_after, reason, reason_detail, performed_by)
         VALUES ($1, $2, $3, $4, $4, 'Stok masuk', 'Stok awal saat produk dibuat', $5)`,
        [randomUUID(), product_id, business_id, initialStock, created_by]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getProduct(db, product_id, business_id);
}

/** Edit metadata produk (nama/kategori/satuan/harga/ambang stok menipis).
 * SENGAJA tidak menerima stock_qty di sini -- perubahan stok cuma lewat
 * adjustStock(), supaya semua perubahan stok selalu punya jejak alasan. */
export async function updateProduct(
  db: Db,
  product_id: string,
  business_id: string,
  edits: {
    name?: string;
    category?: string | null;
    unit?: string;
    price?: number | null;
    low_stock_threshold?: number | null;
  }
): Promise<Product> {
  await getProduct(db, product_id, business_id); // 404 kalau tidak ada / beda business

  if (edits.name !== undefined) {
    const name = edits.name.trim();
    if (!name) throw new ProductError("Nama produk tidak boleh kosong.");
    const clash = await db.get(
      `SELECT product_id FROM products
         WHERE business_id = $1 AND lower(name) = lower($2) AND is_active = true AND product_id != $3`,
      [business_id, name, product_id]
    );
    if (clash) throw new ProductError(`Produk dengan nama "${name}" sudah ada.`);
  }

  await db.run(
    `UPDATE products
        SET name = COALESCE(NULLIF($1, ''), name),
            category = CASE WHEN $2::boolean THEN $3 ELSE category END,
            unit = COALESCE(NULLIF($4, ''), unit),
            price = CASE WHEN $5::boolean THEN $6 ELSE price END,
            low_stock_threshold = CASE WHEN $7::boolean THEN $8 ELSE low_stock_threshold END,
            updated_at = now()
      WHERE product_id = $9 AND business_id = $10`,
    [
      edits.name?.trim() ?? "",
      edits.category !== undefined,
      edits.category?.trim() || null,
      edits.unit?.trim() ?? "",
      edits.price !== undefined,
      edits.price ?? null,
      edits.low_stock_threshold !== undefined,
      edits.low_stock_threshold ?? null,
      product_id,
      business_id,
    ]
  );

  return getProduct(db, product_id, business_id);
}

/** Arsip produk (soft delete) -- tidak pernah hard-delete, konsisten dengan
 * prinsip void transaksi. Nama jadi bisa dipakai ulang produk baru. */
export async function archiveProduct(db: Db, product_id: string, business_id: string): Promise<void> {
  const result = await db.run(
    `UPDATE products SET is_active = false, updated_at = now() WHERE product_id = $1 AND business_id = $2`,
    [product_id, business_id]
  );
  if (result.rowCount === 0) throw new ProductError("Produk tidak ditemukan.");
}

export async function reactivateProduct(db: Db, product_id: string, business_id: string): Promise<Product> {
  const product = await getProduct(db, product_id, business_id);
  const clash = await db.get(
    `SELECT product_id FROM products
       WHERE business_id = $1 AND lower(name) = lower($2) AND is_active = true AND product_id != $3`,
    [business_id, product.name, product_id]
  );
  if (clash) {
    throw new ProductError(
      `Tidak bisa diaktifkan lagi -- sudah ada produk aktif lain dengan nama "${product.name}". Ganti nama dulu.`
    );
  }
  await db.run(`UPDATE products SET is_active = true, updated_at = now() WHERE product_id = $1`, [product_id]);
  return getProduct(db, product_id, business_id);
}

/** Hapus produk PERMANEN (7 Sept 2026, fitur Sampah -- lihat catatan
 * serupa di lifecycle.ts untuk transaksi/upload). Beda dari
 * archiveProduct(): ini betulan menghapus baris dari database, tidak
 * bisa dibatalkan. SENGAJA cuma boleh dipanggil untuk produk yang SUDAH
 * diarsipkan (is_active = false) -- dijaga di sini, bukan cuma di rute
 * API, jadi 2 langkah sadar (arsipkan dulu, baru hapus permanen) selalu
 * berlaku terlepas dari lewat mana fungsi ini dipanggil.
 * stock_adjustments milik produk ini ikut dihapus (riwayat stok produk
 * yang sudah tidak ada lagi tidak berguna disimpan) -- beda dengan
 * transaction_events yang untuk TRANSAKSI tetap dipertahankan selama
 * transaksinya belum masuk Sampah juga. */
export async function hardDeleteProduct(db: Db, product_id: string, business_id: string): Promise<void> {
  const product = await getProduct(db, product_id, business_id);
  if (product.is_active) {
    throw new ProductError("Arsipkan produk ini dulu sebelum bisa dihapus permanen.");
  }
  await db.run(`DELETE FROM stock_adjustments WHERE product_id = $1`, [product_id]);
  const result = await db.run(`DELETE FROM products WHERE product_id = $1 AND business_id = $2`, [
    product_id,
    business_id,
  ]);
  if (result.rowCount === 0) throw new ProductError("Produk tidak ditemukan.");
}

/** Satu-satunya jalur resmi untuk mengubah stock_qty. Menulis products.stock_qty
 * DAN 1 baris stock_adjustments dalam 1 DB transaction, supaya tidak pernah ada
 * perubahan stok tanpa alasan tercatat. Pakai guard `stock_qty + delta >= 0`
 * langsung di WHERE clause (bukan cek-lalu-update terpisah) supaya aman dari
 * race condition kalau ada 2 penyesuaian stok barengan -- polanya sama seperti
 * uq_one_active_per_transaction/createCorrection di lifecycle.ts. */
export async function adjustStock(
  db: Db,
  product_id: string,
  business_id: string,
  delta: number,
  reason: StockAdjustmentReason,
  reason_detail: string | null,
  performed_by: string
): Promise<Product> {
  if (delta === 0) throw new ProductError("Jumlah penyesuaian tidak boleh 0.");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const updated = await client.query(
      `UPDATE products
          SET stock_qty = stock_qty + $1, updated_at = now()
        WHERE product_id = $2 AND business_id = $3 AND stock_qty + $1 >= 0
        RETURNING stock_qty`,
      [delta, product_id, business_id]
    );

    if (updated.rowCount === 0) {
      // Bisa 2 sebab: produk tidak ada, ATAU stok hasilnya akan negatif.
      const exists = await client.query(`SELECT stock_qty FROM products WHERE product_id = $1`, [product_id]);
      if (exists.rowCount === 0) throw new ProductError("Produk tidak ditemukan.");
      throw new ProductError(
        `Stok tidak bisa dikurangi ${Math.abs(delta)} -- sisa stok saat ini cuma ${exists.rows[0].stock_qty}.`
      );
    }

    const stock_after = updated.rows[0].stock_qty as number;

    await client.query(
      `INSERT INTO stock_adjustments
         (adjustment_id, product_id, business_id, delta, stock_after, reason, reason_detail, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [randomUUID(), product_id, business_id, delta, stock_after, reason, reason_detail, performed_by]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getProduct(db, product_id, business_id);
}

export async function getStockHistory(db: Db, product_id: string, business_id: string, limit = 50) {
  await getProduct(db, product_id, business_id); // 404 kalau bukan milik business ini
  return db.all(
    `SELECT adjustment_id, delta, stock_after, reason, reason_detail, performed_by, performed_at
       FROM stock_adjustments
      WHERE product_id = $1 AND business_id = $2
      ORDER BY performed_at DESC
      LIMIT $3`,
    [product_id, business_id, limit]
  );
}

/** Produk yang stoknya di bawah ambang -- dipakai untuk badge "stok menipis"
 * di UI. Cuma produk aktif yang punya ambang diisi yang dihitung. */
export async function getLowStockProducts(db: Db, business_id: string): Promise<Product[]> {
  return db.all<Product>(
    `SELECT * FROM products
      WHERE business_id = $1 AND is_active = true
        AND low_stock_threshold IS NOT NULL AND stock_qty <= low_stock_threshold
      ORDER BY stock_qty ASC`,
    [business_id]
  );
}
