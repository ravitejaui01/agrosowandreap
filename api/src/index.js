import "dotenv/config";
import express from "express";
import cors from "cors";
import users from "./routes/users.js";
import farmers from "./routes/farmers.js";
import coconut from "./routes/coconut.js";
import { query } from "./db/pool.js";
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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, async () => {
  console.log(`API listening on port ${PORT}`);
  syncCoconutToFarmers(); // Auto-sync coconut_submissions → farmer_records on startup
});
