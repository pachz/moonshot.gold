import { useEffect } from "react";

/** Safari iOS + Chrome Android WebOTP when SMS uses @domain #code format. */
export function useOtpAutofill(
  enabled: boolean,
  onCode: (code: string) => void,
) {
  useEffect(() => {
    if (!enabled || !("OTPCredential" in window)) {
      return;
    }

    const ac = new AbortController();

    void navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      } as CredentialRequestOptions)
      .then((credential) => {
        const code = (credential as OTPCredential | null)?.code;
        if (code) {
          onCode(code);
        }
      })
      .catch(() => {
        // User dismissed or SMS format didn't match — keyboard autofill may still work.
      });

    return () => {
      ac.abort();
    };
  }, [enabled, onCode]);
}
