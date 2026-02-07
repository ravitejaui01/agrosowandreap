import { Router } from "express";
import { query } from "../db/pool.js";
import { addCoconutSubmission } from "../db/fallbackStore.js";

const router = Router();

function rowToCoconut(row) {
  if (!row) return null;
  return {
    id: row.id,
    farmerName: row.farmer_name,
    phone: row.phone,
    aadhaar: row.aadhaar,
    agentName: row.agent_name,
    totalAreaHectares: row.total_area_hectares != null ? Number(row.total_area_hectares) : undefined,
    areaUnderCoconutHectares: row.area_under_coconut_hectares != null ? Number(row.area_under_coconut_hectares) : undefined,
    numberOfPlots: row.number_of_plots,
    state: row.state,
    district: row.district,
    blockTehsilMandal: row.block_tehsil_mandal,
    village: row.village,
    dateOfPlantation: row.date_of_plantation?.toISOString?.()?.slice(0, 10) ?? row.date_of_plantation,
    spacing: row.spacing,
    seedlingsPlanted: row.seedlings_planted,
    seedlingsSurvived: row.seedlings_survived,
    plots: row.plots ?? [],
    mappedAreaAcres: row.mapped_area_acres != null ? Number(row.mapped_area_acres) : undefined,
    location: row.location,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    createdBy: row.created_by,
  };
}

// List all coconut plantations
router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT * FROM coconut_submissions ORDER BY created_at DESC");
    res.json(result.rows.map(rowToCoconut));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Sync existing coconut_submissions into farmer_records (for records created before dual-write)
router.post("/sync-to-farmers", async (req, res) => {
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
    return res.json({ ok: true, synced });
  } catch (err) {
    console.error("Sync error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Coconut Plantation stats (for dashboard)
router.get("/stats", async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*)::int AS total_plantations,
        COALESCE(SUM(area_under_coconut_hectares), 0)::numeric AS total_area_hectares,
        COALESCE(SUM(seedlings_planted), 0)::int AS total_seedlings_planted,
        COALESCE(SUM(seedlings_survived), 0)::int AS total_seedlings_survived
      FROM coconut_submissions
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await query("SELECT * FROM coconut_submissions WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rowToCoconut(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const b = req.body ?? {};
  const hasDb = !!(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);

  // When DB is not configured, use fallback immediately (avoids pg connection errors)
  if (!hasDb) {
    try {
      const coconut = addCoconutSubmission(b);
      return res.status(201).json({
        id: coconut.id,
        farmerName: coconut.farmerName,
        phone: coconut.phone,
        aadhaar: coconut.aadhaar,
        agentName: coconut.agentName,
        totalAreaHectares: coconut.totalAreaHectares,
        areaUnderCoconutHectares: coconut.areaUnderCoconutHectares,
        numberOfPlots: coconut.numberOfPlots,
        state: coconut.state,
        district: coconut.district,
        blockTehsilMandal: coconut.blockTehsilMandal,
        village: coconut.village,
        dateOfPlantation: coconut.dateOfPlantation,
        spacing: coconut.spacing,
        seedlingsPlanted: coconut.seedlingsPlanted,
        seedlingsSurvived: coconut.seedlingsSurvived,
        plots: coconut.plots,
        mappedAreaAcres: coconut.mappedAreaAcres,
        location: coconut.location,
        createdAt: coconut.createdAt,
        createdBy: coconut.createdBy,
      });
    } catch (err) {
      console.error("Coconut POST fallback (no DB):", err);
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    const id = b.id ?? `coc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const createdBy = b.createdBy ?? b.created_by ?? "field-agent-1";
    const agentName = b.agentName ?? b.agent_name ?? "Field Agent";
    const farmerName = b.farmerName ?? b.farmer_name ?? "";

    // Ensure field agent user exists (for farmer_records FK)
    const agentEmail = `field-agent-${createdBy}@agro.local`;
    await query(
      `INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, 'field_agent')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [createdBy, agentName, agentEmail]
    );

    await query(
      `INSERT INTO coconut_submissions (
        id, farmer_name, phone, aadhaar, agent_name, total_area_hectares, area_under_coconut_hectares,
        number_of_plots, state, district, block_tehsil_mandal, village, date_of_plantation,
        spacing, seedlings_planted, seedlings_survived, plots, mapped_area_acres, location, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        id,
        farmerName,
        b.phone,
        b.aadhaar,
        agentName,
        b.totalAreaHectares ?? b.total_area_hectares,
        b.areaUnderCoconutHectares ?? b.area_under_coconut_hectares,
        b.numberOfPlots ?? b.number_of_plots,
        b.state,
        b.district,
        b.blockTehsilMandal ?? b.block_tehsil_mandal,
        b.village,
        b.dateOfPlantation ?? b.date_of_plantation,
        b.spacing,
        b.seedlingsPlanted ?? b.seedlings_planted,
        b.seedlingsSurvived ?? b.seedlings_survived,
        b.plots ? JSON.stringify(b.plots) : "[]",
        b.mappedAreaAcres ?? b.mapped_area_acres,
        b.location ? JSON.stringify(b.location) : null,
        createdBy,
      ]
    );

    // Create farmer_record so it appears in Data Validator Farmer Records table
    const [firstName, ...lastParts] = (farmerName || "Unknown").trim().split(/\s+/);
    const lastName = lastParts.join(" ") || "-";
    const farmerRecordId = `farmer-${id}`;
    await query(
      `INSERT INTO farmer_records (
        id, farmer_id, first_name, last_name, national_id, phone_number,
        village, district, region, country, land_size, land_unit, crop_types,
        farming_type, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'submitted', $15)`,
      [
        farmerRecordId,
        id,
        firstName || "Unknown",
        lastName,
        b.aadhaar || null,
        b.phone || null,
        b.village || null,
        b.district || null,
        b.state || null,
        "India",
        b.areaUnderCoconutHectares ?? b.area_under_coconut_hectares ?? null,
        "hectares",
        ["coconut"],
        "commercial",
        createdBy,
      ]
    );

    const created = await query("SELECT * FROM coconut_submissions WHERE id = $1", [id]);
    return res.status(201).json(rowToCoconut(created.rows[0]));
  } catch (err) {
    // Fallback: save to in-memory store when DB is unavailable (no setup needed)
    console.warn("Coconut POST: DB unavailable, using fallback store:", err.message);
    try {
      const coconut = addCoconutSubmission(b);
      return res.status(201).json({
        id: coconut.id,
        farmerName: coconut.farmerName,
        phone: coconut.phone,
        aadhaar: coconut.aadhaar,
        agentName: coconut.agentName,
        totalAreaHectares: coconut.totalAreaHectares,
        areaUnderCoconutHectares: coconut.areaUnderCoconutHectares,
        numberOfPlots: coconut.numberOfPlots,
        state: coconut.state,
        district: coconut.district,
        blockTehsilMandal: coconut.blockTehsilMandal,
        village: coconut.village,
        dateOfPlantation: coconut.dateOfPlantation,
        spacing: coconut.spacing,
        seedlingsPlanted: coconut.seedlingsPlanted,
        seedlingsSurvived: coconut.seedlingsSurvived,
        plots: coconut.plots,
        mappedAreaAcres: coconut.mappedAreaAcres,
        location: coconut.location,
        createdAt: coconut.createdAt,
        createdBy: coconut.createdBy,
      });
    } catch (fallbackErr) {
      console.error("Coconut POST fallback error:", fallbackErr);
      return res.status(500).json({ error: fallbackErr.message });
    }
  }
});

export default router;
