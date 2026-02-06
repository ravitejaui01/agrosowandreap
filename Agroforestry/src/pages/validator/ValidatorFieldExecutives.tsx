import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { mockUsers, mockFarmerRecords } from "@/data/mockData";
import { User } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Users, Clock, CheckCircle2 } from "lucide-react";

type FieldExecutiveWithStats = User & {
  totalSubmissions: number;
  pendingReview: number;
  verified: number;
};

export default function ValidatorFieldExecutives() {
  const fieldExecutives = useMemo(() => {
    const agents = mockUsers.filter((u) => u.role === "field_agent");
    return agents.map((agent) => {
      const submissions = mockFarmerRecords.filter((r) => r.createdBy === agent.id);
      const pendingReview = submissions.filter(
        (r) => r.status === "submitted" || r.status === "under_review"
      ).length;
      const verified = submissions.filter(
        (r) => r.status === "verified" || r.status === "approved"
      ).length;
      return {
        ...agent,
        totalSubmissions: submissions.length,
        pendingReview,
        verified,
      } as FieldExecutiveWithStats;
    });
  }, []);

  return (
    <DashboardLayout userRole="data_validator" userName="Mary Wanjiku">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Field Executives</h1>
          <p className="text-muted-foreground">
            View field agents and their submission statistics
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fieldExecutives.map((executive) => (
            <Card key={executive.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {executive.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{executive.name}</p>
                    <p className="text-xs text-muted-foreground">{executive.email}</p>
                    <Badge variant="secondary" className="mt-1 gap-1">
                      <UserCheck className="h-3 w-3" />
                      Field Executive
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Total submissions
                  </span>
                  <span className="font-medium">{executive.totalSubmissions}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Pending review
                  </span>
                  <span className="font-medium text-warning">{executive.pendingReview}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    Verified
                  </span>
                  <span className="font-medium text-success">{executive.verified}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {fieldExecutives.length === 0 && (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
            No field executives found
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
