import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ValidatorProtectedRoute } from "@/components/ValidatorProtectedRoute";
import NotFound from "./pages/NotFound";
import ValidatorLogin from "./pages/ValidatorLogin";

// Validator Pages
import ValidatorDashboard from "./pages/validator/ValidatorDashboard";
import ValidatorFarmers from "./pages/validator/ValidatorFarmers";
import ValidatorFieldExecutives from "./pages/validator/ValidatorFieldExecutives";
import ValidatorRecords from "./pages/validator/ValidatorRecords";
import ValidatorCoconutDetail from "./pages/validator/ValidatorCoconutDetail";
import ValidatorKmlDownload from "./pages/validator/ValidatorKmlDownload";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<ValidatorLogin />} />
            
            {/* Data Validator Routes (requires login) */}
            <Route path="/validator" element={<ValidatorProtectedRoute><ValidatorDashboard /></ValidatorProtectedRoute>} />
            <Route path="/validator/farmers" element={<ValidatorProtectedRoute><ValidatorFarmers /></ValidatorProtectedRoute>} />
            <Route path="/validator/farmers/coconut/:id" element={<ValidatorProtectedRoute><ValidatorCoconutDetail /></ValidatorProtectedRoute>} />
            <Route path="/validator/field-executives" element={<ValidatorProtectedRoute><ValidatorFieldExecutives /></ValidatorProtectedRoute>} />
            <Route path="/validator/records" element={<ValidatorProtectedRoute><ValidatorRecords /></ValidatorProtectedRoute>} />
            <Route path="/validator/kml/:id" element={<ValidatorProtectedRoute><ValidatorKmlDownload /></ValidatorProtectedRoute>} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
