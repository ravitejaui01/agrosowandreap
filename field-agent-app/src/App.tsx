import { Toaster as Sonner } from "sonner";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AgentDashboard from "./pages/AgentDashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CoconutRegistration from "./pages/coconut/CoconutRegistration";
import CoconutEntries from "./pages/coconut/CoconutEntries";
import SubmissionDetail from "./pages/coconut/SubmissionDetail";
import RecollectAddNew from "./pages/RecollectAddNew";
import SignatureUploadAddNew from "./pages/SignatureUploadAddNew";

function AuthRedirect({ to, children }: { to: string; children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  if (!isReady) return null;
  if (user) return <Navigate to={to} replace />;
  return <>{children}</>;
}

const App = () => (
  <>
    <Sonner position="top-center" richColors />
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<AuthRedirect to="/"><Login /></AuthRedirect>} />
          <Route path="/signup" element={<AuthRedirect to="/"><Signup /></AuthRedirect>} />
          <Route path="/" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/submissions" element={<Navigate to="/" replace />} />
          <Route path="/coconut/entries" element={<ProtectedRoute><CoconutEntries /></ProtectedRoute>} />
          <Route path="/coconut/entries/:id" element={<ProtectedRoute><SubmissionDetail /></ProtectedRoute>} />
          <Route path="/coconut/register" element={<ProtectedRoute><CoconutRegistration /></ProtectedRoute>} />
          <Route path="/recollect" element={<ProtectedRoute><RecollectAddNew /></ProtectedRoute>} />
          <Route path="/signature-upload" element={<ProtectedRoute><SignatureUploadAddNew /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  </>
);

export default App;
