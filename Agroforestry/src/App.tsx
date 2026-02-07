import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ValidatorProtectedRoute } from "@/components/ValidatorProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ValidatorLogin from "./pages/ValidatorLogin";

// Validator Pages
import ValidatorDashboard from "./pages/validator/ValidatorDashboard";
import ValidatorFarmers from "./pages/validator/ValidatorFarmers";
import ValidatorFieldExecutives from "./pages/validator/ValidatorFieldExecutives";
import ValidatorRecords from "./pages/validator/ValidatorRecords";

// Officer Pages
import OfficerDashboard from "./pages/officer/OfficerDashboard";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import CoconutPlantation from "./pages/admin/CoconutPlantation";
import CoconutPlantationRegistration from "./pages/admin/CoconutPlantationRegistration";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<ValidatorLogin />} />
            
            {/* Data Validator Routes (requires login) */}
            <Route path="/validator" element={<ValidatorProtectedRoute><ValidatorDashboard /></ValidatorProtectedRoute>} />
            <Route path="/validator/farmers" element={<ValidatorProtectedRoute><ValidatorFarmers /></ValidatorProtectedRoute>} />
            <Route path="/validator/field-executives" element={<ValidatorProtectedRoute><ValidatorFieldExecutives /></ValidatorProtectedRoute>} />
            <Route path="/validator/records" element={<ValidatorProtectedRoute><ValidatorRecords /></ValidatorProtectedRoute>} />
            <Route path="/validator/verified" element={<ValidatorProtectedRoute><ValidatorDashboard /></ValidatorProtectedRoute>} />
          
          {/* Verified Officer Routes */}
          <Route path="/officer" element={<OfficerDashboard />} />
          <Route path="/officer/pending" element={<OfficerDashboard />} />
          <Route path="/officer/approved" element={<OfficerDashboard />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/records" element={<AdminDashboard />} />
          <Route path="/admin/coconut" element={<CoconutPlantation />} />
          <Route path="/admin/coconut/register" element={<CoconutPlantationRegistration />} />
          <Route path="/admin/users" element={<AdminDashboard />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
