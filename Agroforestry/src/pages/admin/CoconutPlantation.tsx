import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCoconutPlantations,
  getCoconutPlantationStats,
} from "@/lib/api";
import { Plus } from "lucide-react";

export default function CoconutPlantation() {
  const { data: list = [], isLoading: listLoading } = useQuery({
    queryKey: ["coconut-plantations"],
    queryFn: getCoconutPlantations,
  });
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["coconut-plantations-stats"],
    queryFn: getCoconutPlantationStats,
  });

  return (
    <DashboardLayout userRole="admin" userName="Administrator">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Coconut Plantation</h1>
            <p className="text-muted-foreground">
              View and manage all coconut plantation registrations
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/coconut/register">
              <Plus className="h-4 w-4 mr-2" />
              Coconut Plantation Registration
            </Link>
          </Button>
        </div>

        {statsLoading ? null : stats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Plantations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_plantations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Area (ha)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(stats.total_area_hectares).toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Seedlings Planted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_seedlings_planted}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Seedlings Survived
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_seedlings_survived}</div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>All registrations</CardTitle>
            <CardDescription>List of coconut plantation submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : list.length === 0 ? (
              <p className="text-muted-foreground">
                No coconut plantations yet.{" "}
                <Link to="/admin/coconut/register" className="text-primary underline">
                  Register one
                </Link>
                .
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium">Farmer</th>
                      <th className="text-left py-3 font-medium">District / Village</th>
                      <th className="text-left py-3 font-medium">Area (ha)</th>
                      <th className="text-left py-3 font-medium">Plots</th>
                      <th className="text-left py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-3">
                          <div className="font-medium">{row.farmerName}</div>
                          {row.phone && (
                            <div className="text-muted-foreground text-xs">{row.phone}</div>
                          )}
                        </td>
                        <td className="py-3">
                          {row.district}
                          {row.village ? ` / ${row.village}` : ""}
                        </td>
                        <td className="py-3">
                          {row.areaUnderCoconutHectares != null
                            ? Number(row.areaUnderCoconutHectares).toFixed(2)
                            : "—"}
                        </td>
                        <td className="py-3">{row.numberOfPlots ?? "—"}</td>
                        <td className="py-3 text-muted-foreground">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
