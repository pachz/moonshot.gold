import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";
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

    const { nationalCode: _nationalCode, ...publicUser } = user;
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
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get("users", userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (isProfileValidated(user.profileValidated)) {
      throw new Error("پروفایل شما قبلاً تأیید شده است");
    }

    if (!user.phone) {
      throw new Error("شماره موبایل یافت نشد");
    }

    const fullName = normalizeFullName(args.fullName);
    const nationalCode = normalizeNationalCode(args.nationalCode);

    if (!isValidFullName(fullName)) {
      throw new Error("نام و نام خانوادگی معتبر نیست");
    }

    if (!isValidNationalCode(nationalCode)) {
      throw new Error("کد ملی باید ۱۰ رقم باشد");
    }

    try {
      await rateLimiter.limit(ctx, "validateProfile", {
        key: user.phone,
        throws: true,
      });
      await rateLimiter.limit(ctx, "validateProfileDaily", {
        key: user.phone,
        throws: true,
      });
    } catch {
      throw new Error(
        "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
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
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (isProfileValidated(user.profileValidated)) {
      throw new Error("پروفایل شما قبلاً تأیید شده است");
    }

    await ctx.db.patch(args.userId, {
      name: args.fullName,
      nationalCode: args.nationalCode,
      profileValidated: true,
    });

    return null;
  },
});

export const completeProfile = action({
  args: {
    fullName: v.string(),
    nationalCode: v.string(),
  },
  returns: v.object({
    success: v.literal(true),
  }),
  handler: async (ctx, args) => {
    const prepared = await ctx.runMutation(
      internal.profile.prepareProfileValidation,
      args,
    );

    const verification = await ctx.runAction(internal.identity.shahkar.verify, {
      mobile: prepared.phone,
      nationalCode: prepared.nationalCode,
    });

    if (!verification.matched) {
      throw new Error(verification.message);
    }

    await ctx.runMutation(internal.profile.finalizeValidatedProfile, {
      userId: prepared.userId,
      fullName: prepared.fullName,
      nationalCode: prepared.nationalCode,
    });

    return { success: true as const };
  },
});
