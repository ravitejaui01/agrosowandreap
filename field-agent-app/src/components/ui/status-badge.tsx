import { cn } from "@/lib/utils";
import type { RecordStatus } from "@/types";

interface StatusBadgeProps {
  status: RecordStatus;
  className?: string;
}

const statusConfig: Record<RecordStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  submitted: { label: "Submitted", className: "bg-info/15 text-info border-info/30" },
  under_review: { label: "Under Review", className: "bg-pending/15 text-pending border-pending/30" },
  corrections_needed: { label: "Corrections Needed", className: "bg-warning/15 text-warning border-warning/30" },
  verified: { label: "Verified", className: "bg-primary/15 text-primary border-primary/30" },
  approved: { label: "Approved", className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", config.className, className)}>
      {config.label}
    </span>
  );
}
