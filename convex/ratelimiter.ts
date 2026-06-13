import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

const DAY = 24 * HOUR;

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  sendOTP: { kind: "fixed window", rate: 1, period: MINUTE },
  validateProfile: { kind: "fixed window", rate: 1, period: MINUTE },
  validateProfileDaily: { kind: "fixed window", rate: 5, period: DAY },
  initiatePayment: { kind: "fixed window", rate: 3, period: MINUTE },
  requestManualVerification: { kind: "fixed window", rate: 1, period: MINUTE },
  requestManualVerificationDaily: {
    kind: "fixed window",
    rate: 3,
    period: DAY,
  },
});
