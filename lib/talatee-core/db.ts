import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export function openDatabase(filePath: string): Database.Database {
  const db = new Database(filePath);
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(path.join(process.cwd(), "lib", "talatee-core", "schema.sql"), "utf-8");
  db.exec(schema);
  return db;
}
