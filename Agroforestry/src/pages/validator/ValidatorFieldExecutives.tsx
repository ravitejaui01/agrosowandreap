import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { User } from "@/types";
import { getUsers, getFarmerRecords } from "@/lib/api";
import { getCoconutPlantationsFromSupabase } from "@/lib/supabase";
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
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });
  const { data: records = [] } = useQuery({
    queryKey: ["validator-farmer-records"],
    queryFn: () => getFarmerRecords(),
  });
  const { data: coconutPlantations = [] } = useQuery({
    queryKey: ["coconut-plantations-supabase"],
    queryFn: () => getCoconutPlantationsFromSupabase(),
  });

  const fieldExecutives = useMemo(() => {
    // Get unique agent names from coconut plantation data (this matches the Agent column in Farmer Records)
    const uniqueAgents = [...new Set(
      coconutPlantations
        .map(p => p.agent_name)
        .filter(name => name && name.trim() !== "")
    )];

    // Debug: Log agent data
    if (import.meta.env.DEV) {
      console.log("[ValidatorFieldExecutives] Coconut plantations:", coconutPlantations.length);
      console.log("[ValidatorFieldExecutives] Unique agents from data:", uniqueAgents);
      console.log("[ValidatorFieldExecutives] All users:", users.map(u => ({ id: u.id, name: u.name, role: u.role })));
    }
    
    // Create field executive objects from agent names
    const agents = uniqueAgents.map(agentName => {
      // Find matching user by name
      const matchingUser = users.find(u => 
        u.name.toLowerCase() === agentName.toLowerCase() ||
        u.name.toLowerCase().includes(agentName.toLowerCase()) ||
        agentName.toLowerCase().includes(u.name.toLowerCase())
      );
      
      // Calculate stats from coconut plantation data
      const agentSubmissions = coconutPlantations.filter(p => p.agent_name === agentName);
      const totalSubmissions = agentSubmissions.length;
      
      // For coconut data, we'll calculate completion status based on document completeness
      const completedSubmissions = agentSubmissions.filter(p => {
        // Check if record has all required documents (similar to ValidatorFarmers logic)
        const hasAadhaar = p.aadhaar && String(p.aadhaar).trim() !== "";
        const hasAgreement = p.agreement_url && String(p.agreement_url).trim() !== "";
        const hasRTC = p.land_patta_survey_number && String(p.land_patta_survey_number).trim() !== "";
        const hasBank = p.bank_account && String(p.bank_account).trim() !== "";
        return hasAadhaar && hasAgreement && hasRTC && hasBank;
      }).length;
      
      const pendingReview = totalSubmissions - completedSubmissions;
      
      return {
        id: matchingUser?.id || `agent-${agentName}`,
        name: agentName,
        email: matchingUser?.email || "no-email@found.com",
        role: "field_agent" as any,
        totalSubmissions,
        pendingReview,
        verified: completedSubmissions,
      } as FieldExecutiveWithStats;
    });
    
    // Debug: Log final agents
    if (import.meta.env.DEV) {
      console.log("[ValidatorFieldExecutives] Final agents:", agents.map(a => ({ name: a.name, total: a.totalSubmissions, pending: a.pendingReview, verified: a.verified })));
    }
    
    return agents;
  }, [users, records, coconutPlantations]);

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
