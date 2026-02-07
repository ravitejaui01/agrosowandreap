import { Router } from "express";
import { query } from "../db/pool.js";
import { getFarmerRecordsFromFallback } from "../db/fallbackStore.js";

const router = Router();

function rowToDocument(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    uploadedAt: row.uploaded_at?.toISOString?.()?.slice(0, 10) ?? row.uploaded_at,
    verified: row.verified,
  };
}

function rowToValidation(row) {
  return {
    id: row.id,
    action: row.action,
    performedBy: row.performed_by,
    performedByRole: row.performed_by_role,
    performedAt: row.performed_at?.toISOString?.() ?? row.performed_at,
    comments: row.comments,
  };
}

function rowToFarmer(row, documents = [], validationHistory = []) {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth?.toISOString?.()?.slice(0, 10) ?? row.date_of_birth,
    gender: row.gender,
    phoneNumber: row.phone_number,
    email: row.email,
    nationalId: row.national_id,
    village: row.village,
    district: row.district,
    region: row.region,
    country: row.country,
    landSize: row.land_size != null ? Number(row.land_size) : undefined,
    landUnit: row.land_unit,
    cropTypes: row.crop_types ?? [],
    farmingType: row.farming_type,
    documents: documents.map(rowToDocument),
    signatureUrl: row.signature_url,
    signatureDate: row.signature_date?.toISOString?.()?.slice(0, 10) ?? row.signature_date,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    validationHistory: validationHistory.map(rowToValidation),
    // Mirrored from coconut_submissions when record comes from Field Agent Coconut Registration
    blockTehsilMandal: row.block_tehsil_mandal ?? undefined,
    dateOfPlantation: row.date_of_plantation?.toISOString?.()?.slice(0, 10) ?? row.date_of_plantation ?? undefined,
    seedlingsPlanted: row.seedlings_planted != null ? Number(row.seedlings_planted) : undefined,
    seedlingsSurvived: row.seedlings_survived != null ? Number(row.seedlings_survived) : undefined,
    agentName: row.agent_name ?? undefined,
    totalAreaHectares: row.total_area_hectares != null ? Number(row.total_area_hectares) : undefined,
    areaUnderCoconutHectares: row.area_under_coconut_hectares != null ? Number(row.area_under_coconut_hectares) : undefined,
    landOwnership: row.land_ownership ?? undefined,
    landUseBeforePlantation: row.land_use_before_plantation ?? undefined,
    typeOfVariety: row.type_of_variety ?? undefined,
    plantationModel: row.plantation_model ?? undefined,
    activeStatus: row.active_status ?? undefined,
    spacing: row.spacing ?? undefined,
    modeOfIrrigation: row.mode_of_irrigation ?? undefined,
    numberOfPlots: row.number_of_plots != null ? Number(row.number_of_plots) : undefined,
  };
}

router.get("/", async (req, res) => {
  try {
    const status = req.query.status;
    let sql = "SELECT * FROM farmer_records ORDER BY created_at DESC";
    const params = [];
    if (status) {
      sql = "SELECT * FROM farmer_records WHERE status = $1 ORDER BY created_at DESC";
      params.push(status);
    }
    const recs = await query(sql, params);
    const docs = await query("SELECT * FROM documents");
    const hist = await query("SELECT * FROM validation_history");
    const byRec = (arr, id) => arr.rows.filter((r) => r.farmer_record_id === id);
    const list = recs.rows.map((r) =>
      rowToFarmer(r, byRec(docs, r.id), byRec(hist, r.id))
    );
    return res.json(list);
  } catch (err) {
    // Fallback: return records from in-memory store when DB is unavailable
    console.warn("Farmers GET: DB unavailable, using fallback store:", err.message);
    const list = getFarmerRecordsFromFallback();
    return res.json(list);
  }
});

