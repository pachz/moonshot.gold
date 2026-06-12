import { useConvexAuth } from "convex/react";
import { Navigate, useLocation } from "react-router-dom";
import { SignInFormPhone } from "@/components/auth/SignInFormPhone";

export function LoginPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const from =
      (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname ?? "/home";
    return <Navigate to={from} replace />;
  }

  if (isLoading) {
    return (
      <div className="loading-center page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🌙</span>
          <span className="auth-logo-text">moonshot.gold</span>
        </div>
        <h1 className="auth-title">ورود به حساب</h1>
        <p className="auth-subtitle">
          شماره موبایل خود را وارد کنید تا کد تایید برایتان ارسال شود
        </p>
        <SignInFormPhone />
        <p style={{ textAlign: "center", marginTop: "1.25rem" }}>
          <a href="/" style={{ color: "var(--text-muted)", fontSize: "0.9rem", textDecoration: "none" }}>
            بازگشت به صفحه اصلی
          </a>
        </p>
      </div>
    </div>
  );
}
