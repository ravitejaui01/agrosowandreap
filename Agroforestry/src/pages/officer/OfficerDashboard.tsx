import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentRecords } from "@/components/dashboard/RecentRecords";
import { WorkflowStatus } from "@/components/dashboard/WorkflowStatus";
import { mockOfficerStats, mockFarmerRecords } from "@/data/mockData";
import { FileText, Clock, CheckCircle2, XCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfficerDashboard() {
  const pendingApproval = mockFarmerRecords.filter((r) => r.status === "verified");
  const approvedRecords = mockFarmerRecords.filter((r) => r.status === "approved");

  return (
    <DashboardLayout userRole="verified_officer" userName="Peter Ochieng">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Verified Data Officer Dashboard</h1>
            <p className="text-muted-foreground">
              Final approval authority for verified records
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/officer/pending">
              <Shield className="h-4 w-4" />
              Pending Approval ({pendingApproval.length})
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Processed"
            value={mockOfficerStats.totalRecords}
            icon={FileText}
            description="All time approvals"
            variant="primary"
          />
          <StatsCard
            title="Pending Approval"
            value={mockOfficerStats.pendingReview}
            icon={Clock}
            description="Awaiting final approval"
            variant="warning"
          />
          <StatsCard
            title="Approved"
            value={mockOfficerStats.approved}
            icon={CheckCircle2}
            description="Successfully approved"
            variant="success"
            trend={{ value: 15, isPositive: true }}
          />
          <StatsCard
            title="Rejected"
            value={mockOfficerStats.rejected}
            icon={XCircle}
            description="Did not meet standards"
            variant="info"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Records */}
          <div className="lg:col-span-2">
            <RecentRecords
              records={pendingApproval.slice(0, 5)}
              viewAllLink="/officer/pending"
              showActions
              onView={(record) => console.log("View record:", record)}
            />
          </div>

          {/* Workflow Status Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sample Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowStatus currentStatus="verified" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Approval Rate</span>
                  <span className="font-semibold text-success">92.5%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Processing Time</span>
                  <span className="font-semibold">2.3 days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <span className="font-semibold text-primary">+24 approved</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
