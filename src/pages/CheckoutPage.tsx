import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { formatToman } from "@/lib/currency";
import { getPackageById } from "@/lib/packages";

type PaymentMethod = "gateway" | "wallet" | "combined";

const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  title: string;
  description: string;
}> = [
  {
    id: "gateway",
    title: "درگاه بانکی",
    description: "پرداخت کامل از طریق زیبال",
  },
  {
    id: "wallet",
    title: "کیف پول",
    description: "پرداخت کامل از موجودی کیف پول",
  },
  {
    id: "combined",
    title: "کیف پول + درگاه",
    description: "ابتدا از کیف پول، مابقی از درگاه",
  },
];

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("gateway");
  const initiatePayment = useAction(
    api.payments.initiate.initiateSubscriptionPayment,
  );
  const plan = getPackageById(searchParams.get("plan"));
  const preview = useQuery(
    api.payments.orders.getPaymentPreview,
    plan ? { planId: plan.id, paymentMethod } : "skip",
  );

  if (!plan) {
    return <Navigate to="/home" replace />;
  }

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const result = await initiatePayment({
        planId: plan.id,
        paymentMethod,
      });

      if (result.success && result.completed) {
        toast.success("پرداخت با موفقیت انجام شد. عضویت شما فعال شد.");
        window.location.href = "/home?payment=success";
        return;
      }

      if (result.success && result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      toast.error(result.message ?? "خطا در ایجاد پرداخت");
    } catch {
      toast.error("خطا در ایجاد پرداخت. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="page">
      <AppHeader backTo="/home" backLabel="بازگشت به پلن‌ها" />

      <main className="home-main checkout-main">
        <section className="welcome-card">
          <div className="section-label">تأیید سفارش</div>
          <h1 className="checkout-title">خلاصه خرید</h1>
          <p className="checkout-subtitle">
            روش پرداخت را انتخاب کنید و جزئیات سفارش را بررسی کنید.
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

          <div className="payment-methods">
            <div className="section-label">روش پرداخت</div>
            {PAYMENT_METHODS.map((method) => (
              <label key={method.id} className="payment-method-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={paymentMethod === method.id}
                  onChange={() => setPaymentMethod(method.id)}
                />
                <span className="payment-method-copy">
                  <strong>{method.title}</strong>
                  <small>{method.description}</small>
                </span>
              </label>
            ))}
          </div>

          {preview && (
            <div className="checkout-summary">
              <div className="checkout-summary-row">
                <span>موجودی کیف پول</span>
                <strong>
                  {formatToman(preview.walletBalanceToman)} <span>تومان</span>
                </strong>
              </div>
              {preview.walletAmountToman > 0 && (
                <div className="checkout-summary-row">
                  <span>پرداخت از کیف پول</span>
                  <strong>
                    {formatToman(preview.walletAmountToman)}{" "}
                    <span>تومان</span>
                  </strong>
                </div>
              )}
              {preview.gatewayAmountToman > 0 && (
                <div className="checkout-summary-row">
                  <span>پرداخت از درگاه</span>
                  <strong>
                    {formatToman(preview.gatewayAmountToman)}{" "}
                    <span>تومان</span>
                  </strong>
                </div>
              )}
              <div className="checkout-summary-row checkout-summary-total">
                <span>مبلغ قابل پرداخت</span>
                <strong>
                  {formatToman(preview.totalToman)} <span>تومان</span>
                </strong>
              </div>
              {!preview.canPay && preview.message && (
                <p className="payment-preview-error">{preview.message}</p>
              )}
            </div>
          )}

          <div className="checkout-actions">
            <button
              type="button"
              className="btn btn-primary checkout-pay-btn"
              onClick={() => void handlePay()}
              disabled={
                isPaying || preview === undefined || preview.canPay === false
              }
            >
              {isPaying
                ? preview?.gatewayAmountToman
                  ? "در حال انتقال به درگاه..."
                  : "در حال پردازش..."
                : "پرداخت و فعال‌سازی"}
            </button>
            <Link to="/home/wallet" className="header-link checkout-cancel">
              شارژ کیف پول
            </Link>
            <Link to="/home" className="header-link checkout-cancel">
              انصراف و بازگشت
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
