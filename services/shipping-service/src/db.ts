import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

export function createPool() {
  return new Pool({
    host: process.env.SHIPPING_DB_HOST ?? "localhost",
    port: Number(process.env.SHIPPING_DB_PORT ?? "5434"),
    database: process.env.SHIPPING_DB_NAME ?? "shippingdb",
    user: process.env.SHIPPING_DB_USER ?? "shipping",
    password: process.env.SHIPPING_DB_PASSWORD ?? "shipping"
  });
}

export async function runMigrations(pool: Pool): Promise<void> {
  const sqlPath = path.resolve(__dirname, "../migrations/001_init.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  await pool.query(sql);
}
