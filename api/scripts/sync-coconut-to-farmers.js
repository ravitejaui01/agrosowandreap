#!/usr/bin/env node
/**
 * Sync coconut_submissions → farmer_records
 * Run: DATABASE_URL=postgres://... node scripts/sync-coconut-to-farmers.js
 * Or with api/.env: cd api && node scripts/sync-coconut-to-farmers.js
 */
import "dotenv/config";
import { pool } from "../src/db/pool.js";

async function sync() {
  const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL or DATABASE_PUBLIC_URL (e.g. from Railway PostgreSQL)");
    process.exit(1);
  }

  const coco = await pool.query(`
    SELECT c.* FROM coconut_submissions c
    LEFT JOIN farmer_records f ON f.farmer_id = c.id
    WHERE f.id IS NULL
  `);

  let synced = 0;
  for (const row of coco.rows) {
    const createdBy = row.created_by ?? "field-agent-1";
    const agentName = row.agent_name ?? "Field Agent";
    const agentEmail = `field-agent-${createdBy}@agro.local`;
    await pool.query(
      `INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, 'field_agent')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [createdBy, agentName, agentEmail]
    );
    const [firstName, ...lastParts] = (row.farmer_name || "Unknown").trim().split(/\s+/);
    const lastName = lastParts.join(" ") || "-";
    const farmerRecordId = `farmer-${row.id}`;
    await pool.query(
      `INSERT INTO farmer_records (
        id, farmer_id, first_name, last_name, national_id, phone_number,
        village, district, region, country, land_size, land_unit, crop_types,
        farming_type, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'submitted', $15)
      ON CONFLICT (id) DO NOTHING`,
      [
        farmerRecordId,
        row.id,
        firstName || "Unknown",
        lastName,
        row.aadhaar || null,
        row.phone || null,
        row.village || null,
        row.district || null,
        row.state || null,
        "India",
        row.area_under_coconut_hectares ?? null,
        "hectares",
        ["coconut"],
        "commercial",
        createdBy,
      ]
    );
    synced++;
  }

  console.log(`Synced ${synced} coconut submission(s) to farmer_records`);
  await pool.end();
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
