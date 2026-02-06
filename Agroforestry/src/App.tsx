import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Validator Pages
import ValidatorDashboard from "./pages/validator/ValidatorDashboard";
import ValidatorFarmers from "./pages/validator/ValidatorFarmers";
import ValidatorFieldExecutives from "./pages/validator/ValidatorFieldExecutives";
import ValidatorRecords from "./pages/validator/ValidatorRecords";

// Officer Pages
import OfficerDashboard from "./pages/officer/OfficerDashboard";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Data Validator Routes */}
          <Route path="/validator" element={<ValidatorDashboard />} />
          <Route path="/validator/farmers" element={<ValidatorFarmers />} />
          <Route path="/validator/field-executives" element={<ValidatorFieldExecutives />} />
          <Route path="/validator/records" element={<ValidatorRecords />} />
          <Route path="/validator/verified" element={<ValidatorDashboard />} />
          
          {/* Verified Officer Routes */}
          <Route path="/officer" element={<OfficerDashboard />} />
          <Route path="/officer/pending" element={<OfficerDashboard />} />
          <Route path="/officer/approved" element={<OfficerDashboard />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/records" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminDashboard />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
