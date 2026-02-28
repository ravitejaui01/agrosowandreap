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
    activeStatus: row.active_status,
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
    landOwnership: row.land_ownership,
    landUseBeforePlantation: row.land_use_before_plantation,
    treeClearanceBeforePlantation: row.tree_clearance_before_plantation,
    burningTreesForSitePreparation: row.burning_trees_for_site_preparation,
    ageOfSaplingMonths: row.age_of_sapling_months != null ? Number(row.age_of_sapling_months) : undefined,
    landPattaSurveyNumber: row.land_patta_survey_number,
    plantationModel: row.plantation_model,
    sourceOfNursery: row.source_of_nursery,
    typeOfVariety: row.type_of_variety,
    sizeOfPit: row.size_of_pit,
    modeOfIrrigation: row.mode_of_irrigation,
    kharifCrop: row.kharif_crop,
    kharifCropDurationDays: row.kharif_crop_duration_days != null ? Number(row.kharif_crop_duration_days) : undefined,
    rabiCrop: row.rabi_crop,
    rabiCropDurationDays: row.rabi_crop_duration_days != null ? Number(row.rabi_crop_duration_days) : undefined,
    nitrogenQtyKg: row.nitrogen_qty_kg != null ? Number(row.nitrogen_qty_kg) : undefined,
    phosphorousQtyKg: row.phosphorous_qty_kg != null ? Number(row.phosphorous_qty_kg) : undefined,
    potassiumQtyKg: row.potassium_qty_kg != null ? Number(row.potassium_qty_kg) : undefined,
    organicQtyKg: row.organic_qty_kg != null ? Number(row.organic_qty_kg) : undefined,
    otherQtyKg: row.other_qty_kg != null ? Number(row.other_qty_kg) : undefined,
    costOfSeedlings: row.cost_of_seedlings != null ? Number(row.cost_of_seedlings) : undefined,
    fencingProppingShading: row.fencing_propping_shading != null ? Number(row.fencing_propping_shading) : undefined,
    landPreparation: row.land_preparation != null ? Number(row.land_preparation) : undefined,
    manureExpenses: row.manure_expenses != null ? Number(row.manure_expenses) : undefined,
    irrigationExpenses: row.irrigation_expenses != null ? Number(row.irrigation_expenses) : undefined,
    weedManagement: row.weed_management != null ? Number(row.weed_management) : undefined,
    plantProtection: row.plant_protection != null ? Number(row.plant_protection) : undefined,
    agricultureImplements: row.agriculture_implements != null ? Number(row.agriculture_implements) : undefined,
    manpowerExpenses: row.manpower_expenses != null ? Number(row.manpower_expenses) : undefined,
    annualFertilizers: row.annual_fertilizers != null ? Number(row.annual_fertilizers) : undefined,
    annualIrrigations: row.annual_irrigations != null ? Number(row.annual_irrigations) : undefined,
    annualManpower: row.annual_manpower != null ? Number(row.annual_manpower) : undefined,
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

router.get("/by-farmer-code/:farmerCode", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM coconut_submissions WHERE farmer_code = $1 LIMIT 1",
      [req.params.farmerCode]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rowToCoconut(result.rows[0]));
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

