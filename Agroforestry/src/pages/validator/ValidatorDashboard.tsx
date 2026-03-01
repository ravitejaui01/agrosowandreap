import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { getFarmerStats, getFarmerRecords } from "@/lib/api";
import { FileText, Clock, CheckCircle2, AlertTriangle, Users, TrendingUp, Activity, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye } from "lucide-react";

export default function ValidatorDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["validator-stats"],
    queryFn: getFarmerStats,
    refetchInterval: 30000,
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["validator-farmer-records"],
    queryFn: () => getFarmerRecords(),
    refetchInterval: 30000,
  });

  // Calculate additional stats
  const recentSubmissions = records.slice(0, 5);
  const completionRate = stats?.totalRecords > 0 
    ? Math.round(((stats?.approved ?? 0) / stats?.totalRecords) * 100) 
    : 0;

  return (
    <DashboardLayout userRole="data_validator" userName="Mary Wanjiku">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Validator Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Review and validate farmer submissions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/validator/records" className="gap-2">
                <Eye className="h-4 w-4" />
                View All Records
              </Link>
            </Button>
            <Button asChild>
              <Link to="/validator/farmers" className="gap-2">
                <FileText className="h-4 w-4" />
                Farmer Records
              </Link>
            </Button>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            trend={{ value: completionRate, isPositive: true }}
          />
          <StatsCard
            title="Corrections Requested"
            value={statsLoading ? "…" : (stats?.correctionsNeeded ?? 0)}
            icon={AlertTriangle}
            description="Sent back for corrections"
            variant="info"
          />
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recordsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : recentSubmissions.length > 0 ? (
                  recentSubmissions.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{record.firstName} {record.lastName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(record.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={record.status === 'submitted' ? 'default' : 'secondary'}>
                        {record.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">No recent submissions</div>
                )}
              </div>
              {recentSubmissions.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link to="/validator/records" className="gap-1">
                      View all activity
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-success" />
                Verification Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <div className="text-2xl font-bold text-success">{stats?.approved ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <div className="text-2xl font-bold text-destructive">{stats?.rejected ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-success h-2 rounded-full transition-all" 
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/validator/farmers" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Farmer Records
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/validator/field-executives" className="gap-2">
                  <Users className="h-4 w-4" />
                  Field Executives
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/validator/records" className="gap-2">
                  <Eye className="h-4 w-4" />
                  All Records
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Verified Records Card */}
        <div className="grid sm:grid-cols-2 gap-6">
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
                  View all verified submissions ready for final approval
                </p>
              </div>
              <span className="text-3xl font-bold text-success">
                {statsLoading ? "…" : (stats?.approved ?? 0)}
              </span>
            </div>
          </Link>

          <Link
            to="/validator/records"
            className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-elevated transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Pending Review</h3>
                <p className="text-sm text-muted-foreground">
                  Review and validate pending submissions
                </p>
              </div>
              <span className="text-3xl font-bold text-primary">
                {statsLoading ? "…" : (stats?.pendingReview ?? 0)}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
