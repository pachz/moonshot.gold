import { useConvexAuth, useQuery } from "convex/react";
import { Navigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";

export function CompleteProfilePage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.profile.loggedInUser);

  if (authLoading || (isAuthenticated && user === undefined)) {
    return (
      <div className="loading-center page">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.profileValidated === true) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div
      className="page"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🌙</span>
          <span className="auth-logo-text">moonshot.gold</span>
        </div>
        <h1 className="auth-title">تکمیل پروفایل</h1>
        <p className="auth-subtitle">
          برای استفاده از سایت، نام و کد ملی خود را وارد کنید تا با شماره
          موبایلتان مطابقت داده شود.
        </p>
        <CompleteProfileForm />
      </div>
    </div>
  );
}
