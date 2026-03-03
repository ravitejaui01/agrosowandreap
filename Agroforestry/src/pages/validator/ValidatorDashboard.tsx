import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { getFarmerRecordsFromSupabase, clearAllFarmerRecords } from "@/lib/supabase";
import { FileText, Clock, CheckCircle2, AlertTriangle, Users, TrendingUp, Activity, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye } from "lucide-react";
import { useState, useMemo } from "react";

export default function ValidatorDashboard() {
  // Load removed record IDs from localStorage on component mount
  const [removedRecordIds, setRemovedRecordIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('removedValidatorRecords');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Clear all records on fresh deployment
  const clearAllRecords = async () => {
    // Clear localStorage
    localStorage.removeItem('removedValidatorRecords');
    setRemovedRecordIds(new Set());
    
    // Clear Supabase data
    try {
      const result = await clearAllFarmerRecords();
      if (result.ok) {
        // Refetch data to update the UI
        window.location.reload();
      } else {
        console.error("Failed to clear Supabase records:", result.error);
      }
    } catch (error) {
      console.error("Error clearing records:", error);
    }
  };

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["validator-farmer-records"],
    queryFn: () => getFarmerRecordsFromSupabase(),
    refetchInterval: 30000,
  });

  // Filter out removed records
  const visibleRecords = useMemo(() => {
    return records.filter(record => !removedRecordIds.has(record.id));
  }, [records, removedRecordIds]);

  // Calculate stats from visible records instead of API stats
  const calculatedStats = useMemo(() => {
    const totalRecords = visibleRecords.length;
    const pendingReview = visibleRecords.filter(r => r.status === 'submitted' || r.status === 'under_review').length;
    const approved = visibleRecords.filter(r => r.status === 'approved').length;
    const rejected = visibleRecords.filter(r => r.status === 'rejected').length;
    const correctionsNeeded = visibleRecords.filter(r => r.status === 'corrections_needed').length;
    
    return {
      totalRecords,
      pendingReview,
      approved,
      rejected,
      correctionsNeeded
    };
  }, [visibleRecords]);

  // Calculate additional stats
  const recentSubmissions = visibleRecords.slice(0, 5);
  const completionRate = calculatedStats.totalRecords > 0 
    ? Math.round((calculatedStats.approved / calculatedStats.totalRecords) * 100) 
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
            <Button variant="outline" onClick={clearAllRecords} className="gap-2">
              <Activity className="h-4 w-4" />
              Reset Values
            </Button>
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
            value={recordsLoading ? "…" : calculatedStats.totalRecords}
            icon={FileText}
            description="All time reviews"
            variant="primary"
          />
          <StatsCard
            title="Pending Review"
            value={recordsLoading ? "…" : calculatedStats.pendingReview}
            icon={Clock}
            description="Awaiting your review"
            variant="warning"
          />
          <StatsCard
            title="Verified"
            value={recordsLoading ? "…" : calculatedStats.approved}
            icon={CheckCircle2}
            description="Sent for final approval"
            variant="success"
            trend={{ value: completionRate, isPositive: true }}
          />
          <StatsCard
            title="Corrections Requested"
            value={recordsLoading ? "…" : calculatedStats.correctionsNeeded}
            icon={AlertTriangle}
            description="Sent back for corrections"
            variant="info"
          />
        </div>

        {/* Quick Actions Card Only */}
        <div className="grid sm:grid-cols-1 gap-6">
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

        {/* Pending Review Card Only */}
        <div className="grid sm:grid-cols-1 gap-6">
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
                {recordsLoading ? "…" : calculatedStats.pendingReview}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
