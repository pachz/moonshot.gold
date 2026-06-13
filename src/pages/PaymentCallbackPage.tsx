import { useAction, useConvexAuth } from "convex/react";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { AppHeader } from "@/components/layout/AppHeader";

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirmPayment = useAction(api.payments.confirm.confirmPayment);
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (authLoading || hasStarted.current) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", {
        replace: true,
        state: {
          from: {
            pathname: "/payment/callback",
            search: searchParams.toString(),
          },
        },
      });
      return;
    }

    const trackId = searchParams.get("trackId");
    const callbackSuccess = searchParams.get("success") === "1";

    if (!trackId) {
      navigate("/home?payment=failed", { replace: true });
      return;
    }

    hasStarted.current = true;

    void confirmPayment({ trackId, callbackSuccess })
      .then((result) => {
        if (result.kind === "wallet_topup") {
          navigate(`/home?wallet=${result.status}`, { replace: true });
          return;
        }

        navigate(`/home?payment=${result.status}`, { replace: true });
      })
      .catch(() => {
        navigate("/home?payment=failed", { replace: true });
      });
  }, [
    authLoading,
    confirmPayment,
    isAuthenticated,
    navigate,
    searchParams,
  ]);

  return (
    <div className="page">
      <AppHeader />
      <main className="home-main">
        <section className="welcome-card">
          <div className="loading-center">
            <div className="spinner" />
          </div>
          <p className="checkout-subtitle" style={{ textAlign: "center" }}>
            در حال تأیید پرداخت...
          </p>
        </section>
      </main>
    </div>
  );
}
