import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentRecords } from "@/components/dashboard/RecentRecords";
import { mockAgentStats, mockFarmerRecords } from "@/data/mockData";
import { FileText, Clock, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AgentDashboard() {
  const agentRecords = mockFarmerRecords.filter((r) => r.createdBy === "1");

  return (
    <DashboardLayout userRole="field_agent" userName="John Kimani">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Field Agent Dashboard</h1>
            <p className="text-muted-foreground">
              Register farmers and track your submissions
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/agent/register">
              <Plus className="h-4 w-4" />
              Register New Farmer
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Submissions"
            value={mockAgentStats.totalRecords}
            icon={FileText}
            description="All time registrations"
            variant="primary"
          />
          <StatsCard
            title="Pending Review"
            value={mockAgentStats.pendingReview}
            icon={Clock}
            description="Awaiting validation"
            variant="warning"
          />
          <StatsCard
            title="Approved"
            value={mockAgentStats.approved}
            icon={CheckCircle2}
            description="Successfully verified"
            variant="success"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Corrections Needed"
            value={mockAgentStats.correctionsNeeded}
            icon={AlertTriangle}
            description="Requires attention"
            variant="info"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            to="/agent/register"
            className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-elevated transition-all"
          >
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">New Registration</h3>
            <p className="text-sm text-muted-foreground">Start a new farmer registration</p>
          </Link>
          <Link
            to="/agent/submissions"
            className="group p-6 rounded-xl border border-border bg-card hover:border-warning/50 hover:shadow-elevated transition-all"
          >
            <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center mb-4 group-hover:bg-warning/20 transition-colors">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <h3 className="font-semibold mb-1">Pending Corrections</h3>
            <p className="text-sm text-muted-foreground">{mockAgentStats.correctionsNeeded} records need attention</p>
          </Link>
          <Link
            to="/agent/submissions"
            className="group p-6 rounded-xl border border-border bg-card hover:border-success/50 hover:shadow-elevated transition-all"
          >
            <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-4 group-hover:bg-success/20 transition-colors">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold mb-1">View All Submissions</h3>
            <p className="text-sm text-muted-foreground">Track all your registrations</p>
          </Link>
        </div>

        {/* Recent Records */}
        <RecentRecords
          records={agentRecords.slice(0, 5)}
          viewAllLink="/agent/submissions"
        />
      </div>
    </DashboardLayout>
  );
}
