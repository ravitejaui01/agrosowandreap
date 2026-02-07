/**
 * Ensure DB is ready: apply schema and run migrations automatically on startup.
 * Safe to run on every startup: schema uses IF NOT EXISTS, migrations are idempotent.
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { query } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");
const SCHEMA_PATH = join(__dirname, "schema.sql");

/** Apply schema.sql (CREATE TABLE IF NOT EXISTS, etc.). Safe to run every time. */
export async function runSchema() {
  const hasDb = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (!hasDb || !existsSync(SCHEMA_PATH)) return;
  try {
    const sql = readFileSync(SCHEMA_PATH, "utf8");
    await query(sql);
    console.log("[db] Schema applied.");
  } catch (err) {
    console.warn("[db] Schema apply failed:", err.message);
  }
}

/** Run migration files (e.g. add new columns). Idempotent. */
export async function runMigrations() {
  const hasDb = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (!hasDb) return;

  let files = [];
  try {
    files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    return;
  }

  for (const file of files) {
    try {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      await query(sql);
      console.log(`[migrations] Applied ${file}`);
    } catch (err) {
      if (err.code === "42P01" || err.message?.includes("does not exist")) {
        console.log(`[migrations] Skipped ${file} (table not found)`);
        continue;
      }
      console.warn(`[migrations] ${file} failed:`, err.message);
    }
  }
}

/** Run schema then migrations. Call this on API startup. */
export async function ensureDb() {
  await runSchema();
  await runMigrations();
}
