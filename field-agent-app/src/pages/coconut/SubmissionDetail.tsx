import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCoconutSubmissionById } from "@/data/coconutStore";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Pencil } from "lucide-react";

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const submission = id ? getCoconutSubmissionById(id) : null;

  if (!submission) {
    return (
      <div className="coconut-screen p-6 flex flex-col items-center justify-center">
        <p className="text-gray-400">Submission not found.</p>
        <Button asChild className="mt-4 bg-green-600 hover:bg-green-700">
          <Link to="/coconut/entries">Back to Entries</Link>
        </Button>
      </div>
    );
  }

  const agentName = user?.name ?? "Agent";

  return (
    <div className="coconut-screen p-4 md:p-6 relative">
      <div className="absolute top-4 left-4 z-10">
        <Link to="/coconut/entries">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            Menu
          </Button>
        </Link>
      </div>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white text-center sm:text-left">
            Coconut Plantation Dashboard
          </h1>
          <p className="text-sm text-gray-400 sm:text-right">Agent: {agentName}</p>
        </div>

        <Button
          variant="outline"
          asChild
          className="mb-6 border-green-600 text-green-400 hover:bg-green-600/20"
        >
          <Link to="/coconut/entries" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Entries
          </Link>
        </Button>

        <h2 className="text-lg font-semibold text-white mb-6">
          Submission Details: {submission.farmerName}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Farmer Information */}
          <div className="coconut-card rounded-lg p-4 border-green-600/50">
            <h3 className="text-sm font-semibold text-green-400 mb-3">Farmer Information</h3>
            <dl className="space-y-1 text-sm">
              <div><span className="text-gray-400">ID:</span> <span className="text-white">{submission.id}</span></div>
              <div><span className="text-gray-400">Name:</span> <span className="text-white">{submission.farmerName}</span></div>
              <div><span className="text-gray-400">Phone:</span> <span className="text-white">{submission.phone}</span></div>
              <div><span className="text-gray-400">Aadhaar:</span> <span className="text-white">{submission.aadhaar}</span></div>
              {submission.activeStatus != null && submission.activeStatus !== "" && (
                <div><span className="text-gray-400">Active Status:</span> <span className="text-white">{submission.activeStatus}</span></div>
              )}
            </dl>
          </div>

          {/* Land Information */}
          <div className="coconut-card rounded-lg p-4 border-green-600/50">
            <h3 className="text-sm font-semibold text-green-400 mb-3">Land Information</h3>
            <dl className="space-y-1 text-sm">
              <div><span className="text-gray-400">Land Ownership:</span> <span className="text-white">{submission.landOwnership ?? "—"}</span></div>
              <div><span className="text-gray-400">Land Use Before Plantation:</span> <span className="text-white">{submission.landUseBeforePlantation ?? "—"}</span></div>
              <div><span className="text-gray-400">Tree Clearance Before Plantation:</span> <span className="text-white">{submission.treeClearanceBeforePlantation ?? "—"}</span></div>
              <div><span className="text-gray-400">Total Area Possessed:</span> <span className="text-white">{submission.totalAreaHectares} hectares</span></div>
              <div><span className="text-gray-400">Area Under Coconut:</span> <span className="text-white">{submission.areaUnderCoconutHectares} hectares</span></div>
              <div><span className="text-gray-400">Land Patta / Survey No.:</span> <span className="text-white">{submission.landPattaSurveyNumber ?? "—"}</span></div>
              <div><span className="text-gray-400">Mapped Area:</span> <span className="text-white">{submission.mappedAreaAcres ?? 0} acres</span></div>
            </dl>
          </div>

          {/* Location Details */}
          <div className="coconut-card rounded-lg p-4 border-green-600/50">
            <h3 className="text-sm font-semibold text-green-400 mb-3">Location Details</h3>
            <dl className="space-y-1 text-sm">
              <div><span className="text-gray-400">Village:</span> <span className="text-white">{submission.village}</span></div>
              <div><span className="text-gray-400">Block/Tehsil/Mandal:</span> <span className="text-white">{submission.blockTehsilMandal}</span></div>
              <div><span className="text-gray-400">District:</span> <span className="text-white">{submission.district}</span></div>
              <div><span className="text-gray-400">State:</span> <span className="text-white">{submission.state}</span></div>
            </dl>
          </div>

          {/* Site & Plantation Details */}
          <div className="coconut-card rounded-lg p-4 border-green-600/50">
            <h3 className="text-sm font-semibold text-green-400 mb-3">Site & Plantation Details</h3>
            <dl className="space-y-1 text-sm">
              <div><span className="text-gray-400">Burning Trees (Site Prep):</span> <span className="text-white">{submission.burningTreesForSitePreparation ?? "—"}</span></div>
              <div><span className="text-gray-400">Age of Sapling (months):</span> <span className="text-white">{submission.ageOfSaplingMonths ?? "—"}</span></div>
              <div><span className="text-gray-400">Plantation Model:</span> <span className="text-white">{submission.plantationModel ?? "—"}</span></div>
              <div><span className="text-gray-400">Source of Nursery:</span> <span className="text-white">{submission.sourceOfNursery ?? "—"}</span></div>
              <div><span className="text-gray-400">Date of Plantation:</span> <span className="text-white">{submission.dateOfPlantation ?? "—"}</span></div>
              <div><span className="text-gray-400">Type of Variety:</span> <span className="text-white">{submission.typeOfVariety ?? "—"}</span></div>
              <div><span className="text-gray-400">Spacing:</span> <span className="text-white">{submission.spacing ?? "—"}</span></div>
              <div><span className="text-gray-400">Seedlings Planted / Survived:</span> <span className="text-white">{submission.seedlingsPlanted} / {submission.seedlingsSurvived}</span></div>
              <div><span className="text-gray-400">Size of Pit:</span> <span className="text-white">{submission.sizeOfPit ?? "—"}</span></div>
              <div><span className="text-gray-400">Mode of Irrigation:</span> <span className="text-white">{submission.modeOfIrrigation ?? "—"}</span></div>
              <div><span className="text-gray-400">Kharif Crop:</span> <span className="text-white">{submission.kharifCrop ?? "—"}</span>{submission.kharifCropDurationDays != null ? ` (${submission.kharifCropDurationDays} days)` : ""}</div>
              <div><span className="text-gray-400">Rabi Crop:</span> <span className="text-white">{submission.rabiCrop ?? "—"}</span>{submission.rabiCropDurationDays != null ? ` (${submission.rabiCropDurationDays} days)` : ""}</div>
            </dl>
          </div>

          {/* Fertilizer, Cost & Expenses */}
          <div className="coconut-card rounded-lg p-4 border-green-600/50">
            <h3 className="text-sm font-semibold text-green-400 mb-3">Fertilizer (kg)</h3>
            <dl className="space-y-1 text-sm">
              <div><span className="text-gray-400">N / P / K / Organic / Other:</span></div>
              <div className="text-white">{[submission.nitrogenQtyKg, submission.phosphorousQtyKg, submission.potassiumQtyKg, submission.organicQtyKg, submission.otherQtyKg].filter((v) => v != null).length ? [submission.nitrogenQtyKg, submission.phosphorousQtyKg, submission.potassiumQtyKg, submission.organicQtyKg, submission.otherQtyKg].join(" / ") : "—"}</div>
            </dl>
            <h3 className="text-sm font-semibold text-green-400 mt-3 mb-2">Cost & Expenses</h3>
            <dl className="space-y-1 text-sm">
              <div><span className="text-gray-400">Cost of Seedlings:</span> <span className="text-white">{submission.costOfSeedlings ?? "—"}</span></div>
              <div><span className="text-gray-400">Fencing/Propping/Shading:</span> <span className="text-white">{submission.fencingProppingShading ?? "—"}</span></div>
              <div><span className="text-gray-400">Land Preparation:</span> <span className="text-white">{submission.landPreparation ?? "—"}</span></div>
              <div><span className="text-gray-400">Manure / Irrigation / Weed / Plant Protection:</span></div>
              <div className="text-white">{[submission.manureExpenses, submission.irrigationExpenses, submission.weedManagement, submission.plantProtection].filter((v) => v != null).length ? [submission.manureExpenses, submission.irrigationExpenses, submission.weedManagement, submission.plantProtection].join(" / ") : "—"}</div>
              <div><span className="text-gray-400">Annual (Fert / Irr / Manpower):</span> <span className="text-white">{[submission.annualFertilizers, submission.annualIrrigations, submission.annualManpower].filter((v) => v != null).length ? [submission.annualFertilizers, submission.annualIrrigations, submission.annualManpower].join(" / ") : "—"}</span></div>
            </dl>
          </div>

          {/* Plot Details */}
          <div className="coconut-card rounded-lg p-4 border-green-600/50 md:col-span-2">
            <h3 className="text-sm font-semibold text-green-400 mb-3">Plot Details</h3>
            <div className="flex flex-wrap gap-4">
              {(submission.plots && submission.plots.length > 0)
                ? submission.plots.map((p) => (
                    <div key={p.plotNumber} className="text-sm">
                      <span className="text-gray-400">Plot {p.plotNumber}:</span>{" "}
                      <span className="text-white">{p.areaAcres} acres</span>
                    </div>
                  ))
                : <span className="text-gray-500">No plots mapped</span>}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button
            className="bg-green-600 hover:bg-green-700 gap-2"
            onClick={() => navigate(`/coconut/register?edit=${submission.id}`)}
          >
            <Pencil className="h-4 w-4" />
            Edit Mapping
          </Button>
        </div>
      </div>
    </div>
  );
}
