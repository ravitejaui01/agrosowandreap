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
