import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

// Prefer public URL on Railway so .railway.internal hostname resolves (private DNS can fail)
const connectionString =
  process.env.DATABASE_PUBLIC_URL ||
  process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("DATABASE_URL (or DATABASE_PUBLIC_URL) not set. API will run but DB operations will fail.");
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("railway") ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "test" && duration > 100) {
    console.log("slow query", { text: text.slice(0, 80), duration, rows: res.rowCount });
  }
  return res;
}
