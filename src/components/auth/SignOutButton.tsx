import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function SignOutButton() {
  const { signOut } = useAuthActions();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      window.location.href = "/";
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      type="button"
      className="sign-out-btn"
      onClick={() => void handleSignOut()}
      disabled={isSigningOut}
    >
      {isSigningOut ? "در حال خروج..." : "خروج"}
    </button>
  );
}
