import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { PricingCards } from "@/components/pricing/PricingCards";
import { formatIranianPhone } from "@/lib/phone";
import type { PackageId } from "@/lib/packages";

export function HomePage() {
  const user = useQuery(api.auth.loggedInUser);
  const navigate = useNavigate();

  const phoneDisplay = user?.phone
    ? formatIranianPhone(user.phone)
    : "کاربر";

  const handleSelectPlan = (planId: PackageId) => {
    navigate(`/home/checkout?plan=${planId}`);
  };

  return (
    <div className="page">
      <AppHeader />

      <main className="home-main">
        <section className="welcome-card access-card">
          <div className="access-badge">دسترسی فعال نیست</div>
          <h1>
            سلام{" "}
            <span className="highlight phone-number">{phoneDisplay}</span>
          </h1>
          <p>
            ورود شما با موفقیت انجام شد، اما هنوز عضویت فعالی ندارید. برای
            دسترسی به ابزارها، تحلیل‌ها و ویدیوهای آموزشی طلا، یکی از پلن‌های
            زیر را انتخاب و خریداری کنید.
          </p>
        </section>

        <section className="pricing-section">
          <div className="section-label">عضویت</div>
          <h2 className="section-title">پلن‌های یک‌ماهه</h2>
          <p className="section-desc">
            هر دو پلن دسترسی کامل به پنل اعضا را باز می‌کنند — تفاوت در عمق
            ابزارها و انعطاف استفاده است.
          </p>
          <PricingCards onSelect={handleSelectPlan} />
        </section>
      </main>
    </div>
  );
}
