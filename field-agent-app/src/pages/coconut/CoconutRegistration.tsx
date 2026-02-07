import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, User, MapPin, FileCheck, Calendar } from "lucide-react";
import type { CoconutSubmission } from "@/types/coconut";
import { createCoconutSubmissionId, saveCoconutSubmission } from "@/data/coconutStore";
import { CoconutMap } from "@/components/CoconutMap";
import { submitCoconutRegistration } from "@/lib/api";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Farmer Details", icon: User },
  { id: 2, title: "Land Mapping", icon: MapPin },
  { id: 3, title: "Review & Submit", icon: FileCheck },
];

export default function CoconutRegistration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const agentName = user?.name ?? "Agent";
  const [form, setForm] = useState<Partial<CoconutSubmission>>({
    id: createCoconutSubmissionId(),
    agentName,
    state: "Karnataka",
    farmerName: "",
    phone: "",
    aadhaar: "",
    totalAreaHectares: 0,
    areaUnderCoconutHectares: 0,
    numberOfPlots: 0,
    district: "",
    blockTehsilMandal: "",
    village: "",
    dateOfPlantation: "",
    spacing: "",
    seedlingsPlanted: 0,
    seedlingsSurvived: 0,
    plots: [],
    createdAt: new Date().toISOString(),
    createdBy: user?.id ?? "1",
  });

  const update = (key: keyof CoconutSubmission, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = async () => {
    if (step < 3) setStep(step + 1);
    else {
      const full: CoconutSubmission = {
        ...form,
        id: form.id!,
        farmerName: form.farmerName ?? "",
        phone: form.phone ?? "",
        aadhaar: form.aadhaar ?? "",
        agentName: form.agentName ?? agentName,
        totalAreaHectares: Number(form.totalAreaHectares) || 0,
        areaUnderCoconutHectares: Number(form.areaUnderCoconutHectares) || 0,
        numberOfPlots: Number(form.numberOfPlots) || 0,
        state: form.state ?? "Karnataka",
        district: form.district ?? "",
        blockTehsilMandal: form.blockTehsilMandal ?? "",
        village: form.village ?? "",
        dateOfPlantation: form.dateOfPlantation ?? "",
        spacing: form.spacing ?? "",
        seedlingsPlanted: Number(form.seedlingsPlanted) || 0,
        seedlingsSurvived: Number(form.seedlingsSurvived) || 0,
        plots: form.plots ?? [],
        createdAt: form.createdAt ?? new Date().toISOString(),
        createdBy: form.createdBy ?? user?.id ?? "1",
      };
      setSubmitting(true);
      try {
        await submitCoconutRegistration({
          id: full.id,
          farmerName: full.farmerName,
          phone: full.phone,
          aadhaar: full.aadhaar,
          agentName: full.agentName,
          totalAreaHectares: full.totalAreaHectares,
          areaUnderCoconutHectares: full.areaUnderCoconutHectares,
          numberOfPlots: full.numberOfPlots,
          state: full.state,
          district: full.district,
          blockTehsilMandal: full.blockTehsilMandal,
          village: full.village,
          dateOfPlantation: full.dateOfPlantation,
          spacing: full.spacing,
          seedlingsPlanted: full.seedlingsPlanted,
          seedlingsSurvived: full.seedlingsSurvived,
          plots: full.plots,
          mappedAreaAcres: form.mappedAreaAcres,
          location: form.location,
          createdBy: full.createdBy,
        });
        saveCoconutSubmission(full);
        toast.success("Registration completed. Record will appear in Data Validator.");
        navigate("/coconut/entries");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to submit. Try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <DashboardLayout userName={user?.name ?? "Field Agent"}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/coconut/entries">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Coconut Plantation Registration</h1>
            <p className="text-muted-foreground">Complete all steps to submit registration</p>
          </div>
        </div>

        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                    step > s.id
                      ? "bg-success text-success-foreground"
                      : step === s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <s.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 font-medium hidden sm:block ${
                    step >= s.id ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-8 sm:w-16 mx-2 ${
                    step > s.id ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step - 1].title}</CardTitle>
            <CardDescription>
              Step {step} of {STEPS.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Farmer Details */}
            {step === 1 && (
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="farmerName">Farmer Name *</Label>
                  <Input
                    id="farmerName"
                    placeholder="Enter full name"
                    value={form.farmerName ?? ""}
                    onChange={(e) => update("farmerName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="Enter 10-digit number"
                    value={form.phone ?? ""}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadhaar">Aadhaar Number *</Label>
                  <Input
                    id="aadhaar"
                    placeholder="Enter 12-digit Aadhaar number"
                    value={form.aadhaar ?? ""}
                    onChange={(e) => update("aadhaar", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agentName">Agent Name</Label>
                  <Input
                    id="agentName"
                    value={form.agentName ?? agentName}
                    onChange={(e) => update("agentName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalArea">Total Area Possessed (Hectares) *</Label>
                  <Input
                    id="totalArea"
                    type="number"
                    placeholder="Enter area in hectares"
                    value={form.totalAreaHectares || ""}
                    onChange={(e) => update("totalAreaHectares", e.target.value ? Number(e.target.value) : 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coconutArea">Total Area Under Coconut (Hectares) *</Label>
                  <Input
                    id="coconutArea"
                    type="number"
                    placeholder="Enter area in hectares"
                    value={form.areaUnderCoconutHectares || ""}
                    onChange={(e) => update("areaUnderCoconutHectares", e.target.value ? Number(e.target.value) : 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numPlots">Number of Plots *</Label>
                  <Input
                    id="numPlots"
                    type="number"
                    placeholder="Enter number of plots"
                    value={form.numberOfPlots || ""}
                    onChange={(e) => update("numberOfPlots", e.target.value ? Number(e.target.value) : 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={form.state ?? "Karnataka"}
                    onChange={(e) => update("state", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District *</Label>
                  <Input
                    id="district"
                    placeholder="Enter district"
                    value={form.district ?? ""}
                    onChange={(e) => update("district", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="block">Block/Tehsil/Mandal *</Label>
                  <Input
                    id="block"
                    placeholder="Enter block/tehsil/mandal"
                    value={form.blockTehsilMandal ?? ""}
                    onChange={(e) => update("blockTehsilMandal", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="village">Village *</Label>
                  <Input
                    id="village"
                    placeholder="Enter village"
                    value={form.village ?? ""}
                    onChange={(e) => update("village", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="datePlantation">Date of Plantation *</Label>
                  <div className="relative">
                    <Input
                      id="datePlantation"
                      type="date"
                      value={form.dateOfPlantation ?? ""}
                      onChange={(e) => update("dateOfPlantation", e.target.value)}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spacing">Spacing (m x m)</Label>
                  <Input
                    id="spacing"
                    placeholder="e.g., 7*7"
                    value={form.spacing ?? ""}
                    onChange={(e) => update("spacing", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seedlingsPlanted">Number of Seedlings Planted *</Label>
                  <Input
                    id="seedlingsPlanted"
                    type="number"
                    placeholder="Enter number of seedlings"
                    value={form.seedlingsPlanted || ""}
                    onChange={(e) => update("seedlingsPlanted", e.target.value ? Number(e.target.value) : 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seedlingsSurvived">Number of Seedlings Survived *</Label>
                  <Input
                    id="seedlingsSurvived"
                    type="number"
                    placeholder="Enter number survived"
                    value={form.seedlingsSurvived || ""}
                    onChange={(e) => update("seedlingsSurvived", e.target.value ? Number(e.target.value) : 0)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Land Mapping */}
            {step === 2 && (
              <LandMappingStep
                form={form}
                update={update}
                onLocateMe={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (p) =>
                        update("location", {
                          lat: p.coords.latitude,
                          lng: p.coords.longitude,
                          accuracy: p.coords.accuracy ?? undefined,
                        }),
                      () => toast.error("Could not get location")
                    );
                  } else toast.error("Geolocation not supported");
                }}
                onBack={() => setStep(1)}
                onGoToReview={() => setStep(3)}
              />
            )}

            {/* Step 3: Review & Submit */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Review your entry before submitting.</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Farmer Name</span>
                  <span className="font-medium">{form.farmerName || "—"}</span>
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{form.phone || "—"}</span>
                  <span className="text-muted-foreground">Aadhaar</span>
                  <span className="font-medium">{form.aadhaar || "—"}</span>
                  <span className="text-muted-foreground">Total Area (ha)</span>
                  <span className="font-medium">{form.totalAreaHectares || "—"}</span>
                  <span className="text-muted-foreground">Area under coconut (ha)</span>
                  <span className="font-medium">{form.areaUnderCoconutHectares || "—"}</span>
                  <span className="text-muted-foreground">Plots</span>
                  <span className="font-medium">{form.numberOfPlots || "—"}</span>
                  <span className="text-muted-foreground">Village / District / State</span>
                  <span className="font-medium">
                    {[form.village, form.district, form.state].filter(Boolean).join(", ") || "—"}
                  </span>
                  <span className="text-muted-foreground">Date of Plantation</span>
                  <span className="font-medium">{form.dateOfPlantation || "—"}</span>
                  <span className="text-muted-foreground">Seedlings Planted / Survived</span>
                  <span className="font-medium">
                    {form.seedlingsPlanted} / {form.seedlingsSurvived}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button onClick={handleNext} disabled={submitting} className="gap-2">
            {submitting ? "Submitting…" : step === 3 ? "Submit Registration" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function LandMappingStep({
  form,
  update,
  onLocateMe,
  onBack,
  onGoToReview,
}: {
  form: Partial<CoconutSubmission>;
  update: (key: keyof CoconutSubmission, value: unknown) => void;
  onLocateMe: () => void;
  onBack: () => void;
  onGoToReview: () => void;
}) {
  const numPlots = Math.max(1, Number(form.numberOfPlots) || 1);
  const [currentPlot, setCurrentPlot] = useState(1);
  const [lastDrawnArea, setLastDrawnArea] = useState<number | null>(null);
  const [lastDrawnLatlngs, setLastDrawnLatlngs] = useState<[number, number][] | null>(null);
  const [drawKey, setDrawKey] = useState(0);
  const [triggerPolygonDraw, setTriggerPolygonDraw] = useState(0);

  const plots = form.plots ?? [];

  const addPlot = () => {
    const area = lastDrawnArea ?? 0;
    if (area <= 0) return;
    const newPlots = [
      ...plots.filter((p) => p.plotNumber !== currentPlot),
      {
        plotNumber: currentPlot,
        areaAcres: area,
        latlngs: lastDrawnLatlngs ?? undefined,
      },
    ].sort((a, b) => a.plotNumber - b.plotNumber);
    update("plots", newPlots);
    const mapped = newPlots.reduce((s, p) => s + p.areaAcres, 0);
    update("mappedAreaAcres", mapped);
    setLastDrawnArea(null);
    setLastDrawnLatlngs(null);
    if (currentPlot < numPlots) setCurrentPlot(currentPlot + 1);
  };

  const handleClear = () => {
    setDrawKey((k) => k + 1);
    setLastDrawnArea(null);
    setLastDrawnLatlngs(null);
  };

  const displayArea = lastDrawnArea != null ? lastDrawnArea : (form.mappedAreaAcres ?? 0);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Map: full width, no overlay on top so clicks reach map */}
      <div className="flex-1 w-full min-h-[400px] rounded-lg border border-border overflow-hidden bg-muted/20 relative">
        <CoconutMap
          location={form.location}
          className="w-full"
          drawKey={drawKey}
          loadPolygonLatlngs={undefined}
          loadPolygonKey={0}
          triggerPolygonDraw={triggerPolygonDraw}
          onDrawModeActive={() =>
            toast.success("Draw mode on — click on the map to add corners. Double-click to finish.")
          }
          onPolygonCreated={(areaAcres, latlngs) => {
            setLastDrawnArea(areaAcres);
            setLastDrawnLatlngs(latlngs.map((ll) => [ll.lat, ll.lng] as [number, number]));
          }}
        />
        {/* Mapped Area overlay - bottom-left on map (does not block map; small box) */}
        <div className="absolute bottom-2 left-2 z-[1000] rounded-md bg-black/80 text-white px-3 py-2 text-sm shadow-lg pointer-events-none">
          <div className="font-medium">Mapped Area</div>
          <div className="text-xs opacity-90">Area (acres): {displayArea.toFixed(2)}</div>
        </div>
      </div>

      {/* Land Mapping panel - right side (reference layout) */}
      <div className="w-full lg:w-64 shrink-0 rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Land Mapping</h3>
        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={onLocateMe}>
          Locate Me
        </Button>
        <Button
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => {
            setTriggerPolygonDraw((t) => t + 1);
            toast.info("Starting draw mode…");
          }}
        >
          Start
        </Button>
        <p className="text-xs text-muted-foreground">
          Finish: Click map to draw. Double-click or click first point to finish.
        </p>
        <Button size="sm" variant="outline" className="w-full" onClick={handleClear}>
          Clear
        </Button>
        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={onGoToReview}>
          Submit Registration
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Plot {Math.min(plots.length + 1, numPlots)} of {numPlots}
        </p>
        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={addPlot}>
          Save Plot
        </Button>
        <Button size="sm" variant="outline" className="w-full opacity-60" disabled onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
