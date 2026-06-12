import { Phone } from "@convex-dev/auth/providers/Phone";
import { internal } from "../_generated/api";
import { alphabet, generateRandomString } from "oslo/crypto";
import { rateLimiter } from "../ratelimiter";

export const KavenegarOTP = Phone({
  id: "kavenegar-otp",
  maxAge: 60 * 20,
  async generateVerificationToken() {
    return generateRandomString(5, alphabet("0-9"));
  },
  async sendVerificationRequest({ identifier: phone, token }, ctx) {
    if (phone === undefined) {
      throw new Error("`phone` param is missing for kavenegar-otp");
    }

    await rateLimiter.limit(ctx, "sendOTP", { key: phone, throws: true });

    await ctx.runAction(internal.otp.CustomOTP.sendOTP, {
      phoneNumber: phone,
      code: token,
    });
  },
});
