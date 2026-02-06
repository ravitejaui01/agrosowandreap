import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentRecords } from "@/components/dashboard/RecentRecords";
import { mockAgentStats, mockFarmerRecords } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Clock, CheckCircle2, AlertTriangle, TreePine, RefreshCw, PenTool } from "lucide-react";
import { Link } from "react-router-dom";

export default function AgentDashboard() {
  const { user } = useAuth();
  const agentRecords = mockFarmerRecords.filter((r) => r.createdBy === "1");

  return (
    <DashboardLayout userName={user?.name ?? "Field Agent"}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Field Agent Dashboard</h1>
          <p className="text-muted-foreground">Track your submissions and activities</p>
        </div>

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

        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            to="/"
            className="group p-6 rounded-xl border border-border bg-card hover:border-warning/50 hover:shadow-elevated transition-all"
          >
            <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center mb-4 group-hover:bg-warning/20 transition-colors">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <h3 className="font-semibold mb-1">Pending Corrections</h3>
            <p className="text-sm text-muted-foreground">{mockAgentStats.correctionsNeeded} records need attention</p>
          </Link>
          <Link
            to="/"
            className="group p-6 rounded-xl border border-border bg-card hover:border-success/50 hover:shadow-elevated transition-all"
          >
            <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-4 group-hover:bg-success/20 transition-colors">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold mb-1">View All Submissions</h3>
            <p className="text-sm text-muted-foreground">Track all your registrations</p>
          </Link>
          <Link
            to="/coconut/entries"
            className="group p-6 rounded-xl border border-border bg-card hover:border-green-600/50 hover:shadow-elevated transition-all"
          >
            <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
              <TreePine className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-1">Coconut Plantation</h3>
            <p className="text-sm text-muted-foreground">Registration, land mapping & entries</p>
          </Link>
          <Link
            to="/recollect"
            className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-elevated transition-all"
          >
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Recollect</h3>
            <p className="text-sm text-muted-foreground">Add new recollect entry</p>
          </Link>
          <Link
            to="/signature-upload"
            className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-elevated transition-all"
          >
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <PenTool className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Signature Upload</h3>
            <p className="text-sm text-muted-foreground">Add new signature</p>
          </Link>
        </div>

        <RecentRecords records={agentRecords.slice(0, 5)} viewAllLink="/" />
      </div>
    </DashboardLayout>
  );
}