// Field Agent Coconut Plantation Registration:
// 1. Record is saved to coconut_submissions (and shown on Field Agent Coconut Plantation / Entries screen).
// 2. A row is also created in farmer_records so it appears in Data Validator login → Farmer Records table.
router.post("/", async (req, res) => {
  const b = req.body ?? {};
  const hasDb = !!(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);

  // No DB: save to fallback store (coconutSubmissions in memory + file), NOT to PostgreSQL
  if (!hasDb) {
    console.log("[coconut] No DATABASE_URL — saving to fallback store (not PostgreSQL).");
    try {
      const coconut = addCoconutSubmission(b);
      return res.status(201).json({ ...coconut, _savedTo: "fallback" }); // so client can tell it's not in DB
    } catch (err) {
      console.error("Coconut POST fallback (no DB):", err);
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    // Save to coconut_submissions table (and create farmer_record for validator)
    console.log("[coconut] Saving to PostgreSQL coconut_submissions...");
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

    const extra = {
      activeStatus: b.activeStatus ?? b.active_status,
      landOwnership: b.landOwnership ?? b.land_ownership,
      landUseBeforePlantation: b.landUseBeforePlantation ?? b.land_use_before_plantation,
      treeClearanceBeforePlantation: b.treeClearanceBeforePlantation ?? b.tree_clearance_before_plantation,
      burningTreesForSitePreparation: b.burningTreesForSitePreparation ?? b.burning_trees_for_site_preparation,
      ageOfSaplingMonths: b.ageOfSaplingMonths ?? b.age_of_sapling_months,
      landPattaSurveyNumber: b.landPattaSurveyNumber ?? b.land_patta_survey_number,
      plantationModel: b.plantationModel ?? b.plantation_model,
      sourceOfNursery: b.sourceOfNursery ?? b.source_of_nursery,
      typeOfVariety: b.typeOfVariety ?? b.type_of_variety,
      sizeOfPit: b.sizeOfPit ?? b.size_of_pit,
      modeOfIrrigation: b.modeOfIrrigation ?? b.mode_of_irrigation,
      kharifCrop: b.kharifCrop ?? b.kharif_crop,
      kharifCropDurationDays: b.kharifCropDurationDays ?? b.kharif_crop_duration_days,
      rabiCrop: b.rabiCrop ?? b.rabi_crop,
      rabiCropDurationDays: b.rabiCropDurationDays ?? b.rabi_crop_duration_days,
      nitrogenQtyKg: b.nitrogenQtyKg ?? b.nitrogen_qty_kg,
      phosphorousQtyKg: b.phosphorousQtyKg ?? b.phosphorous_qty_kg,
      potassiumQtyKg: b.potassiumQtyKg ?? b.potassium_qty_kg,
      organicQtyKg: b.organicQtyKg ?? b.organic_qty_kg,
      otherQtyKg: b.otherQtyKg ?? b.other_qty_kg,
      costOfSeedlings: b.costOfSeedlings ?? b.cost_of_seedlings,
      fencingProppingShading: b.fencingProppingShading ?? b.fencing_propping_shading,
      landPreparation: b.landPreparation ?? b.land_preparation,
      manureExpenses: b.manureExpenses ?? b.manure_expenses,
      irrigationExpenses: b.irrigationExpenses ?? b.irrigation_expenses,
      weedManagement: b.weedManagement ?? b.weed_management,
      plantProtection: b.plantProtection ?? b.plant_protection,
      agricultureImplements: b.agricultureImplements ?? b.agriculture_implements,
      manpowerExpenses: b.manpowerExpenses ?? b.manpower_expenses,
      annualFertilizers: b.annualFertilizers ?? b.annual_fertilizers,
      annualIrrigations: b.annualIrrigations ?? b.annual_irrigations,
      annualManpower: b.annualManpower ?? b.annual_manpower,
    };
    const farmerCode = b.farmer_code ?? b.farmerCode ?? id;
    await query(
      `INSERT INTO coconut_submissions (
        id, farmer_code, farmer_name, phone, aadhaar, agent_name, active_status, total_area_hectares, area_under_coconut_hectares,
        number_of_plots, state, district, block_tehsil_mandal, village, date_of_plantation,
        spacing, seedlings_planted, seedlings_survived, plots, mapped_area_acres, location, created_by,
        land_ownership, land_use_before_plantation, tree_clearance_before_plantation,
        burning_trees_for_site_preparation, age_of_sapling_months, land_patta_survey_number,
        plantation_model, source_of_nursery, type_of_variety, size_of_pit, mode_of_irrigation,
        kharif_crop, kharif_crop_duration_days, rabi_crop, rabi_crop_duration_days,
        nitrogen_qty_kg, phosphorous_qty_kg, potassium_qty_kg, organic_qty_kg, other_qty_kg,
        cost_of_seedlings, fencing_propping_shading, land_preparation,
        manure_expenses, irrigation_expenses, weed_management, plant_protection,
        agriculture_implements, manpower_expenses, annual_fertilizers, annual_irrigations, annual_manpower
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
        $23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,
        $44,$45,$46,$47,$48,$49,$50,$51,$52,$53,$54)`,
      [
        id,
        farmerCode,
        farmerName,
        b.phone,
        b.aadhaar,
        agentName,
        extra.activeStatus ?? null,
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
        extra.landOwnership ?? null,
        extra.landUseBeforePlantation ?? null,
        extra.treeClearanceBeforePlantation ?? null,
        extra.burningTreesForSitePreparation ?? null,
        extra.ageOfSaplingMonths ?? null,
        extra.landPattaSurveyNumber ?? null,
        extra.plantationModel ?? null,
        extra.sourceOfNursery ?? null,
        extra.typeOfVariety ?? null,
        extra.sizeOfPit ?? null,
        extra.modeOfIrrigation ?? null,
        extra.kharifCrop ?? null,
        extra.kharifCropDurationDays ?? null,
        extra.rabiCrop ?? null,
        extra.rabiCropDurationDays ?? null,
        extra.nitrogenQtyKg ?? null,
        extra.phosphorousQtyKg ?? null,
        extra.potassiumQtyKg ?? null,
        extra.organicQtyKg ?? null,
        extra.otherQtyKg ?? null,
        extra.costOfSeedlings ?? null,
        extra.fencingProppingShading ?? null,
        extra.landPreparation ?? null,
        extra.manureExpenses ?? null,
        extra.irrigationExpenses ?? null,
        extra.weedManagement ?? null,
        extra.plantProtection ?? null,
        extra.agricultureImplements ?? null,
        extra.manpowerExpenses ?? null,
        extra.annualFertilizers ?? null,
        extra.annualIrrigations ?? null,
        extra.annualManpower ?? null,
      ]
    );

    // Create farmer_record so it appears in Data Validator Farmer Records table (mirror coconut fields)
    const [firstName, ...lastParts] = (farmerName || "Unknown").trim().split(/\s+/);
    const lastName = lastParts.join(" ") || "-";
    const farmerRecordId = `farmer-${id}`;
    const blockTehsil = b.blockTehsilMandal ?? b.block_tehsil_mandal ?? null;
    const dateOfPlantation = b.dateOfPlantation ?? b.date_of_plantation ?? null;
    const seedlingsPlanted = b.seedlingsPlanted ?? b.seedlings_planted ?? null;
    const seedlingsSurvived = b.seedlingsSurvived ?? b.seedlings_survived ?? null;
    await query(
      `INSERT INTO farmer_records (
        id, farmer_id, first_name, last_name, national_id, phone_number,
        village, district, region, country, land_size, land_unit, crop_types,
        farming_type, status, created_by,
        block_tehsil_mandal, date_of_plantation, seedlings_planted, seedlings_survived, agent_name,
        total_area_hectares, area_under_coconut_hectares, land_ownership, land_use_before_plantation,
        type_of_variety, plantation_model, active_status, spacing, mode_of_irrigation, number_of_plots
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'submitted', $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`,
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
        blockTehsil,
        dateOfPlantation,
        seedlingsPlanted,
        seedlingsSurvived,
        agentName,
        b.totalAreaHectares ?? b.total_area_hectares ?? null,
        b.areaUnderCoconutHectares ?? b.area_under_coconut_hectares ?? null,
        b.landOwnership ?? b.land_ownership ?? null,
        b.landUseBeforePlantation ?? b.land_use_before_plantation ?? null,
        b.typeOfVariety ?? b.type_of_variety ?? null,
        b.plantationModel ?? b.plantation_model ?? null,
        b.activeStatus ?? b.active_status ?? null,
        b.spacing ?? null,
        b.modeOfIrrigation ?? b.mode_of_irrigation ?? null,
        b.numberOfPlots ?? b.number_of_plots ?? null,
      ]
    );

    const created = await query("SELECT * FROM coconut_submissions WHERE id = $1", [id]);
    console.log("[coconut] Saved to PostgreSQL coconut_submissions, id:", id);
    return res.status(201).json({ ...rowToCoconut(created.rows[0]), _savedTo: "database" });
  } catch (err) {
    // DB is configured but INSERT failed — return 503 so client knows data did NOT save
    console.error("[coconut] INSERT failed. Data NOT saved to database. Code:", err.code, "Message:", err.message, err.detail || "");
    return res.status(503).json({
      error: "Database save failed. Record was not saved.",
      detail: err.message,
      code: err.code,
    });
  }
});

export default router;
