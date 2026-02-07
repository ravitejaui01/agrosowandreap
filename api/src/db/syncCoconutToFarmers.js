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
          farming_type, status, created_by,
          block_tehsil_mandal, date_of_plantation, seedlings_planted, seedlings_survived, agent_name,
          total_area_hectares, area_under_coconut_hectares, land_ownership, land_use_before_plantation,
          type_of_variety, plantation_model, active_status, spacing, mode_of_irrigation, number_of_plots
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'submitted', $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
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
          row.block_tehsil_mandal ?? null,
          row.date_of_plantation ?? null,
          row.seedlings_planted ?? null,
          row.seedlings_survived ?? null,
          row.agent_name ?? agentName,
          row.total_area_hectares ?? null,
          row.area_under_coconut_hectares ?? null,
          row.land_ownership ?? null,
          row.land_use_before_plantation ?? null,
          row.type_of_variety ?? null,
          row.plantation_model ?? null,
          row.active_status ?? null,
          row.spacing ?? null,
          row.mode_of_irrigation ?? null,
          row.number_of_plots ?? null,
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
