import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

function rowToBiochar(row) {
  if (!row) return null;
  return {
    id: row.id,
    siteName: row.site_name,
    district: row.district,
    village: row.village,
    deploymentDate: row.deployment_date?.toISOString?.()?.slice(0, 10) ?? row.deployment_date,
    quantityTonnes: row.quantity_tonnes != null ? Number(row.quantity_tonnes) : undefined,
    areaAcres: Number(row.area_acres),
    latlngs: row.latlngs ?? undefined,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT * FROM biochar_deployments ORDER BY created_at DESC");
    res.json(result.rows.map(rowToBiochar));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await query("SELECT * FROM biochar_deployments WHERE id = $1", [req.params.id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(rowToBiochar(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const b = req.body;
    const id = b.id ?? `bc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await query(
      `INSERT INTO biochar_deployments (id, site_name, district, village, deployment_date, quantity_tonnes, area_acres, latlngs, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        b.siteName ?? b.site_name,
        b.district,
        b.village,
        b.deploymentDate ?? b.deployment_date,
        b.quantityTonnes ?? b.quantity_tonnes,
        b.areaAcres ?? b.area_acres,
        b.latlngs ? JSON.stringify(b.latlngs) : null,
        b.notes,
        b.createdBy ?? b.created_by,
      ]
    );
    const created = await query("SELECT * FROM biochar_deployments WHERE id = $1", [id]);
    res.status(201).json(rowToBiochar(created.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const b = req.body;
    await query(
      `UPDATE biochar_deployments SET
        site_name = COALESCE($2, site_name), district = COALESCE($3, district), village = $4,
        deployment_date = COALESCE($5, deployment_date), quantity_tonnes = $6, area_acres = COALESCE($7, area_acres),
        latlngs = COALESCE($8, latlngs), notes = $9, updated_at = NOW()
       WHERE id = $1`,
      [
        req.params.id,
        b.siteName ?? b.site_name,
        b.district,
        b.village,
        b.deploymentDate ?? b.deployment_date,
        b.quantityTonnes ?? b.quantity_tonnes,
        b.areaAcres ?? b.area_acres,
        b.latlngs ? JSON.stringify(b.latlngs) : undefined,
        b.notes,
      ]
    );
    const result = await query("SELECT * FROM biochar_deployments WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rowToBiochar(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
