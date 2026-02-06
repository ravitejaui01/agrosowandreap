import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DeploymentMap } from "@/components/map/DeploymentMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getBiocharDeployments,
  saveBiocharDeployment,
} from "@/data/biocharStore";
import type { BiocharDeployment } from "@/types";
import { toast } from "sonner";
import L from "leaflet";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";

const defaultCenter: [number, number] = [17.4239, 78.4245];

export default function BiocharDeploymentTracking() {
  const [deployments, setDeployments] = useState<BiocharDeployment[]>(() =>
    getBiocharDeployments()
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    siteName: "",
    district: "",
    village: "",
    deploymentDate: new Date().toISOString().slice(0, 10),
    quantityTonnes: "" as number | "",
    notes: "",
  });
  const [drawnAreaAcres, setDrawnAreaAcres] = useState<number | null>(null);
  const [drawnLatlngs, setDrawnLatlngs] = useState<[number, number][] | null>(
    null
  );
  const [drawKey, setDrawKey] = useState(0);
  const [loadPolygonKey, setLoadPolygonKey] = useState(0);
  const [loadPolygonLatlngs, setLoadPolygonLatlngs] = useState<
    [number, number][] | undefined
  >(undefined);

  const resetForm = () => {
    setForm({
      siteName: "",
      district: "",
      village: "",
      deploymentDate: new Date().toISOString().slice(0, 10),
      quantityTonnes: "",
      notes: "",
    });
    setDrawnAreaAcres(null);
    setDrawnLatlngs(null);
    setDrawKey((k) => k + 1);
    setLoadPolygonLatlngs(undefined);
    setLoadPolygonKey((k) => k + 1);
    setEditingId(null);
  };

  const triggerDrawPolygon = () => {
    const polygonBtn = document.querySelector(
      ".leaflet-draw-draw-polygon"
    ) as HTMLElement | null;
    if (polygonBtn) {
      polygonBtn.click();
      toast.success(
        "Draw mode on — click on the map to add corners. Double-click to finish."
      );
    } else {
      toast.info("Map is loading. Try again in a moment.");
    }
  };

  const handleStartEditing = () => {
    triggerDrawPolygon();
    setTimeout(triggerDrawPolygon, 200);
  };

  const handleEditDragPolygon = () => {
    const editBtn = document.querySelector(
      ".leaflet-draw-edit-edit"
    ) as HTMLElement | null;
    if (editBtn && !editBtn.classList.contains("leaflet-disabled")) {
      editBtn.click();
      toast.success(
        "Edit mode — click the red polygon to select it, then drag corners or drag the polygon to move it."
      );
    } else {
      toast.info("Draw a polygon first, or the map is still loading.");
    }
  };

  const handlePolygonCreated = (areaAcres: number, latlngs: L.LatLng[]) => {
    setDrawnAreaAcres(areaAcres);
    setDrawnLatlngs(
      latlngs.map((ll) => [ll.lat, ll.lng] as [number, number])
    );
  };

  const handleSave = () => {
    if (!form.siteName.trim()) {
      toast.error("Enter site name.");
      return;
    }
    const areaAcres = drawnAreaAcres ?? 0;
    const id =
      editingId ?? `bc-${Date.now()}`;
    saveBiocharDeployment({
      id,
      siteName: form.siteName.trim(),
      district: form.district.trim() || "—",
      village: form.village.trim() || undefined,
      deploymentDate: form.deploymentDate,
      quantityTonnes:
        form.quantityTonnes === "" ? undefined : Number(form.quantityTonnes),
      areaAcres,
      latlngs: drawnLatlngs ?? undefined,
      notes: form.notes.trim() || undefined,
      createdBy: "admin",
    });
    setDeployments(getBiocharDeployments());
    toast.success(editingId ? "Deployment updated." : "Deployment saved.");
    resetForm();
  };

  const handleEdit = (d: BiocharDeployment) => {
    setEditingId(d.id);
    setForm({
      siteName: d.siteName,
      district: d.district,
      village: d.village ?? "",
      deploymentDate: d.deploymentDate,
      quantityTonnes: d.quantityTonnes ?? "",
      notes: d.notes ?? "",
    });
    setDrawnAreaAcres(d.areaAcres);
    setDrawnLatlngs(d.latlngs ?? null);
    setLoadPolygonLatlngs(d.latlngs);
    setLoadPolygonKey((k) => k + 1);
  };

  const handleDelete = (id: string) => {
    const next = deployments.filter((d) => d.id !== id);
    setDeployments(next);
    try {
      localStorage.setItem(
        "agroforestry_biochar_deployments",
        JSON.stringify(next)
      );
    } catch (_) {}
    if (editingId === id) resetForm();
    toast.success("Deployment removed.");
  };

  return (
    <DashboardLayout userRole="admin" userName="Sarah Muthoni">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Biochar Deployment Tracking</h1>
          <p className="text-muted-foreground">
            Record deployment locations and draw areas on the map
          </p>
        </div>

        {/* Deployment Details — form + map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Deployment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <h4 className="font-semibold text-sm mb-2">
                How to draw and drag the red polygon
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside max-w-2xl">
                <li>
                  Click <strong className="text-foreground">Draw polygon</strong> below, then <strong className="text-foreground">click on the map</strong> for each corner (at least 3). <strong className="text-foreground">Double-click</strong> to close the shape.
                </li>
                <li>
                  To move or reshape: click <strong className="text-foreground">Edit / drag polygon</strong>, then click your red polygon. <strong className="text-foreground">Drag the white/red circles</strong> to move corners, or <strong className="text-foreground">drag the polygon</strong> to move it.
                </li>
                <li>Enter site details and click Save Deployment.</li>
              </ol>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site name *</Label>
                    <Input
                      id="siteName"
                      value={form.siteName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, siteName: e.target.value }))
                      }
                      placeholder="e.g. North Block A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deploymentDate">Date</Label>
                    <Input
                      id="deploymentDate"
                      type="date"
                      value={form.deploymentDate}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          deploymentDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      value={form.district}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, district: e.target.value }))
                      }
                      placeholder="e.g. Guntur"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="village">Village</Label>
                    <Input
                      id="village"
                      value={form.village}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, village: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantityTonnes">Quantity (tonnes)</Label>
                  <Input
                    id="quantityTonnes"
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.quantityTonnes === "" ? "" : form.quantityTonnes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        quantityTonnes:
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value),
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Drawn area (acres)</Label>
                  <p className="text-sm font-medium">
                    {drawnAreaAcres != null
                      ? drawnAreaAcres.toFixed(3)
                      : "— Draw on map"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Optional"
                    rows={2}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleStartEditing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Draw polygon
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEditDragPolygon}
                  >
                    Edit / drag polygon
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDrawKey((k) => k + 1);
                      setDrawnAreaAcres(null);
                      setDrawnLatlngs(null);
                    }}
                  >
                    Clear map
                  </Button>
                  <Button type="button" onClick={handleSave}>
                    Save Deployment
                  </Button>
                  {editingId && (
                    <Button type="button" variant="ghost" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deployment area — draw or edit with the buttons below</Label>
                <DeploymentMap
                  center={defaultCenter}
                  zoom={13}
                  onPolygonCreated={handlePolygonCreated}
                  drawKey={drawKey}
                  loadPolygonLatlngs={loadPolygonLatlngs}
                  loadPolygonKey={loadPolygonKey}
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStartEditing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Draw polygon
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleEditDragPolygon}
                  >
                    Edit / drag polygon
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDrawKey((k) => k + 1);
                      setDrawnAreaAcres(null);
                      setDrawnLatlngs(null);
                    }}
                  >
                    Clear map
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* List of deployments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Saved Deployments ({deployments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deployments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No deployments yet. Fill Deployment Details above and save.
              </p>
            ) : (
              <div className="space-y-2">
                {deployments.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="font-medium">{d.siteName}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.district}
                        {d.village ? ` · ${d.village}` : ""} · {d.deploymentDate} · {d.areaAcres.toFixed(2)} acres
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(d)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(d.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
