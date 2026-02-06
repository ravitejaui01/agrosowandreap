import { Router } from "express";
import { query } from "../db/pool.js";

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
  try {
    const b = req.body;
    const id = b.id ?? `coc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await query(
      `INSERT INTO coconut_submissions (
        id, farmer_name, phone, aadhaar, agent_name, total_area_hectares, area_under_coconut_hectares,
        number_of_plots, state, district, block_tehsil_mandal, village, date_of_plantation,
        spacing, seedlings_planted, seedlings_survived, plots, mapped_area_acres, location, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        id,
        b.farmerName ?? b.farmer_name,
        b.phone,
        b.aadhaar,
        b.agentName ?? b.agent_name,
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
        b.createdBy ?? b.created_by,
      ]
    );
    const created = await query("SELECT * FROM coconut_submissions WHERE id = $1", [id]);
    res.status(201).json(rowToCoconut(created.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
