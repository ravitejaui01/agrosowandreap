import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentRecords } from "@/components/dashboard/RecentRecords";
import { getFarmerRecords, getFarmerStats } from "@/lib/api";
import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function ValidatorDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["validator-stats"],
    queryFn: getFarmerStats,
    refetchInterval: 30000,
  });
  const { data: allRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["validator-farmer-records"],
    queryFn: () => getFarmerRecords(),
    refetchInterval: 30000, // Auto-refresh so new Coconut Registrations appear automatically
  });

  const reviewQueue = allRecords.filter(
    (r) => r.status === "submitted" || r.status === "under_review"
  );

  return (
    <DashboardLayout userRole="data_validator" userName="Mary Wanjiku">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Data Validator Dashboard</h1>
          <p className="text-muted-foreground">
            Review and validate farmer submissions
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Reviewed"
            value={statsLoading ? "…" : (stats?.totalRecords ?? 0)}
            icon={FileText}
            description="All time reviews"
            variant="primary"
          />
          <StatsCard
            title="Pending Review"
            value={statsLoading ? "…" : (stats?.pendingReview ?? 0)}
            icon={Clock}
            description="Awaiting your review"
            variant="warning"
          />
          <StatsCard
            title="Verified"
            value={statsLoading ? "…" : (stats?.approved ?? 0)}
            icon={CheckCircle2}
            description="Sent for final approval"
            variant="success"
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Corrections Requested"
            value={statsLoading ? "…" : (stats?.correctionsNeeded ?? 0)}
            icon={AlertTriangle}
            description="Sent back for corrections"
            variant="info"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            to="/validator/verified"
            className="group p-6 rounded-xl border border-border bg-card hover:border-success/50 hover:shadow-elevated transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-4 group-hover:bg-success/20 transition-colors">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-semibold mb-1">Verified Records</h3>
                <p className="text-sm text-muted-foreground">
                  View all verified submissions
                </p>
              </div>
              <span className="text-3xl font-bold text-success">
                {statsLoading ? "…" : (stats?.approved ?? 0)}
              </span>
            </div>
          </Link>
        </div>

        <RecentRecords
          records={reviewQueue.slice(0, 5)}
          viewAllLink="/validator/records"
          showActions
          onView={(record) => console.log("View record:", record)}
        />
      </div>
    </DashboardLayout>
  );
}
