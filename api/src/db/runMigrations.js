/**
 * Ensure DB is ready: apply schema and run migrations automatically on startup.
 * Safe to run on every startup: schema uses IF NOT EXISTS, migrations are idempotent.
 * If DB is unreachable and DATABASE_URL is localhost, tries to start Postgres via docker-compose automatically.
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { query } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");
const SCHEMA_PATH = join(__dirname, "schema.sql");

/** Return true if DATABASE_URL looks like local Postgres (so we may try docker-compose). */
function isLocalDb() {
  const u = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || "";
  return u.includes("localhost") || u.includes("127.0.0.1");
}

/** Try to start Postgres with docker-compose (project root = parent of api/). */
function tryStartDockerPostgres() {
  return new Promise((resolvePromise) => {
    const projectRoot = resolve(__dirname, "../.."); // api/src/db -> api -> repo root
    const child = spawn("docker-compose", ["up", "-d"], {
      cwd: projectRoot,
      stdio: "ignore",
      shell: true,
    });
    child.on("close", (code) => {
      if (code === 0) {
        console.log("[db] Started Postgres with docker-compose. Waiting for it to be ready...");
      }
      resolvePromise();
    });
    child.on("error", () => resolvePromise());
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Apply schema.sql (CREATE TABLE IF NOT EXISTS, etc.). Safe to run every time. */
export async function runSchema() {
  const hasDb = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (!hasDb || !existsSync(SCHEMA_PATH)) return;
  try {
    const sql = readFileSync(SCHEMA_PATH, "utf8");
    // Run each statement separately (node-pg runs only the first if given multiple)
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && /\bCREATE\s+(TABLE|INDEX)/i.test(s));
    for (const st of statements) {
      await query(st + ";");
    }
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

/** Run schema then migrations. Call this on API startup. If local DB is down, tries to start Docker once and retries. */
export async function ensureDb() {
  const hasDb = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (!hasDb) return;

  let connected = false;
  try {
    await query("SELECT 1");
    connected = true;
  } catch (err) {
    if (err.code === "ECONNREFUSED" && isLocalDb()) {
      console.log("[db] Cannot connect to Postgres. Trying to start it automatically (docker-compose up -d)...");
      await tryStartDockerPostgres();
      for (let i = 0; i < 6; i++) {
        await sleep(2000);
        try {
          await query("SELECT 1");
          connected = true;
          break;
        } catch {
          // keep trying
        }
      }
    }
  }

  if (!connected) return;

  await runSchema();
  await runMigrations();
}
