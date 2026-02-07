import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, User, MapPin, FileCheck, Calendar, Leaf, IndianRupee } from "lucide-react";
import type { CoconutSubmission } from "@/types/coconut";
import { createCoconutSubmissionId, saveCoconutSubmission, saveCoconutDraft, getCoconutDraft, clearCoconutDraft } from "@/data/coconutStore";
import { CoconutMap } from "@/components/CoconutMap";
import { submitCoconutRegistration } from "@/lib/api";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Basic & Land Info", icon: User },
  { id: 2, title: "Site & Location", icon: MapPin },
  { id: 3, title: "Plantation & Crops", icon: Leaf },
  { id: 4, title: "Fertilizer & Costs", icon: IndianRupee },
  { id: 5, title: "Land Mapping", icon: MapPin },
  { id: 6, title: "Review & Submit", icon: FileCheck },
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
    activeStatus: "active",
    landOwnership: "",
    landUseBeforePlantation: "",
    treeClearanceBeforePlantation: "",
    burningTreesForSitePreparation: "",
    ageOfSaplingMonths: undefined,
    landPattaSurveyNumber: "",
    plantationModel: "",
    sourceOfNursery: "",
    totalAreaHectares: 0,
    areaUnderCoconutHectares: 0,
    numberOfPlots: 0,
    district: "",
    blockTehsilMandal: "",
    village: "",
    dateOfPlantation: "",
    typeOfVariety: "",
    spacing: "",
    seedlingsPlanted: 0,
    seedlingsSurvived: 0,
    sizeOfPit: "",
    modeOfIrrigation: "",
    kharifCrop: "",
    kharifCropDurationDays: undefined,
    rabiCrop: "",
    rabiCropDurationDays: undefined,
    nitrogenQtyKg: undefined,
    phosphorousQtyKg: undefined,
    potassiumQtyKg: undefined,
    organicQtyKg: undefined,
    otherQtyKg: undefined,
    costOfSeedlings: undefined,
    fencingProppingShading: undefined,
    landPreparation: undefined,
    manureExpenses: undefined,
    irrigationExpenses: undefined,
    weedManagement: undefined,
    plantProtection: undefined,
    agricultureImplements: undefined,
    manpowerExpenses: undefined,
    annualFertilizers: undefined,
    annualIrrigations: undefined,
    annualManpower: undefined,
    plots: [],
    createdAt: new Date().toISOString(),
    createdBy: user?.id ?? "1",
  });

  const update = (key: keyof CoconutSubmission, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Restore draft on mount (auto-saved earlier)
  useEffect(() => {
    const draft = getCoconutDraft();
    if (draft && typeof draft === "object" && Object.keys(draft).length > 0) {
      setForm((prev) => ({ ...prev, ...draft }));
      const stepNum = typeof (draft as { _draftStep?: number })._draftStep === "number"
        ? (draft as { _draftStep: number })._draftStep
        : 1;
      setStep(Math.min(Math.max(1, stepNum), 6));
    }
  }, []);

  // Auto-save draft when form or step changes (debounced)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    draftTimerRef.current && clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveCoconutDraft({ ...form, _draftStep: step });
    }, 800);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [form, step]);

  const handleNext = async () => {
    if (step < 6) setStep(step + 1);
    else {
      const full: CoconutSubmission = {
        ...form,
        id: form.id!,
        farmerName: form.farmerName ?? "",
        phone: form.phone ?? "",
        aadhaar: form.aadhaar ?? "",
        agentName: form.agentName ?? agentName,
        activeStatus: form.activeStatus,
        landOwnership: form.landOwnership,
        landUseBeforePlantation: form.landUseBeforePlantation,
        treeClearanceBeforePlantation: form.treeClearanceBeforePlantation,
        burningTreesForSitePreparation: form.burningTreesForSitePreparation,
        ageOfSaplingMonths: form.ageOfSaplingMonths,
        landPattaSurveyNumber: form.landPattaSurveyNumber,
        plantationModel: form.plantationModel,
        sourceOfNursery: form.sourceOfNursery,
        totalAreaHectares: Number(form.totalAreaHectares) || 0,
        areaUnderCoconutHectares: Number(form.areaUnderCoconutHectares) || 0,
        numberOfPlots: Number(form.numberOfPlots) || 0,
        state: form.state ?? "Karnataka",
        district: form.district ?? "",
        blockTehsilMandal: form.blockTehsilMandal ?? "",
        village: form.village ?? "",
        dateOfPlantation: form.dateOfPlantation ?? "",
        typeOfVariety: form.typeOfVariety,
        spacing: form.spacing ?? "",
        seedlingsPlanted: Number(form.seedlingsPlanted) || 0,
        seedlingsSurvived: Number(form.seedlingsSurvived) || 0,
        sizeOfPit: form.sizeOfPit,
        modeOfIrrigation: form.modeOfIrrigation,
        kharifCrop: form.kharifCrop,
        kharifCropDurationDays: form.kharifCropDurationDays,
        rabiCrop: form.rabiCrop,
        rabiCropDurationDays: form.rabiCropDurationDays,
        nitrogenQtyKg: form.nitrogenQtyKg,
        phosphorousQtyKg: form.phosphorousQtyKg,
        potassiumQtyKg: form.potassiumQtyKg,
        organicQtyKg: form.organicQtyKg,
        otherQtyKg: form.otherQtyKg,
        costOfSeedlings: form.costOfSeedlings,
        fencingProppingShading: form.fencingProppingShading,
        landPreparation: form.landPreparation,
        manureExpenses: form.manureExpenses,
        irrigationExpenses: form.irrigationExpenses,
        weedManagement: form.weedManagement,
        plantProtection: form.plantProtection,
        agricultureImplements: form.agricultureImplements,
        manpowerExpenses: form.manpowerExpenses,
        annualFertilizers: form.annualFertilizers,
        annualIrrigations: form.annualIrrigations,
        annualManpower: form.annualManpower,
        plots: form.plots ?? [],
        createdAt: form.createdAt ?? new Date().toISOString(),
        createdBy: form.createdBy ?? user?.id ?? "1",
      };
      setSubmitting(true);
      try {
        const payload = { ...full } as Record<string, unknown>;
        delete payload._draftStep; // draft-only, not sent to API
        const result = await submitCoconutRegistration(payload as CoconutSubmission) as { _savedTo?: string };
        if (result._savedTo === "fallback") {
          toast.error("Record was not saved to the database. It will not appear in Data Validator. Set DATABASE_PUBLIC_URL on the API (e.g. Railway Variables) and try again.");
          setSubmitting(false);
          return;
        }
        saveCoconutSubmission(payload as CoconutSubmission);
        clearCoconutDraft();
        toast.success("Registration completed. Record saved to database and will appear in Data Validator Farmer Records.");
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
              Step {step} of {STEPS.length} — {STEPS[step - 1].title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Information & Land Information */}
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Basic Information</h3>
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
                      <Label htmlFor="activeStatus">Active Status</Label>
                      <Select value={form.activeStatus ?? "active"} onValueChange={(v) => update("activeStatus", v)}>
                        <SelectTrigger id="activeStatus"><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agentName">Agent Name</Label>
                      <Input
                        id="agentName"
                        value={form.agentName ?? agentName}
                        onChange={(e) => update("agentName", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-4">Land Information</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Land Ownership</Label>
                      <Select value={form.landOwnership ?? ""} onValueChange={(v) => update("landOwnership", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="own">Own</SelectItem>
                          <SelectItem value="Leased">Leased</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Land Use Before Plantation</Label>
                      <Select value={form.landUseBeforePlantation ?? ""} onValueChange={(v) => update("landUseBeforePlantation", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Agriculture">Agriculture</SelectItem>
                          <SelectItem value="Forestry">Forestry</SelectItem>
                          <SelectItem value="Degraded Land">Degraded Land</SelectItem>
                          <SelectItem value="Agriculture fallow">Agriculture fallow</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Any Tree Clearance Before Plantation</Label>
                      <Select value={form.treeClearanceBeforePlantation ?? ""} onValueChange={(v) => update("treeClearanceBeforePlantation", v)}>
                        <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Site & Location Information */}
            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Site Preparation</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Burning of Trees for Site Preparation</Label>
                      <Select value={form.burningTreesForSitePreparation ?? ""} onValueChange={(v) => update("burningTreesForSitePreparation", v)}>
                        <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ageSapling">Age of Sapling (months)</Label>
                      <Input
                        id="ageSapling"
                        type="number"
                        placeholder="months"
                        value={form.ageOfSaplingMonths ?? ""}
                        onChange={(e) => update("ageOfSaplingMonths", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalArea">Total Area Possessed (Hectares) *</Label>
                      <Input
                        id="totalArea"
                        type="number"
                        placeholder="hectares"
                        value={form.totalAreaHectares || ""}
                        onChange={(e) => update("totalAreaHectares", e.target.value ? Number(e.target.value) : 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coconutArea">Total Area Under Coconut (Hectares) *</Label>
                      <Input
                        id="coconutArea"
                        type="number"
                        placeholder="hectares"
                        value={form.areaUnderCoconutHectares || ""}
                        onChange={(e) => update("areaUnderCoconutHectares", e.target.value ? Number(e.target.value) : 0)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="landPatta">Land Patta / Survey Number</Label>
                      <Input
                        id="landPatta"
                        placeholder="Enter land patta or survey number"
                        value={form.landPattaSurveyNumber ?? ""}
                        onChange={(e) => update("landPattaSurveyNumber", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-4">Location Information</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
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
                      <Label htmlFor="block">Block / Tehsil / Mandal *</Label>
                      <Input
                        id="block"
                        placeholder="Enter block/tehsil/mandal"
                        value={form.blockTehsilMandal ?? ""}
                        onChange={(e) => update("blockTehsilMandal", e.target.value)}
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
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={form.state ?? "Karnataka"}
                        onChange={(e) => update("state", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-4">Plantation Details</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="plantationModel">Plantation Model</Label>
                      <Input
                        id="plantationModel"
                        placeholder="Type or model of plantation"
                        value={form.plantationModel ?? ""}
                        onChange={(e) => update("plantationModel", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sourceNursery">Source of Nursery</Label>
                      <Input
                        id="sourceNursery"
                        placeholder="Where saplings were obtained"
                        value={form.sourceOfNursery ?? ""}
                        onChange={(e) => update("sourceOfNursery", e.target.value)}
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
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Plantation & Crop Information */}
            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Planting Details</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
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
                      <Label htmlFor="typeVariety">Type of Variety</Label>
                      <Input
                        id="typeVariety"
                        placeholder="Coconut variety"
                        value={form.typeOfVariety ?? ""}
                        onChange={(e) => update("typeOfVariety", e.target.value)}
                      />
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
                      <Label htmlFor="seedlingsPlanted">No. of Seedlings Planted *</Label>
                      <Input
                        id="seedlingsPlanted"
                        type="number"
                        placeholder="Number planted"
                        value={form.seedlingsPlanted || ""}
                        onChange={(e) => update("seedlingsPlanted", e.target.value ? Number(e.target.value) : 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seedlingsSurvived">No. of Seedlings Survived *</Label>
                      <Input
                        id="seedlingsSurvived"
                        type="number"
                        placeholder="Number survived"
                        value={form.seedlingsSurvived || ""}
                        onChange={(e) => update("seedlingsSurvived", e.target.value ? Number(e.target.value) : 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sizeOfPit">Size of Pit</Label>
                      <Input
                        id="sizeOfPit"
                        placeholder="e.g., 1m x 1m"
                        value={form.sizeOfPit ?? ""}
                        onChange={(e) => update("sizeOfPit", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mode of Irrigation</Label>
                      <Select value={form.modeOfIrrigation ?? ""} onValueChange={(v) => update("modeOfIrrigation", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Borewell">Borewell</SelectItem>
                          <SelectItem value="Sprinkler">Sprinkler</SelectItem>
                          <SelectItem value="Drip & Irrigation">Drip & Irrigation</SelectItem>
                          <SelectItem value="Canal">Canal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-4">Crop Information</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="kharifCrop">Kharif Crop</Label>
                      <Input
                        id="kharifCrop"
                        placeholder="Crop name"
                        value={form.kharifCrop ?? ""}
                        onChange={(e) => update("kharifCrop", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kharifDuration">Kharif Crop Duration (days)</Label>
                      <Input
                        id="kharifDuration"
                        type="number"
                        placeholder="days"
                        value={form.kharifCropDurationDays ?? ""}
                        onChange={(e) => update("kharifCropDurationDays", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rabiCrop">Rabi Crop</Label>
                      <Input
                        id="rabiCrop"
                        placeholder="Crop name"
                        value={form.rabiCrop ?? ""}
                        onChange={(e) => update("rabiCrop", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rabiDuration">Rabi Crop Duration (days)</Label>
                      <Input
                        id="rabiDuration"
                        type="number"
                        placeholder="days"
                        value={form.rabiCropDurationDays ?? ""}
                        onChange={(e) => update("rabiCropDurationDays", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Fertilizer, Cost & Expenses */}
            {step === 4 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Fertilizer Information (quantity in kg)</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nitrogenQty">Nitrogen Fertilizer (kg)</Label>
                      <Input
                        id="nitrogenQty"
                        type="number"
                        placeholder="kg"
                        value={form.nitrogenQtyKg ?? ""}
                        onChange={(e) => update("nitrogenQtyKg", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phosphorousQty">Phosphorous Fertilizer (kg)</Label>
                      <Input
                        id="phosphorousQty"
                        type="number"
                        placeholder="kg"
                        value={form.phosphorousQtyKg ?? ""}
                        onChange={(e) => update("phosphorousQtyKg", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="potassiumQty">Potassium Fertilizer (kg)</Label>
                      <Input
                        id="potassiumQty"
                        type="number"
                        placeholder="kg"
                        value={form.potassiumQtyKg ?? ""}
                        onChange={(e) => update("potassiumQtyKg", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organicQty">Organic Fertilizer (kg)</Label>
                      <Input
                        id="organicQty"
                        type="number"
                        placeholder="kg"
                        value={form.organicQtyKg ?? ""}
                        onChange={(e) => update("organicQtyKg", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otherQty">Other Fertilizers (kg)</Label>
                      <Input
                        id="otherQty"
                        type="number"
                        placeholder="kg"
                        value={form.otherQtyKg ?? ""}
                        onChange={(e) => update("otherQtyKg", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-4">Cost Information</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="costSeedlings">Cost of Seedlings</Label>
                      <Input
                        id="costSeedlings"
                        type="number"
                        placeholder="Amount"
                        value={form.costOfSeedlings ?? ""}
                        onChange={(e) => update("costOfSeedlings", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fencingPropping">Fencing / Propping / Shading</Label>
                      <Input
                        id="fencingPropping"
                        type="number"
                        placeholder="Amount"
                        value={form.fencingProppingShading ?? ""}
                        onChange={(e) => update("fencingProppingShading", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="landPrep">Land Preparation</Label>
                      <Input
                        id="landPrep"
                        type="number"
                        placeholder="Amount"
                        value={form.landPreparation ?? ""}
                        onChange={(e) => update("landPreparation", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-4">Expenses</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="manureExp">Manure Expenses</Label>
                      <Input id="manureExp" type="number" placeholder="Amount" value={form.manureExpenses ?? ""} onChange={(e) => update("manureExpenses", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="irrigationExp">Irrigation Expenses</Label>
                      <Input id="irrigationExp" type="number" placeholder="Amount" value={form.irrigationExpenses ?? ""} onChange={(e) => update("irrigationExpenses", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weedMgmt">Weed Management</Label>
                      <Input id="weedMgmt" type="number" placeholder="Amount" value={form.weedManagement ?? ""} onChange={(e) => update("weedManagement", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plantProt">Plant Protection</Label>
                      <Input id="plantProt" type="number" placeholder="Amount" value={form.plantProtection ?? ""} onChange={(e) => update("plantProtection", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agriImpl">Agriculture Implements</Label>
                      <Input id="agriImpl" type="number" placeholder="Amount" value={form.agricultureImplements ?? ""} onChange={(e) => update("agricultureImplements", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manpowerExp">Manpower Expenses</Label>
                      <Input id="manpowerExp" type="number" placeholder="Amount" value={form.manpowerExpenses ?? ""} onChange={(e) => update("manpowerExpenses", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                  </div>
                  <h4 className="text-sm font-medium mt-4 mb-2">Annual Expenses</h4>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="annualFert">Annual Fertilizers</Label>
                      <Input id="annualFert" type="number" placeholder="Amount" value={form.annualFertilizers ?? ""} onChange={(e) => update("annualFertilizers", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualIrr">Annual Irrigations</Label>
                      <Input id="annualIrr" type="number" placeholder="Amount" value={form.annualIrrigations ?? ""} onChange={(e) => update("annualIrrigations", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualMan">Annual Manpower</Label>
                      <Input id="annualMan" type="number" placeholder="Amount" value={form.annualManpower ?? ""} onChange={(e) => update("annualManpower", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Land Mapping */}
            {step === 5 && (
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
                onBack={() => setStep(4)}
                onGoToReview={() => setStep(6)}
              />
            )}

            {/* Step 6: Review & Submit */}
            {step === 6 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Review your entry before submitting.</p>
                <p className="text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2 border border-border">
                  Your progress is saved as a draft on this device. When you click <strong>Submit Registration</strong> below, this data will be sent to the server and saved to <strong>coconut_submissions</strong> (and will appear in Coconut Entries and Data Validator).
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Farmer Name</span>
                  <span className="font-medium">{form.farmerName || "—"}</span>
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{form.phone || "—"}</span>
                  <span className="text-muted-foreground">Aadhaar</span>
                  <span className="font-medium">{form.aadhaar || "—"}</span>
                  <span className="text-muted-foreground">Active Status</span>
                  <span className="font-medium">{form.activeStatus || "—"}</span>
                  <span className="text-muted-foreground">Land Ownership</span>
                  <span className="font-medium">{form.landOwnership || "—"}</span>
                  <span className="text-muted-foreground">Land Use Before Plantation</span>
                  <span className="font-medium">{form.landUseBeforePlantation || "—"}</span>
                  <span className="text-muted-foreground">Tree Clearance Before Plantation</span>
                  <span className="font-medium">{form.treeClearanceBeforePlantation || "—"}</span>
                  <span className="text-muted-foreground">Burning Trees (Site Prep)</span>
                  <span className="font-medium">{form.burningTreesForSitePreparation || "—"}</span>
                  <span className="text-muted-foreground">Age of Sapling (months)</span>
                  <span className="font-medium">{form.ageOfSaplingMonths ?? "—"}</span>
                  <span className="text-muted-foreground">Total Area (ha)</span>
                  <span className="font-medium">{form.totalAreaHectares || "—"}</span>
                  <span className="text-muted-foreground">Area under coconut (ha)</span>
                  <span className="font-medium">{form.areaUnderCoconutHectares || "—"}</span>
                  <span className="text-muted-foreground">Land Patta / Survey No.</span>
                  <span className="font-medium">{form.landPattaSurveyNumber || "—"}</span>
                  <span className="text-muted-foreground">Village / Block / District / State</span>
                  <span className="font-medium">
                    {[form.village, form.blockTehsilMandal, form.district, form.state].filter(Boolean).join(", ") || "—"}
                  </span>
                  <span className="text-muted-foreground">Plantation Model</span>
                  <span className="font-medium">{form.plantationModel || "—"}</span>
                  <span className="text-muted-foreground">Source of Nursery</span>
                  <span className="font-medium">{form.sourceOfNursery || "—"}</span>
                  <span className="text-muted-foreground">Plots</span>
                  <span className="font-medium">{form.numberOfPlots ?? "—"}</span>
                  <span className="text-muted-foreground">Date of Plantation</span>
                  <span className="font-medium">{form.dateOfPlantation || "—"}</span>
                  <span className="text-muted-foreground">Type of Variety</span>
                  <span className="font-medium">{form.typeOfVariety || "—"}</span>
                  <span className="text-muted-foreground">Spacing</span>
                  <span className="font-medium">{form.spacing || "—"}</span>
                  <span className="text-muted-foreground">Seedlings Planted / Survived</span>
                  <span className="font-medium">
                    {form.seedlingsPlanted} / {form.seedlingsSurvived}
                  </span>
                  <span className="text-muted-foreground">Size of Pit</span>
                  <span className="font-medium">{form.sizeOfPit || "—"}</span>
                  <span className="text-muted-foreground">Mode of Irrigation</span>
                  <span className="font-medium">{form.modeOfIrrigation || "—"}</span>
                  <span className="text-muted-foreground">Kharif Crop / Duration (days)</span>
                  <span className="font-medium">{form.kharifCrop || "—"} {form.kharifCropDurationDays != null ? ` / ${form.kharifCropDurationDays}` : ""}</span>
                  <span className="text-muted-foreground">Rabi Crop / Duration (days)</span>
                  <span className="font-medium">{form.rabiCrop || "—"} {form.rabiCropDurationDays != null ? ` / ${form.rabiCropDurationDays}` : ""}</span>
                  <span className="text-muted-foreground">Fertilizer (N/P/K/Org/Other kg)</span>
                  <span className="font-medium">
                    {[form.nitrogenQtyKg, form.phosphorousQtyKg, form.potassiumQtyKg, form.organicQtyKg, form.otherQtyKg].filter((v) => v != null).length
                      ? [form.nitrogenQtyKg, form.phosphorousQtyKg, form.potassiumQtyKg, form.organicQtyKg, form.otherQtyKg].join(" / ")
                      : "—"}
                  </span>
                  <span className="text-muted-foreground">Cost (Seedlings / Fencing / Land prep)</span>
                  <span className="font-medium">
                    {[form.costOfSeedlings, form.fencingProppingShading, form.landPreparation].some((v) => v != null)
                      ? [form.costOfSeedlings, form.fencingProppingShading, form.landPreparation].join(" / ")
                      : "—"}
                  </span>
                  <span className="text-muted-foreground">Expenses (Manure / Irrigation / Weed / etc.)</span>
                  <span className="font-medium">
                    {[form.manureExpenses, form.irrigationExpenses, form.weedManagement].some((v) => v != null)
                      ? "Entered"
                      : "—"}
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
            {submitting ? "Submitting…" : step === 6 ? "Submit Registration" : "Next"}
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
