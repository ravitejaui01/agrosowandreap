import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RecentRecords } from "@/components/dashboard/RecentRecords";
import { getFarmerRecordsFromSupabase, deleteFarmerRecord } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { RecordStatus, FarmerRecord } from "@/types";

const STATUS_OPTIONS: { value: RecordStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "corrections_needed", label: "Corrections Needed" },
  { value: "verified", label: "Verified" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function ValidatorRecords() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RecordStatus | "all">("all");
  
  // Load removed record IDs from localStorage on component mount
  const [removedRecordIds, setRemovedRecordIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('removedValidatorRecords');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Function to update removed records and save to localStorage
  const addToRemovedRecords = (recordId: string) => {
    setRemovedRecordIds(prev => {
      const newSet = new Set(prev);
      newSet.add(recordId);
      // Save to localStorage
      localStorage.setItem('removedValidatorRecords', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["validator-farmer-records"],
    queryFn: () => getFarmerRecordsFromSupabase(),
    refetchInterval: 30000, // Auto-refresh every 30s so new Coconut Registrations appear automatically
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFarmerRecord,
    onSuccess: () => {
      toast.success("Record removed successfully");
      queryClient.invalidateQueries({ queryKey: ["validator-farmer-records"] });
    },
    onError: (error) => {
      toast.error(`Failed to remove record: ${error.message}`);
    },
  });

  const handleRemoveRecord = async (record: FarmerRecord) => {
    if (window.confirm(`Are you sure you want to remove the record for ${record.firstName} ${record.lastName}?`)) {
      await deleteMutation.mutateAsync(record.id);
      // Add to removed records and save to localStorage
      addToRemovedRecords(record.id);
    }
  };

  const removeTestRecords = async () => {
    if (window.confirm("Are you sure you want to remove all test records? This action cannot be undone.")) {
      // Filter for test records (assuming test records have some identifiable pattern)
      const testRecords = records.filter(record => 
        record.firstName?.toLowerCase().includes("test") ||
        record.lastName?.toLowerCase().includes("test") ||
        record.farmerId?.toLowerCase().includes("test")
      );
      
      // Delete each test record
      for (const record of testRecords) {
        await deleteMutation.mutateAsync(record.id);
      }
      
      // Add all test record IDs to removed set and localStorage
      setRemovedRecordIds(prev => {
        const newSet = new Set(prev);
        testRecords.forEach(record => newSet.add(record.id));
        // Save to localStorage
        localStorage.setItem('removedValidatorRecords', JSON.stringify([...newSet]));
        return newSet;
      });
      
      if (testRecords.length > 0) {
        toast.success(`Removed ${testRecords.length} test records`);
      } else {
        toast.info("No test records found");
      }
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // Skip records that have been removed from the UI
      if (removedRecordIds.has(record.id)) return false;
      
      const query = search.toLowerCase();
      const fullName = `${record.firstName ?? ""} ${record.lastName ?? ""}`.toLowerCase();
      const farmerId = (record.farmerId ?? "").toLowerCase();
      const district = (record.district ?? "").toLowerCase();
      const matchesSearch =
        fullName.includes(query) || farmerId.includes(query) || district.includes(query);
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter, removedRecordIds]);

  const recordCounts = useMemo(() => {
    const visibleRecords = records.filter(r => !removedRecordIds.has(r.id));
    const submitted = visibleRecords.filter(r => r.status === "submitted").length;
    const draft = visibleRecords.filter(r => r.status === "draft").length;
    return { submitted, incomplete: draft, total: visibleRecords.length };
  }, [records, removedRecordIds]);

  return (
    <DashboardLayout userRole="data_validator" userName="Mary Wanjiku">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Validator Records</h1>
          <p className="text-muted-foreground">
            View and manage records in the validation workflow
          </p>
        </div>

        {/* Record Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Incomplete</p>
                <p className="text-2xl font-bold text-orange-600">{recordCounts.incomplete}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-orange-600"></div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold text-blue-600">{recordCounts.submitted}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold text-gray-600">{recordCounts.total}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-gray-600"></div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Filtered</p>
                <p className="text-2xl font-bold text-green-600">{filteredRecords.length}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-green-600"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as RecordStatus | "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            onClick={removeTestRecords}
            disabled={deleteMutation.isPending}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {deleteMutation.isPending ? "Removing..." : "Remove Test Records"}
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Loading records…
          </div>
        ) : (
          <RecentRecords
            records={filteredRecords}
            viewAllLink="/validator/records"
            showActions
            onView={(record) => navigate(`/validator/farmers/coconut/${record.farmerId}`)}
            onRemove={handleRemoveRecord}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
