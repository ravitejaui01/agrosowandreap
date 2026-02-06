import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RecentRecords } from "@/components/dashboard/RecentRecords";
import { mockFarmerRecords } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import type { RecordStatus } from "@/types";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RecordStatus | "all">("all");

  const filteredRecords = mockFarmerRecords.filter((record) => {
    const query = search.toLowerCase();
    const fullName = `${record.firstName} ${record.lastName}`.toLowerCase();
    const farmerId = record.farmerId.toLowerCase();
    const district = record.district.toLowerCase();
    const matchesSearch =
      fullName.includes(query) || farmerId.includes(query) || district.includes(query);
    const matchesStatus =
      statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout userRole="data_validator" userName="Mary Wanjiku">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Validator Records</h1>
          <p className="text-muted-foreground">
            View and manage records in the validation workflow
          </p>
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
        </div>

        <RecentRecords
          records={filteredRecords}
          viewAllLink="/validator/records"
          showActions
          onView={(record) => console.log("View record:", record)}
        />
      </div>
    </DashboardLayout>
  );
}
