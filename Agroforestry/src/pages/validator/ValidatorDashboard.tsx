import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentRecords } from "@/components/dashboard/RecentRecords";
import { mockValidatorStats, mockFarmerRecords } from "@/data/mockData";
import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function ValidatorDashboard() {
  const reviewQueue = mockFarmerRecords.filter(
    (r) => r.status === "submitted" || r.status === "under_review"
  );

  return (
    <DashboardLayout userRole="data_validator" userName="Mary Wanjiku">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Data Validator Dashboard</h1>
          <p className="text-muted-foreground">
            Review and validate farmer submissions
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Reviewed"
            value={mockValidatorStats.totalRecords}
            icon={FileText}
            description="All time reviews"
            variant="primary"
          />
          <StatsCard
            title="Pending Review"
            value={mockValidatorStats.pendingReview}
            icon={Clock}
            description="Awaiting your review"
            variant="warning"
          />
          <StatsCard
            title="Verified"
            value={mockValidatorStats.approved}
            icon={CheckCircle2}
            description="Sent for final approval"
            variant="success"
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Corrections Requested"
            value={mockValidatorStats.correctionsNeeded}
            icon={AlertTriangle}
            description="Sent back for corrections"
            variant="info"
          />
        </div>

        {/* Quick Actions */}
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
              <span className="text-3xl font-bold text-success">{mockValidatorStats.approved}</span>
            </div>
          </Link>
        </div>

        {/* Recent Records */}
        <RecentRecords
          records={reviewQueue.slice(0, 5)}
          viewAllLink="/validator/farmers"
          showActions
          onView={(record) => console.log("View record:", record)}
        />
      </div>
    </DashboardLayout>
  );
}
