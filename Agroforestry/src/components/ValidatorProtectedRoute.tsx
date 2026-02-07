import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ValidatorProtectedRouteProps {
  children: React.ReactNode;
}

export function ValidatorProtectedRoute({ children }: ValidatorProtectedRouteProps) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return null;

  if (!user || user.role !== "data_validator") {
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
