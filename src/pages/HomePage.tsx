import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { formatIranianPhone } from "@/lib/phone";

export function HomePage() {
  const user = useQuery(api.auth.loggedInUser);

  const phoneDisplay = user?.phone
    ? formatIranianPhone(user.phone)
    : "کاربر";

  return (
    <div className="page">
      <header className="home-header">
        <a href="/" className="home-brand" style={{ textDecoration: "none" }}>
          <span>🌙</span>
          <span>moonshot.gold</span>
        </a>
        <SignOutButton />
      </header>

      <main className="home-main">
        <section className="welcome-card">
          <h1>
            خوش آمدید،{" "}
            <span className="highlight phone-number">{phoneDisplay}</span>
          </h1>
          <p>
            شما با موفقیت وارد پنل اعضای مون‌شات شدید. ابزارها، تحلیل‌ها و
            ویدیوهای آموزشی طلا از اینجا در دسترس شماست.
          </p>
        </section>

        <div className="feature-grid">
          <article className="feature-card">
            <h3>📊 تحلیل بازار</h3>
            <p>نمودارها و گزارش‌های روزانه قیمت طلا و دلار</p>
          </article>
          <article className="feature-card">
            <h3>🎬 ویدیوهای آموزشی</h3>
            <p>آموزش معامله‌گری و مدیریت ریسک برای اعضا</p>
          </article>
          <article className="feature-card">
            <h3>🛠️ ابزارها</h3>
            <p>ماشین‌حساب سود، هشدار قیمت و تقویم اقتصادی</p>
          </article>
        </div>
      </main>
    </div>
  );
}
