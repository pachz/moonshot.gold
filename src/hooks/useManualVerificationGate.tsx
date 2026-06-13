import { useQuery } from "convex/react";
import { useCallback, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { ManualVerificationModal } from "@/components/auth/ManualVerificationModal";

export function useManualVerificationGate() {
  const verification = useQuery(api.manualVerification.status);
  const [showModal, setShowModal] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const runWithVerification = useCallback(
    (action: () => void) => {
      if (verification?.manualVerified) {
        action();
        return;
      }

      pendingActionRef.current = action;
      setShowModal(true);
    },
    [verification?.manualVerified],
  );

  const handleApproved = useCallback(() => {
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    pending?.();
  }, []);

  const modal = (
    <ManualVerificationModal
      open={showModal}
      onClose={() => {
        setShowModal(false);
        pendingActionRef.current = null;
      }}
      onApproved={handleApproved}
    />
  );

  return {
    verification,
    runWithVerification,
    modal,
  };
}
