interface PaymentComingSoonModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentComingSoonModal({
  open,
  onClose,
}: PaymentComingSoonModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="payment-modal-title">پرداخت به‌زودی</h2>
        <p>
          درگاه پرداخت به‌زودی فعال می‌شود. پس از راه‌اندازی، می‌توانید خرید
          خود را تکمیل کنید.
        </p>
        <button type="button" className="auth-button" onClick={onClose}>
          متوجه شدم
        </button>
      </div>
    </div>
  );
}
