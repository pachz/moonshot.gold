import { useAction, useConvexAuth, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import {
  formatNationalCode,
  isValidNationalCode,
  NATIONAL_CODE_PLACEHOLDER,
} from "@/lib/nationalCode";
import { isValidFullName, normalizeFullName } from "@/lib/fullName";
import { formatIranianPhone } from "@/lib/phone";

export function CompleteProfileForm() {
  const user = useQuery(api.profile.loggedInUser);
  const completeProfile = useAction(api.profileActions.completeProfile);
  const [fullName, setFullName] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phoneDisplay = user?.phone ? formatIranianPhone(user.phone) : "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidFullName(fullName)) {
      toast.error("نام و نام خانوادگی معتبر نیست");
      return;
    }

    if (!isValidNationalCode(nationalCode)) {
      toast.error("کد ملی باید ۱۰ رقم باشد");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await completeProfile({
        fullName: normalizeFullName(fullName),
        nationalCode: formatNationalCode(nationalCode),
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("اطلاعات شما با موفقیت تأیید شد");
    } catch {
      toast.error("خطا در تأیید اطلاعات. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {phoneDisplay ? (
        <p className="profile-phone-note">
          شماره موبایل:{" "}
          <span className="phone-number">{phoneDisplay}</span>
        </p>
      ) : null}

      <input
        type="text"
        className="auth-input-field profile-input"
        placeholder="نام و نام خانوادگی"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        autoComplete="name"
        disabled={isSubmitting}
        dir="rtl"
      />

      <input
        type="text"
        inputMode="numeric"
        className="auth-input-field"
        placeholder={NATIONAL_CODE_PLACEHOLDER}
        value={nationalCode}
        onChange={(event) =>
          setNationalCode(formatNationalCode(event.target.value))
        }
        autoComplete="off"
        disabled={isSubmitting}
        dir="ltr"
      />

      <p className="profile-hint">
        کد ملی باید ۱۰ رقم باشد و با شماره موبایل شما مطابقت داشته باشد.
      </p>

      <button type="submit" className="auth-button" disabled={isSubmitting}>
        {isSubmitting ? "در حال بررسی..." : "تأیید و ادامه"}
      </button>
    </form>
  );
}
