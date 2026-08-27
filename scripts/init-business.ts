import { openDatabase } from "../lib/talatee-core/db";
import { randomUUID } from "crypto";

const db = openDatabase(process.env.TALATEE_DB_PATH ?? "./talatee.sqlite");
const business_id = randomUUID();

db.prepare(
  `INSERT INTO businesses (business_id, business_name, business_type) VALUES (?, ?, 'warung')`
).run(business_id, "Warung Ibu Sari");

console.log("business_id:", business_id);
console.log("Salin nilai ini ke TALATEE_PILOT_BUSINESS_ID di .env.local");