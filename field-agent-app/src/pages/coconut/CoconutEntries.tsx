import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getCoconutSubmissions } from "@/data/coconutStore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";

export default function CoconutEntries() {
  const { user } = useAuth();
  const submissions = getCoconutSubmissions(user?.id ?? "1");

  return (
    <DashboardLayout userName={user?.name ?? "Field Agent"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Coconut Plantation</h1>
          <p className="text-muted-foreground">Entries and registration</p>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Farmer Name</th>
                <th>Phone</th>
                <th>Village / District</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No entries yet.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{s.id}</td>
                    <td className="font-medium">{s.farmerName}</td>
                    <td>{s.phone}</td>
                    <td className="text-muted-foreground">{[s.village, s.district].filter(Boolean).join(", ") || "—"}</td>
                    <td className="text-muted-foreground text-sm">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/coconut/entries/${s.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
