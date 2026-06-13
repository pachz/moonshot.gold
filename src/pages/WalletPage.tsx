import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { formatToman, parseTomanInput } from "@/lib/currency";

const TOPUP_PRESETS = [100_000, 250_000, 500_000, 1_000_000];

function formatTransactionType(type: string): string {
  switch (type) {
    case "topup":
      return "شارژ";
    case "subscription_payment":
      return "پرداخت عضویت";
    case "subscription_refund":
      return "بازگشت وجه";
    default:
      return type;
  }
}

export function WalletPage() {
  const wallet = useQuery(api.payments.wallet.balance);
  const transactions = useQuery(api.payments.wallet.recentTransactions);
  const initiateTopup = useAction(api.payments.initiate.initiateWalletTopup);
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTopup = async (amountToman: number) => {
    setIsSubmitting(true);
    try {
      const result = await initiateTopup({ amountToman });
      if (result.success && result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      toast.error(result.message ?? "خطا در ایجاد پرداخت شارژ");
    } catch {
      toast.error("خطا در ایجاد پرداخت شارژ. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomTopup = async () => {
    const amountToman = parseTomanInput(amountInput);
    if (!amountToman) {
      toast.error("مبلغ شارژ معتبر نیست");
      return;
    }

    await handleTopup(amountToman);
  };

  return (
    <div className="page">
      <AppHeader backTo="/home" backLabel="بازگشت" />

      <main className="home-main wallet-main">
        <section className="welcome-card wallet-card">
          <div className="section-label">کیف پول</div>
          <h1 className="checkout-title">موجودی شما</h1>
          <div className="wallet-balance">
            {formatToman(wallet?.balanceToman ?? 0)}
            <span>تومان</span>
          </div>
          <p className="checkout-subtitle">
            می‌توانید کیف پول را شارژ کنید و برای خرید عضویت از آن استفاده کنید.
          </p>
        </section>

        <section className="checkout-card">
          <div className="section-label">شارژ کیف پول</div>
          <div className="wallet-presets">
            {TOPUP_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                className="btn btn-secondary wallet-preset-btn"
                disabled={isSubmitting}
                onClick={() => void handleTopup(amount)}
              >
                {formatToman(amount)} تومان
              </button>
            ))}
          </div>

          <div className="wallet-custom-topup">
            <label htmlFor="topup-amount">مبلغ دلخواه (تومان)</label>
            <input
              id="topup-amount"
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="مثلاً ۳۰۰,۰۰۰"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={isSubmitting}
              onClick={() => void handleCustomTopup()}
            >
              {isSubmitting ? "در حال انتقال به درگاه..." : "شارژ با درگاه"}
            </button>
          </div>
        </section>

        <section className="checkout-card wallet-history">
          <div className="section-label">تراکنش‌های اخیر</div>
          {transactions === undefined ? (
            <p className="checkout-subtitle">در حال بارگذاری...</p>
          ) : transactions.length === 0 ? (
            <p className="checkout-subtitle">هنوز تراکنشی ثبت نشده است.</p>
          ) : (
            <ul className="wallet-transactions">
              {transactions.map((transaction) => (
                <li key={transaction._id} className="wallet-transaction-item">
                  <div>
                    <strong>{transaction.description}</strong>
                    <small>{formatTransactionType(transaction.type)}</small>
                  </div>
                  <div className="wallet-transaction-amount">
                    <span
                      className={
                        transaction.amountToman >= 0
                          ? "wallet-credit"
                          : "wallet-debit"
                      }
                    >
                      {transaction.amountToman >= 0 ? "+" : ""}
                      {formatToman(transaction.amountToman)}
                    </span>
                    <small>تومان</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link to="/home" className="header-link checkout-cancel">
          بازگشت به خانه
        </Link>
      </main>
    </div>
  );
}
