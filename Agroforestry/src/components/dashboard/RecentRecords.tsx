import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/ui/status-badge";
import { FarmerRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, Trash2 } from "lucide-react";

interface RecentRecordsProps {
  records: FarmerRecord[];
  viewAllLink: string;
  showActions?: boolean;
  onView?: (record: FarmerRecord) => void;
  onRemove?: (record: FarmerRecord) => void;
}

export function RecentRecords({ records, viewAllLink, showActions = false, onView, onRemove }: RecentRecordsProps) {
  return (
    <div className="rounded-xl border border-border bg-card animate-fade-in">
      <div className="flex items-center justify-between p-6 pb-4">
        <h3 className="text-lg font-semibold">Recent Records</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to={viewAllLink} className="gap-1">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Farmer ID</th>
              <th>Name</th>
              <th>District</th>
              <th>Status</th>
              <th>Date</th>
              {showActions && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td className="font-mono text-xs">{record.farmerId}</td>
                <td className="font-medium">
                  {record.firstName || record.first_name} {record.lastName || record.last_name}
                </td>
                <td className="text-muted-foreground">{record.district}</td>
                <td>
                  <StatusBadge status={record.status} />
                </td>
                <td className="text-muted-foreground text-sm">
                  {new Date(record.createdAt).toLocaleDateString()}
                </td>
                {showActions && (
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView?.(record)}
                      className="mr-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove?.(record)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={showActions ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
