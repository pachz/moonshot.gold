import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { PaymentComingSoonModal } from "@/components/pricing/PaymentComingSoonModal";
import { getPackageById } from "@/lib/packages";

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const plan = getPackageById(searchParams.get("plan"));

  if (!plan) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="page">
      <AppHeader backTo="/home" backLabel="بازگشت به پلن‌ها" />

      <main className="home-main checkout-main">
        <section className="welcome-card">
          <div className="section-label">تأیید سفارش</div>
          <h1 className="checkout-title">خلاصه خرید</h1>
          <p className="checkout-subtitle">
            قبل از پرداخت، جزئیات پلن انتخابی خود را بررسی کنید.
          </p>
        </section>

        <section className="checkout-card">
          <div className="checkout-plan-header">
            <div>
              <div className={`pricing-tier ${plan.id}`}>{plan.name}</div>
              <div className="pricing-period">{plan.period}</div>
            </div>
            <div className="checkout-price">
              {plan.priceDisplay}
              <span>تومان</span>
            </div>
          </div>

          <ul className="pricing-features checkout-features">
            {plan.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
            {plan.mutedFeatures?.map((feature) => (
              <li key={feature} className="muted">
                {feature}
              </li>
            ))}
          </ul>

          <div className="checkout-summary">
            <div className="checkout-summary-row">
              <span>مبلغ قابل پرداخت</span>
              <strong>
                {plan.priceDisplay} <span>تومان</span>
              </strong>
            </div>
          </div>

          <div className="checkout-actions">
            <button
              type="button"
              className="btn btn-primary checkout-pay-btn"
              onClick={() => setShowPaymentModal(true)}
            >
              پرداخت و فعال‌سازی
            </button>
            <Link to="/home" className="header-link checkout-cancel">
              انصراف و بازگشت
            </Link>
          </div>
        </section>
      </main>

      <PaymentComingSoonModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />
    </div>
  );
}
