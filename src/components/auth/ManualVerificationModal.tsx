import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";

interface ManualVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onApproved: () => void;
}

type ModalPhase = "intro" | "waiting" | "rejected";

export function ManualVerificationModal({
  open,
  onClose,
  onApproved,
}: ManualVerificationModalProps) {
  const verification = useQuery(
    api.manualVerification.status,
    open ? {} : "skip",
  );
  const requestVerification = useAction(
    api.manualVerificationActions.requestVerification,
  );
  const [phase, setPhase] = useState<ModalPhase>("intro");
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPhase("intro");
      setIsRequesting(false);
      return;
    }

    if (verification?.manualVerified) {
      toast.success("حساب شما تأیید شد. اکنون می‌توانید پرداخت کنید.");
      onApproved();
      onClose();
      return;
    }

    if (verification?.pending) {
      setPhase("waiting");
      return;
    }

    if (verification?.rejected) {
      setPhase("rejected");
      return;
    }

    setPhase("intro");
  }, [open, verification, onApproved, onClose]);

  if (!open) {
    return null;
  }

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      const result = await requestVerification({});
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.message("درخواست تأیید ارسال شد. به زودی بررسی می‌شود.");
      setPhase("waiting");
    } catch {
      toast.error("ارسال درخواست تأیید ناموفق بود");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="modal-card manual-verify-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-verify-title"
        onClick={(event) => event.stopPropagation()}
      >
        {phase === "waiting" ? (
          <>
            <div className="loading-center">
              <div className="spinner" />
            </div>
            <h2 id="manual-verify-title">در انتظار تأیید</h2>
            <p>
              درخواست شما برای تیم پشتیبانی ارسال شد. پس از تأیید، این پنجره
              به‌طور خودکار بسته می‌شود و می‌توانید پرداخت را ادامه دهید.
            </p>
            <p className="manual-verify-hint">
              لطفاً این صفحه را باز نگه دارید.
            </p>
          </>
        ) : phase === "rejected" ? (
          <>
            <h2 id="manual-verify-title">درخواست رد شد</h2>
            <p>
              درخواست تأیید شما تأیید نشد. در صورت نیاز می‌توانید دوباره درخواست
              دهید.
            </p>
            <button
              type="button"
              className="auth-button"
              disabled={isRequesting}
              onClick={() => void handleRequest()}
            >
              {isRequesting ? "در حال ارسال..." : "درخواست مجدد"}
            </button>
            <button type="button" className="header-link" onClick={onClose}>
              بستن
            </button>
          </>
        ) : (
          <>
            <h2 id="manual-verify-title">تأیید دستی لازم است</h2>
            <p>
              قبل از پرداخت، حساب شما باید توسط تیم پشتیبانی تأیید شود. با زدن
              دکمه زیر، اطلاعات شما در کانال تلگرام ارسال می‌شود.
            </p>
            <button
              type="button"
              className="auth-button"
              disabled={isRequesting}
              onClick={() => void handleRequest()}
            >
              {isRequesting ? "در حال ارسال..." : "درخواست تأیید"}
            </button>
            <button type="button" className="header-link" onClick={onClose}>
              انصراف
            </button>
          </>
        )}
      </div>
    </div>
  );
}
