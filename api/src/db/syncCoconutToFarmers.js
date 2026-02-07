import { query } from "./pool.js";

export async function syncCoconutToFarmers() {
  try {
    const coco = await query(`
      SELECT c.* FROM coconut_submissions c
      LEFT JOIN farmer_records f ON f.farmer_id = c.id
      WHERE f.id IS NULL
    `);
    let synced = 0;
    for (const row of coco.rows) {
      const createdBy = row.created_by ?? "field-agent-1";
      const agentName = row.agent_name ?? "Field Agent";
      const agentEmail = `field-agent-${createdBy}@agro.local`;
      await query(
        `INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, 'field_agent')
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [createdBy, agentName, agentEmail]
      );
      const [firstName, ...lastParts] = (row.farmer_name || "Unknown").trim().split(/\s+/);
      const lastName = lastParts.join(" ") || "-";
      const farmerRecordId = `farmer-${row.id}`;
      await query(
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
    if (synced > 0) {
      console.log(`[sync] Synced ${synced} coconut submission(s) to farmer_records`);
    }
  } catch (err) {
    console.warn("[sync] Coconut→farmers sync skipped:", err.message);
  }
}