router.get("/stats", async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*)::int AS total_records,
        COUNT(*) FILTER (WHERE status IN ('submitted','under_review'))::int AS pending_review,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status = 'corrections_needed')::int AS corrections_needed
      FROM farmer_records
    `);
    return res.json(result.rows[0]);
  } catch (err) {
    // Fallback: compute stats from in-memory store
    const list = getFarmerRecordsFromFallback();
    const stats = {
      total_records: list.length,
      pending_review: list.filter((r) => r.status === "submitted" || r.status === "under_review").length,
      approved: list.filter((r) => r.status === "approved").length,
      rejected: list.filter((r) => r.status === "rejected").length,
      corrections_needed: list.filter((r) => r.status === "corrections_needed").length,
    };
    return res.json(stats);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const rec = await query("SELECT * FROM farmer_records WHERE id = $1", [req.params.id]);
    if (rec.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const docs = await query("SELECT * FROM documents WHERE farmer_record_id = $1", [req.params.id]);
    const hist = await query("SELECT * FROM validation_history WHERE farmer_record_id = $1 ORDER BY performed_at", [req.params.id]);
    res.json(rowToFarmer(rec.rows[0], docs.rows, hist.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await query(
      `INSERT INTO farmer_records (
        id, farmer_id, first_name, last_name, date_of_birth, gender, phone_number, email, national_id,
        village, district, region, country, land_size, land_unit, crop_types, farming_type,
        signature_url, signature_date, status, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        id,
        b.farmerId ?? b.farmer_id,
        b.firstName ?? b.first_name,
        b.lastName ?? b.last_name,
        b.dateOfBirth ?? b.date_of_birth,
        b.gender,
        b.phoneNumber ?? b.phone_number,
        b.email,
        b.nationalId ?? b.national_id,
        b.village,
        b.district,
        b.region,
        b.country,
        b.landSize ?? b.land_size,
        b.landUnit ?? b.land_unit,
        b.cropTypes ?? b.crop_types ?? [],
        b.farmingType ?? b.farming_type,
        b.signatureUrl ?? b.signature_url,
        b.signatureDate ?? b.signature_date,
        b.status ?? "draft",
        b.createdBy ?? b.created_by,
      ]
    );
    if (Array.isArray(b.documents) && b.documents.length) {
      for (const d of b.documents) {
        await query(
          "INSERT INTO documents (id, farmer_record_id, name, type, url, verified) VALUES ($1,$2,$3,$4,$5,$6)",
          [d.id ?? `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, id, d.name, d.type, d.url, d.verified ?? false]
        );
      }
    }
    if (Array.isArray(b.validationHistory) && b.validationHistory.length) {
      for (const v of b.validationHistory) {
        await query(
          "INSERT INTO validation_history (id, farmer_record_id, action, performed_by, performed_by_role, performed_at, comments) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [v.id ?? `v-${Date.now()}`, id, v.action, v.performedBy, v.performedByRole, v.performedAt ?? new Date(), v.comments]
        );
      }
    }
    const created = await query("SELECT * FROM farmer_records WHERE id = $1", [id]);
    const docs = await query("SELECT * FROM documents WHERE farmer_record_id = $1", [id]);
    const hist = await query("SELECT * FROM validation_history WHERE farmer_record_id = $1", [id]);
    res.status(201).json(rowToFarmer(created.rows[0], docs.rows, hist.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    const map = {
      status: "status",
      firstName: "first_name", first_name: "first_name",
      lastName: "last_name", last_name: "last_name",
      phoneNumber: "phone_number", phone_number: "phone_number",
      email: "email", village: "village", district: "district", region: "region", country: "country",
      landSize: "land_size", land_size: "land_size",
      landUnit: "land_unit", land_unit: "land_unit",
      cropTypes: "crop_types", crop_types: "crop_types",
      farmingType: "farming_type", farming_type: "farming_type",
    };
    for (const [k, col] of Object.entries(map)) {
      if (b[k] !== undefined) {
        updates.push(`${col} = $${i}`);
        values.push(Array.isArray(b[k]) ? b[k] : b[k]);
        i++;
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    values.push(req.params.id);
    await query(
      `UPDATE farmer_records SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${i}`,
      values
    );
    const rec = await query("SELECT * FROM farmer_records WHERE id = $1", [req.params.id]);
    if (rec.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const docs = await query("SELECT * FROM documents WHERE farmer_record_id = $1", [req.params.id]);
    const hist = await query("SELECT * FROM validation_history WHERE farmer_record_id = $1", [req.params.id]);
    res.json(rowToFarmer(rec.rows[0], docs.rows, hist.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
