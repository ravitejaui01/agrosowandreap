import { cn } from "@/lib/utils";
import { Check, Clock, AlertCircle, XCircle } from "lucide-react";
import { RecordStatus } from "@/types";

interface WorkflowStep {
  status: RecordStatus;
  label: string;
  description: string;
}

interface WorkflowStatusProps {
  currentStatus: RecordStatus;
  className?: string;
}

const workflowSteps: WorkflowStep[] = [
  { status: "submitted", label: "Submitted", description: "Record submitted by field agent" },
  { status: "under_review", label: "Under Review", description: "Being reviewed by validator" },
  { status: "verified", label: "Verified", description: "Verified by data validator" },
  { status: "approved", label: "Approved", description: "Final approval by officer" },
];

const statusOrder: Record<RecordStatus, number> = {
  draft: 0,
  submitted: 1,
  under_review: 2,
  corrections_needed: 2,
  verified: 3,
  approved: 4,
  rejected: -1,
};

export function WorkflowStatus({ currentStatus, className }: WorkflowStatusProps) {
  const currentOrder = statusOrder[currentStatus];
  const isRejected = currentStatus === "rejected";
  const needsCorrection = currentStatus === "corrections_needed";

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-muted-foreground">Workflow Progress</h3>
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-4">
          {workflowSteps.map((step, index) => {
            const stepOrder = statusOrder[step.status];
            const isComplete = currentOrder > stepOrder;
            const isCurrent = currentOrder === stepOrder;
            const isPending = currentOrder < stepOrder;

            return (
              <div key={step.status} className="relative flex gap-4">
                {/* Status indicator */}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    isComplete && "bg-success border-success text-success-foreground",
                    isCurrent && !isRejected && !needsCorrection && "bg-primary border-primary text-primary-foreground",
                    isCurrent && needsCorrection && "bg-warning border-warning text-warning-foreground",
                    isPending && "bg-background border-border text-muted-foreground",
                    isRejected && isCurrent && "bg-destructive border-destructive text-destructive-foreground"
                  )}
                >
                  {isComplete && <Check className="h-4 w-4" />}
                  {isCurrent && !isRejected && !needsCorrection && <Clock className="h-4 w-4" />}
                  {isCurrent && needsCorrection && <AlertCircle className="h-4 w-4" />}
                  {isCurrent && isRejected && <XCircle className="h-4 w-4" />}
                  {isPending && <span className="text-xs font-medium">{index + 1}</span>}
                </div>

                {/* Step content */}
                <div className="flex-1 pb-4">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      (isComplete || isCurrent) ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                    {isCurrent && needsCorrection && " - Corrections Needed"}
                    {isCurrent && isRejected && " - Rejected"}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
