import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

export function createPool() {
  return new Pool({
    host: process.env.PAYMENT_DB_HOST ?? "localhost",
    port: Number(process.env.PAYMENT_DB_PORT ?? "5435"),
    database: process.env.PAYMENT_DB_NAME ?? "paymentdb",
    user: process.env.PAYMENT_DB_USER ?? "payment",
    password: process.env.PAYMENT_DB_PASSWORD ?? "payment"
  });
}

export async function runMigrations(pool: Pool): Promise<void> {
  const sqlPath = path.resolve(__dirname, "../migrations/001_init.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  await pool.query(sql);
}
