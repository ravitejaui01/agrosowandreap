import { Router } from "express";
import { getCoconutPlantationById, getPlotsFromRow, buildKmlForPlots } from "../lib/supabaseKml.js";

const router = Router();

/**
 * GET /api/kml/:id
 * Returns KML file directly with Content-Disposition: attachment.
 * One click → browser downloads the file immediately (no redirect, no SPA).
 */
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).send("Missing id");

  try {
    const row = await getCoconutPlantationById(id);
    if (!row) return res.status(404).send("Record not found");

    const plots = getPlotsFromRow(row);
    const hasKml = plots.some((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3);
    if (!hasKml) return res.status(404).send("No KML data for this record");

    const code = String(row.farmer_id ?? row.farmer_code ?? row.id ?? id).trim();
    const kml = buildKmlForPlots(plots, code || id, row);
    const filename = `geoboundaries-${code || id}.kml`;

    res.setHeader("Content-Type", "application/vnd.google-earth.kml+xml");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(kml);
  } catch (err) {
    console.error("KML route error:", err);
    res.status(500).send(err.message || "Internal server error");
  }
});

export default router;
