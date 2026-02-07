import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Always load api/.env (so DATABASE_URL is set even when started from project root)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

import cron from "node-cron";
import express from "express";
import cors from "cors";
import users from "./routes/users.js";
import farmers from "./routes/farmers.js";
import coconut from "./routes/coconut.js";
import rules from "./routes/rules.js";
import { query } from "./db/pool.js";
import { ensureDb } from "./db/runMigrations.js";
import { syncCoconutToFarmers } from "./db/syncCoconutToFarmers.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "sowandreap-api" });
});

app.get("/ready", async (req, res) => {
  try {
    if (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL) await query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    res.status(503).json({ ok: false, db: "disconnected", error: e.message });
  }
});

app.use("/api/users", users);
app.use("/api/farmers", farmers);
app.use("/api/coconut", coconut);
app.use("/api/rules", rules);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, async () => {
  console.log(`API listening on port ${PORT}`);
  const hasDb = !!(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);
  if (!hasDb) {
    console.warn("Database: DATABASE_URL / DATABASE_PUBLIC_URL not set. Coconut submissions will NOT save to PostgreSQL (fallback store only). On Railway: API service → Variables → add Variable Reference → Postgres → DATABASE_PUBLIC_URL.");
  } else {
    try {
      await query("SELECT 1");
      console.log("Database: connected to PostgreSQL. coconut_submissions will be used.");
    } catch (e) {
      console.error("Database: PostgreSQL connection failed. Coconut submissions will use fallback (not saved to DB). Error:", e.code || e.message, e.message);
    }
  }
  await ensureDb(); // Auto-apply schema + migrations (no manual db:init needed)
  syncCoconutToFarmers(); // Auto-sync coconut_submissions → farmer_records on startup

  // Schedule coconut → farmer_records sync (default: every 5 minutes)
  const cronExpr = process.env.COCONUT_SYNC_CRON ?? "*/5 * * * *";
  if (cronExpr && cronExpr !== "0" && cronExpr !== "false") {
    cron.schedule(cronExpr, () => syncCoconutToFarmers());
    console.log(`Coconut sync: scheduled (cron: ${cronExpr}). Set COCONUT_SYNC_CRON=0 to disable.`);
  }
});
