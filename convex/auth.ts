import { convexAuth } from "@convex-dev/auth/server";
import { KavenegarOTP } from "./auth/phone";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [KavenegarOTP],
});
