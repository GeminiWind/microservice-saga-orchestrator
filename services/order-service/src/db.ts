import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

export function createPool() {
  return new Pool({
    host: process.env.ORDER_DB_HOST ?? "localhost",
    port: Number(process.env.ORDER_DB_PORT ?? "5433"),
    database: process.env.ORDER_DB_NAME ?? "orderdb",
    user: process.env.ORDER_DB_USER ?? "order",
    password: process.env.ORDER_DB_PASSWORD ?? "order"
  });
}

export async function runMigrations(pool: Pool): Promise<void> {
  const sqlPath = path.resolve(__dirname, "../migrations/001_init.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  await pool.query(sql);
}
