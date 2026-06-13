import { useQuery } from "convex/react";
import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { PricingCards } from "@/components/pricing/PricingCards";
import { formatToman } from "@/lib/currency";
import { formatIranianPhone } from "@/lib/phone";
import { getPackageById, type PackageId } from "@/lib/packages";

function formatExpiryDate(timestamp: number): string {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useQuery(api.profile.loggedInUser);
  const wallet = useQuery(api.payments.wallet.balance);
  const subscription = useQuery(api.payments.orders.activeSubscription);
  const hasActiveSubscription =
    subscription !== undefined &&
    subscription !== null &&
    subscription.expiresAt > Date.now();
  const navigate = useNavigate();

  useEffect(() => {
    const payment = searchParams.get("payment");
    const walletStatus = searchParams.get("wallet");

    if (payment === "success") {
      toast.success("پرداخت با موفقیت انجام شد. عضویت شما فعال شد.");
    } else if (payment === "failed") {
      toast.error("پرداخت ناموفق بود یا لغو شد.");
    }

    if (walletStatus === "success") {
      toast.success("کیف پول با موفقیت شارژ شد.");
    } else if (walletStatus === "failed") {
      toast.error("شارژ کیف پول ناموفق بود یا لغو شد.");
    }

    if (payment || walletStatus) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("payment");
      nextParams.delete("wallet");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const displayName = user?.name?.trim()
    ? user.name
    : user?.phone
      ? formatIranianPhone(user.phone)
      : "کاربر";

  const handleSelectPlan = (planId: PackageId) => {
    if (hasActiveSubscription) {
      toast.message("شما در حال حاضر عضویت فعال دارید.");
      return;
    }

    navigate(`/home/checkout?plan=${planId}`);
  };

  const activePlan =
    hasActiveSubscription && subscription
      ? getPackageById(subscription.planId)
      : undefined;

  return (
    <div className="page">
      <AppHeader />

      <main className="home-main">
        <section className="welcome-card access-card">
          <div
            className={`access-badge${hasActiveSubscription ? " access-badge-active" : ""}`}
          >
            {hasActiveSubscription ? "دسترسی فعال" : "دسترسی فعال نیست"}
          </div>
          <h1>
            سلام{" "}
            <span className="highlight phone-number">{displayName}</span>
          </h1>
          {hasActiveSubscription && subscription && activePlan ? (
            <p>
              عضویت {activePlan.name} شما فعال است و تا{" "}
              <strong>{formatExpiryDate(subscription.expiresAt)}</strong> معتبر
              می‌ماند.
            </p>
          ) : (
            <p>
              ورود شما با موفقیت انجام شد، اما هنوز عضویت فعالی ندارید. برای
              دسترسی به ابزارها، تحلیل‌ها و ویدیوهای آموزشی طلا، یکی از پلن‌های
              زیر را انتخاب و خریداری کنید.
            </p>
          )}
        </section>

        <section className="welcome-card wallet-summary-card">
          <div className="wallet-summary-header">
            <div>
              <div className="section-label">کیف پول</div>
              <div className="wallet-balance wallet-balance-compact">
                {formatToman(wallet?.balanceToman ?? 0)}
                <span>تومان</span>
              </div>
            </div>
            <Link to="/home/wallet" className="btn btn-secondary">
              شارژ کیف پول
            </Link>
          </div>
          <p className="checkout-subtitle">
            می‌توانید عضویت را با کیف پول، درگاه بانکی، یا ترکیب هر دو پرداخت
            کنید.
          </p>
        </section>

        {!hasActiveSubscription && (
          <section className="pricing-section">
            <div className="section-label">عضویت</div>
            <h2 className="section-title">پلن‌های یک‌ماهه</h2>
            <p className="section-desc">
              هر دو پلن دسترسی کامل به پنل اعضا را باز می‌کنند — تفاوت در عمق
              ابزارها و انعطاف استفاده است.
            </p>
            <PricingCards onSelect={handleSelectPlan} />
          </section>
        )}
      </main>
    </div>
  );
}
