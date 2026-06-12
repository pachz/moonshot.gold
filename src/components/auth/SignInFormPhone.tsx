import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useOtpAutofill } from "@/hooks/useOtpAutofill";
import {
  formatIranianPhone,
  isValidIranianPhone,
  normalizeIranianPhone,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";

export function SignInFormPhone() {
  const { signIn } = useAuthActions();
  const [displayPhone, setDisplayPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verifyAttemptRef = useRef(false);

  const phone = normalizeIranianPhone(displayPhone);

  const resetVerifyAttempt = () => {
    verifyAttemptRef.current = false;
  };

  const submitVerificationCode = useCallback(
    async (code: string) => {
      if (verifyAttemptRef.current || code.length !== 5) {
        return;
      }

      verifyAttemptRef.current = true;
      setIsSubmitting(true);

      try {
        const formData = new FormData();
        formData.set("phone", phone);
        formData.set("code", code);
        await signIn("kavenegar-otp", formData);
        toast.success("با موفقیت وارد شدید");
      } catch {
        resetVerifyAttempt();
        setIsSubmitting(false);
        toast.error("کد تایید نامعتبر است. لطفاً دوباره تلاش کنید.");
      }
    },
    [phone, signIn],
  );

  useEffect(() => {
    if (isVerifying && verificationCode.length === 5) {
      void submitVerificationCode(verificationCode);
    }
  }, [isVerifying, verificationCode, submitVerificationCode]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidIranianPhone(displayPhone)) {
      toast.error(`شماره موبایل معتبر نیست. مثال: ${PHONE_PLACEHOLDER}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("phone", phone);
      await signIn("kavenegar-otp", formData);
      resetVerifyAttempt();
      setIsVerifying(true);
      toast.success("کد تایید ارسال شد");
    } catch {
      toast.error("خطا در ارسال کد تایید. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayPhone(formatIranianPhone(e.target.value));
  };

  const applyOtpCode = useCallback((code: string) => {
    const digits = code.replace(/\D/g, "").slice(0, 5);
    if (digits.length > 0) {
      setVerificationCode(digits);
    }
  }, []);

  useOtpAutofill(isVerifying, applyOtpCode);

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
            placeholder={PHONE_PLACEHOLDER}
            required
            autoComplete="tel"
          />
          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "در حال ارسال..." : "ارسال کد تایید"}
          </button>
        </form>
      ) : (
        <form
          className="auth-form"
          autoComplete="on"
          onSubmit={(e) => {
            e.preventDefault();
            void submitVerificationCode(verificationCode);
          }}
        >
          <p className="auth-subtitle" style={{ marginBottom: 0 }}>
            کد ارسال‌شده به{" "}
            <span className="phone-number" style={{ color: "var(--gold-light)" }}>
              {displayPhone}
            </span>
          </p>
          <input
            className="auth-input-field"
            type="text"
            name="one-time-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={5}
            pattern="\d{5}"
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(
                e.target.value.replace(/\D/g, "").slice(0, 5),
              );
            }}
            placeholder="00000"
            required
            autoFocus
            dir="ltr"
            disabled={isSubmitting}
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
              resetVerifyAttempt();
              setIsSubmitting(false);
            }}
          >
            تغییر شماره تلفن
          </button>
        </form>
      )}
    </div>
  );
}
