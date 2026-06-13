import { useConvexAuth, useQuery } from "convex/react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "../../../convex/_generated/api";

interface ProfileValidatedRouteProps {
  children: React.ReactNode;
}

export function ProfileValidatedRoute({ children }: ProfileValidatedRouteProps) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.profile.loggedInUser);
  const location = useLocation();

  if (authLoading || (isAuthenticated && user === undefined)) {
    return (
      <div className="loading-center page">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.profileValidated !== true) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}
