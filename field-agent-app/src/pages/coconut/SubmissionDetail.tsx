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
            </dl>
          </div>

          {/* Land Details */}
          <div className="coconut-card rounded-lg p-4 border-green-600/50">
            <h3 className="text-sm font-semibold text-green-400 mb-3">Land Details</h3>
            <dl className="space-y-1 text-sm">
              <div><span className="text-gray-400">Total Area Possessed:</span> <span className="text-white">{submission.totalAreaHectares} hectares</span></div>
              <div><span className="text-gray-400">Area Under Coconut:</span> <span className="text-white">{submission.areaUnderCoconutHectares} hectares</span></div>
              <div><span className="text-gray-400">Mapped Area:</span> <span className="text-white">{submission.mappedAreaAcres ?? 0} acres</span></div>
            </dl>
          </div>

          {/* Location Details */}
          <div className="coconut-card rounded-lg p-4 border-green-600/50">
            <h3 className="text-sm font-semibold text-green-400 mb-3">Location Details</h3>
            <dl className="space-y-1 text-sm">
              <div><span className="text-gray-400">Village:</span> <span className="text-white">{submission.village}</span></div>
              <div><span className="text-gray-400">Block/Tehsil:</span> <span className="text-white">{submission.blockTehsilMandal}</span></div>
              <div><span className="text-gray-400">District:</span> <span className="text-white">{submission.district}</span></div>
              <div><span className="text-gray-400">State:</span> <span className="text-white">{submission.state}</span></div>
            </dl>
          </div>

          {/* Plantation Details */}
          <div className="coconut-card rounded-lg p-4 border-green-600/50">
            <h3 className="text-sm font-semibold text-green-400 mb-3">Plantation Details</h3>
            <dl className="space-y-1 text-sm">
              <div><span className="text-gray-400">Date of Plantation:</span> <span className="text-white">{submission.dateOfPlantation}</span></div>
              <div><span className="text-gray-400">Spacing:</span> <span className="text-white">{submission.spacing}</span></div>
              <div><span className="text-gray-400">Seedlings Planted:</span> <span className="text-white">{submission.seedlingsPlanted}</span></div>
              <div><span className="text-gray-400">Seedlings Survived:</span> <span className="text-white">{submission.seedlingsSurvived}</span></div>
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
