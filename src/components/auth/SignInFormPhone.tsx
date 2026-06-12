import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  formatIranianPhone,
  isValidIranianPhone,
  normalizeIranianPhone,
} from "@/lib/phone";

export function SignInFormPhone() {
  const { signIn } = useAuthActions();
  const [displayPhone, setDisplayPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phone = normalizeIranianPhone(displayPhone);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidIranianPhone(displayPhone)) {
      toast.error("شماره موبایل معتبر نیست. مثال: ۰۹۱۲ ۲۷۷ ۶۴۲۵");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("phone", phone);
      await signIn("kavenegar-otp", formData);
      setIsVerifying(true);
      toast.success("کد تایید ارسال شد");
    } catch {
      toast.error("خطا در ارسال کد تایید. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e?: React.FormEvent, code?: string) => {
    if (e) {
      e.preventDefault();
    }

    const codeToSubmit = code ?? verificationCode;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("phone", phone);
      formData.set("code", codeToSubmit);
      await signIn("kavenegar-otp", formData);
      toast.success("با موفقیت وارد شدید");
    } catch {
      toast.error("کد تایید نامعتبر است. لطفاً دوباره تلاش کنید.");
      setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayPhone(formatIranianPhone(e.target.value));
  };

  return (
    <div>
      {!isVerifying ? (
        <form className="auth-form" onSubmit={(e) => void handleSendCode(e)}>
          <input
            className="auth-input-field"
            type="tel"
            inputMode="numeric"
            value={displayPhone}
            onChange={handlePhoneChange}
            placeholder="۰۹۱۲ ۲۷۷ ۶۴۲۵"
            required
            autoComplete="tel"
          />
          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "در حال ارسال..." : "ارسال کد تایید"}
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={(e) => void handleVerifyCode(e)}>
          <p className="auth-subtitle" style={{ marginBottom: 0 }}>
            کد ارسال‌شده به{" "}
            <span dir="ltr" style={{ color: "var(--gold-light)" }}>
              {displayPhone}
            </span>
          </p>
          <input
            className="auth-input-field"
            type="text"
            inputMode="numeric"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 5);
              setVerificationCode(value);

              if (value.length === 5) {
                setTimeout(() => {
                  void handleVerifyCode(undefined, value);
                }, 100);
              }
            }}
            placeholder="۰۰۰۰۰"
            required
            autoFocus
            dir="ltr"
          />
          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "در حال تایید..." : "تایید کد"}
          </button>
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setIsVerifying(false);
              setVerificationCode("");
            }}
          >
            تغییر شماره تلفن
          </button>
        </form>
      )}
    </div>
  );
}
