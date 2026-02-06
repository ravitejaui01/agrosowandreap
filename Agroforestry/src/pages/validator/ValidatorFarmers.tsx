import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RecentRecords } from "@/components/dashboard/RecentRecords";
import { mockFarmerRecords } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function ValidatorFarmers() {
  const [search, setSearch] = useState("");

  const filteredRecords = mockFarmerRecords.filter((record) => {
    const query = search.toLowerCase();
    const fullName = `${record.firstName} ${record.lastName}`.toLowerCase();
    const farmerId = record.farmerId.toLowerCase();
    const district = record.district.toLowerCase();
    return fullName.includes(query) || farmerId.includes(query) || district.includes(query);
  });

  return (
    <DashboardLayout userRole="data_validator" userName="Mary Wanjiku">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Farmer Records</h1>
          <p className="text-muted-foreground">
            View and search all farmer submissions
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <RecentRecords
          records={filteredRecords}
          viewAllLink="/validator/farmers"
          showActions
          onView={(record) => console.log("View record:", record)}
        />
      </div>
    </DashboardLayout>
  );
}
