import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "founder" | "employee";
  requireApproval?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requireApproval = true,
}: ProtectedRouteProps) {
  const { user, userRole, isLoading, hasProfile, approvalStatus } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check profile approval requirement (founders are always approved)
  if (requireApproval && userRole !== "founder") {
    if (
      !hasProfile ||
      approvalStatus === "pending" ||
      approvalStatus === "rejected"
    ) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Check role requirement
  if (requiredRole === "founder" && userRole !== "founder") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
