import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import {
  formatRateLimitMessage,
  throwUserFacingError,
} from "./lib/userFacingError";
import { rateLimiter } from "./ratelimiter";

const loggedInUserValidator = v.union(
  v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    profileValidated: v.optional(v.boolean()),
  }),
  v.null(),
);

function isProfileValidated(profileValidated: boolean | undefined): boolean {
  return profileValidated === true;
}

function normalizeNationalCode(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidNationalCode(value: string): boolean {
  return /^\d{10}$/.test(normalizeNationalCode(value));
}

function isValidFullName(value: string): boolean {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length >= 3 && /^[\p{L}\s]+$/u.test(trimmed);
}

function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export const loggedInUser = query({
  args: {},
  returns: loggedInUserValidator,
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get("users", userId);
    if (!user) {
      return null;
    }

    const {
      nationalCode: _nationalCode,
      walletBalanceToman: _walletBalanceToman,
      ...publicUser
    } = user;
    return publicUser;
  },
});

export const prepareProfileValidation = internalMutation({
  args: {
    fullName: v.string(),
    nationalCode: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    phone: v.string(),
    fullName: v.string(),
    nationalCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throwUserFacingError("لطفاً دوباره وارد شوید");
    }

    const user = await ctx.db.get("users", userId);
    if (!user) {
      throwUserFacingError("کاربر یافت نشد");
    }

    if (isProfileValidated(user.profileValidated)) {
      throwUserFacingError("پروفایل شما قبلاً تأیید شده است");
    }

    if (!user.phone) {
      throwUserFacingError("شماره موبایل یافت نشد");
    }

    const fullName = normalizeFullName(args.fullName);
    const nationalCode = normalizeNationalCode(args.nationalCode);

    if (!isValidFullName(fullName)) {
      throwUserFacingError("نام و نام خانوادگی معتبر نیست");
    }

    if (!isValidNationalCode(nationalCode)) {
      throwUserFacingError("کد ملی باید ۱۰ رقم باشد");
    }

    const minuteStatus = await rateLimiter.limit(ctx, "validateProfile", {
      key: user.phone,
      throws: false,
    });
    if (!minuteStatus.ok) {
      throwUserFacingError(
        formatRateLimitMessage("validateProfile", minuteStatus.retryAfter),
      );
    }

    const dailyStatus = await rateLimiter.limit(ctx, "validateProfileDaily", {
      key: user.phone,
      throws: false,
    });
    if (!dailyStatus.ok) {
      throwUserFacingError(
        formatRateLimitMessage(
          "validateProfileDaily",
          dailyStatus.retryAfter,
        ),
      );
    }

    return {
      userId,
      phone: user.phone,
      fullName,
      nationalCode,
    };
  },
});

export const finalizeValidatedProfile = internalMutation({
  args: {
    userId: v.id("users"),
    fullName: v.string(),
    nationalCode: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId || userId !== args.userId) {
      throwUserFacingError("دسترسی غیرمجاز");
    }

    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throwUserFacingError("کاربر یافت نشد");
    }

    if (isProfileValidated(user.profileValidated)) {
      throwUserFacingError("پروفایل شما قبلاً تأیید شده است");
    }

    await ctx.db.patch(args.userId, {
      name: args.fullName,
      nationalCode: args.nationalCode,
      profileValidated: true,
    });

    return null;
  },
});
