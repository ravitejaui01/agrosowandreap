/**
 * In-memory fallback store when PostgreSQL is not available.
 * Data persists in api/data/fallback.json across restarts.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FALLBACK_FILE = join(__dirname, "../../data/fallback.json");

let coconutSubmissions = [];
let farmerRecords = [];

function load() {
  try {
    if (existsSync(FALLBACK_FILE)) {
      const raw = readFileSync(FALLBACK_FILE, "utf8");
      const data = JSON.parse(raw);
      coconutSubmissions = data.coconutSubmissions ?? [];
      farmerRecords = data.farmerRecords ?? [];
    }
  } catch {
    coconutSubmissions = [];
    farmerRecords = [];
  }
}

function save() {
  try {
    mkdirSync(dirname(FALLBACK_FILE), { recursive: true });
    writeFileSync(
      FALLBACK_FILE,
      JSON.stringify({ coconutSubmissions, farmerRecords }, null, 2),
      "utf8"
    );
  } catch (err) {
    console.warn("Fallback store: could not persist to file", err.message);
  }
}

load();

function coconutToFarmerRecord(coconut, farmerRecordId) {
  const [firstName, ...lastParts] = (coconut.farmerName || "Unknown").trim().split(/\s+/);
  const lastName = lastParts.join(" ") || "-";
  const now = new Date().toISOString();
  return {
    id: farmerRecordId,
    farmerId: coconut.id,
    firstName: firstName || "Unknown",
    lastName,
    nationalId: coconut.aadhaar || null,
    phoneNumber: coconut.phone || null,
    village: coconut.village || null,
    district: coconut.district || null,
    region: coconut.state || null,
    country: "India",
    landSize: coconut.areaUnderCoconutHectares ?? null,
    landUnit: "hectares",
    cropTypes: ["coconut"],
    farmingType: "commercial",
    status: "submitted",
    createdBy: coconut.createdBy,
    createdAt: now,
    updatedAt: now,
    documents: [],
    validationHistory: [],
  };
}

export function addCoconutSubmission(b) {
  const body = b ?? {};
  const id = body.id ?? `coc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const createdBy = body.createdBy ?? body.created_by ?? "field-agent-1";
  const agentName = b.agentName ?? b.agent_name ?? "Field Agent";
  const farmerName = b.farmerName ?? b.farmer_name ?? "";

  const coconut = {
    id,
    farmerName,
    phone: body.phone,
    aadhaar: body.aadhaar,
    agentName,
    activeStatus: body.activeStatus ?? body.active_status,
    totalAreaHectares: body.totalAreaHectares ?? body.total_area_hectares,
    areaUnderCoconutHectares: body.areaUnderCoconutHectares ?? body.area_under_coconut_hectares,
    numberOfPlots: body.numberOfPlots ?? body.number_of_plots,
    state: body.state,
    district: body.district,
    blockTehsilMandal: body.blockTehsilMandal ?? body.block_tehsil_mandal,
    village: body.village,
    dateOfPlantation: body.dateOfPlantation ?? body.date_of_plantation,
    spacing: body.spacing,
    seedlingsPlanted: body.seedlingsPlanted ?? body.seedlings_planted,
    seedlingsSurvived: body.seedlingsSurvived ?? body.seedlings_survived,
    plots: body.plots ?? [],
    mappedAreaAcres: body.mappedAreaAcres ?? body.mapped_area_acres,
    location: body.location,
    createdBy,
    createdAt: new Date().toISOString(),
    landOwnership: body.landOwnership ?? body.land_ownership,
    landUseBeforePlantation: body.landUseBeforePlantation ?? body.land_use_before_plantation,
    treeClearanceBeforePlantation: body.treeClearanceBeforePlantation ?? body.tree_clearance_before_plantation,
    burningTreesForSitePreparation: body.burningTreesForSitePreparation ?? body.burning_trees_for_site_preparation,
    ageOfSaplingMonths: body.ageOfSaplingMonths ?? body.age_of_sapling_months,
    landPattaSurveyNumber: body.landPattaSurveyNumber ?? body.land_patta_survey_number,
    plantationModel: body.plantationModel ?? body.plantation_model,
    sourceOfNursery: body.sourceOfNursery ?? body.source_of_nursery,
    typeOfVariety: body.typeOfVariety ?? body.type_of_variety,
    sizeOfPit: body.sizeOfPit ?? body.size_of_pit,
    modeOfIrrigation: body.modeOfIrrigation ?? body.mode_of_irrigation,
    kharifCrop: body.kharifCrop ?? body.kharif_crop,
    kharifCropDurationDays: body.kharifCropDurationDays ?? body.kharif_crop_duration_days,
    rabiCrop: body.rabiCrop ?? body.rabi_crop,
    rabiCropDurationDays: body.rabiCropDurationDays ?? body.rabi_crop_duration_days,
    nitrogenQtyKg: body.nitrogenQtyKg ?? body.nitrogen_qty_kg,
    phosphorousQtyKg: body.phosphorousQtyKg ?? body.phosphorous_qty_kg,
    potassiumQtyKg: body.potassiumQtyKg ?? body.potassium_qty_kg,
    organicQtyKg: body.organicQtyKg ?? body.organic_qty_kg,
    otherQtyKg: body.otherQtyKg ?? body.other_qty_kg,
    costOfSeedlings: body.costOfSeedlings ?? body.cost_of_seedlings,
    fencingProppingShading: body.fencingProppingShading ?? body.fencing_propping_shading,
    landPreparation: body.landPreparation ?? body.land_preparation,
    manureExpenses: body.manureExpenses ?? body.manure_expenses,
    irrigationExpenses: body.irrigationExpenses ?? body.irrigation_expenses,
    weedManagement: body.weedManagement ?? body.weed_management,
    plantProtection: body.plantProtection ?? body.plant_protection,
    agricultureImplements: body.agricultureImplements ?? body.agriculture_implements,
    manpowerExpenses: body.manpowerExpenses ?? body.manpower_expenses,
    annualFertilizers: body.annualFertilizers ?? body.annual_fertilizers,
    annualIrrigations: body.annualIrrigations ?? body.annual_irrigations,
    annualManpower: body.annualManpower ?? body.annual_manpower,
  };

  coconutSubmissions.push(coconut);
  const farmerRecordId = `farmer-${id}`;
  farmerRecords.push(coconutToFarmerRecord(coconut, farmerRecordId));
  save();

  return coconut;
}

export function getFarmerRecordsFromFallback() {
  return farmerRecords.map((r) => ({
    id: r.id,
    farmerId: r.farmerId,
    firstName: r.firstName,
    lastName: r.lastName,
    dateOfBirth: r.dateOfBirth,
    gender: r.gender,
    phoneNumber: r.phoneNumber,
    email: r.email,
    nationalId: r.nationalId,
    village: r.village,
    district: r.district,
    region: r.region,
    country: r.country,
    landSize: r.landSize,
    landUnit: r.landUnit,
    cropTypes: r.cropTypes ?? [],
    farmingType: r.farmingType,
    documents: r.documents ?? [],
    signatureUrl: r.signatureUrl,
    signatureDate: r.signatureDate,
    status: r.status,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    validationHistory: r.validationHistory ?? [],
  }));
}
