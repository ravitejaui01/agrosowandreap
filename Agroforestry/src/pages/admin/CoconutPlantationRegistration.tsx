import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerCoconutPlantation } from "@/lib/api";
import type { CoconutSubmission } from "@/types";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const defaultForm: Partial<CoconutSubmission> = {
  farmerName: "",
  phone: "",
  aadhaar: "",
  agentName: "Administrator",
  totalAreaHectares: 0,
  areaUnderCoconutHectares: 0,
  numberOfPlots: 0,
  state: "",
  district: "",
  blockTehsilMandal: "",
  village: "",
  dateOfPlantation: "",
  spacing: "",
  seedlingsPlanted: 0,
  seedlingsSurvived: 0,
  plots: [],
  createdBy: "admin",
};

export default function CoconutPlantationRegistration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<CoconutSubmission>>(defaultForm);

  const update = (key: keyof CoconutSubmission, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const mutation = useMutation({
    mutationFn: () =>
      registerCoconutPlantation({
        ...form,
        farmerName: form.farmerName ?? "",
        agentName: form.agentName ?? "Administrator",
        totalAreaHectares: Number(form.totalAreaHectares) || 0,
        areaUnderCoconutHectares: Number(form.areaUnderCoconutHectares) || 0,
        numberOfPlots: Number(form.numberOfPlots) || 0,
        state: form.state ?? "",
        district: form.district ?? "",
        blockTehsilMandal: form.blockTehsilMandal ?? "",
        village: form.village ?? "",
        dateOfPlantation: form.dateOfPlantation ?? "",
        spacing: form.spacing ?? "",
        seedlingsPlanted: Number(form.seedlingsPlanted) || 0,
        seedlingsSurvived: Number(form.seedlingsSurvived) || 0,
        plots: form.plots ?? [],
        createdBy: form.createdBy ?? "admin",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coconut-plantations"] });
      queryClient.invalidateQueries({ queryKey: ["coconut-plantations-stats"] });
      toast.success("Coconut plantation registration submitted.");
      navigate("/admin/coconut");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Submission failed.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.farmerName?.trim()) {
      toast.error("Farmer name is required.");
      return;
    }
    mutation.mutate();
  };

  return (
    <DashboardLayout userRole="admin" userName="Administrator">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/coconut">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Coconut Plantation Registration</h1>
            <p className="text-muted-foreground">Register a new coconut plantation</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Farmer & location</CardTitle>
              <CardDescription>Basic details and location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="farmerName">Farmer name *</Label>
                  <Input
                    id="farmerName"
                    value={form.farmerName ?? ""}
                    onChange={(e) => update("farmerName", e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone ?? ""}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aadhaar">Aadhaar</Label>
                <Input
                  id="aadhaar"
                  value={form.aadhaar ?? ""}
                  onChange={(e) => update("aadhaar", e.target.value)}
                  placeholder="Aadhaar number"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={form.state ?? ""}
                    onChange={(e) => update("state", e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={form.district ?? ""}
                    onChange={(e) => update("district", e.target.value)}
                    placeholder="District"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="blockTehsilMandal">Block / Tehsil / Mandal</Label>
                  <Input
                    id="blockTehsilMandal"
                    value={form.blockTehsilMandal ?? ""}
                    onChange={(e) => update("blockTehsilMandal", e.target.value)}
                    placeholder="Block / Tehsil / Mandal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="village">Village</Label>
                  <Input
                    id="village"
                    value={form.village ?? ""}
                    onChange={(e) => update("village", e.target.value)}
                    placeholder="Village"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Plantation details</CardTitle>
              <CardDescription>Area and planting information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="totalAreaHectares">Total area (ha)</Label>
                  <Input
                    id="totalAreaHectares"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.totalAreaHectares ?? ""}
                    onChange={(e) =>
                      update("totalAreaHectares", e.target.value ? Number(e.target.value) : 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaUnderCoconutHectares">Area under coconut (ha)</Label>
                  <Input
                    id="areaUnderCoconutHectares"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.areaUnderCoconutHectares ?? ""}
                    onChange={(e) =>
                      update("areaUnderCoconutHectares", e.target.value ? Number(e.target.value) : 0)
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="numberOfPlots">Number of plots</Label>
                  <Input
                    id="numberOfPlots"
                    type="number"
                    min={0}
                    value={form.numberOfPlots ?? ""}
                    onChange={(e) =>
                      update("numberOfPlots", e.target.value ? Number(e.target.value) : 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfPlantation">Date of plantation</Label>
                  <Input
                    id="dateOfPlantation"
                    type="date"
                    value={form.dateOfPlantation ?? ""}
                    onChange={(e) => update("dateOfPlantation", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="spacing">Spacing</Label>
                  <Input
                    id="spacing"
                    value={form.spacing ?? ""}
                    onChange={(e) => update("spacing", e.target.value)}
                    placeholder="e.g. 7.5m x 7.5m"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seedlingsPlanted">Seedlings planted</Label>
                  <Input
                    id="seedlingsPlanted"
                    type="number"
                    min={0}
                    value={form.seedlingsPlanted ?? ""}
                    onChange={(e) =>
                      update("seedlingsPlanted", e.target.value ? Number(e.target.value) : 0)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seedlingsSurvived">Seedlings survived</Label>
                <Input
                  id="seedlingsSurvived"
                  type="number"
                  min={0}
                  value={form.seedlingsSurvived ?? ""}
                  onChange={(e) =>
                    update("seedlingsSurvived", e.target.value ? Number(e.target.value) : 0)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex gap-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Submit registration"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/coconut">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
