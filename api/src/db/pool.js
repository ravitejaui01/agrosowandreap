import pg from "pg";
import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Load api/.env so DATABASE_URL is set even when process cwd is project root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../.env") });

const { Pool } = pg;

// Prefer public URL on Railway so .railway.internal hostname resolves (private DNS can fail)
const connectionString =
  process.env.DATABASE_PUBLIC_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL (or DATABASE_PUBLIC_URL) not set. API will run but DB operations will fail.");
} else if (
  connectionString.includes("railway.internal") &&
  !process.env.DATABASE_PUBLIC_URL
) {
  console.error(
    "[Railway] DATABASE_URL uses a private hostname that may not resolve. " +
    "In the API service Variables, add a Variable Reference to the Postgres service and select DATABASE_PUBLIC_URL."
  );
}

// Railway Postgres (including rlwy.net public proxy) requires SSL
const needsSsl = connectionString && (
  connectionString.includes("railway") ||
  connectionString.includes("rlwy.net")
);

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
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
