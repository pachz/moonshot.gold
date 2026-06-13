import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, query } from "./_generated/server";
import {
  formatRateLimitMessage,
  throwUserFacingError,
} from "./lib/userFacingError";
import { rateLimiter } from "./ratelimiter";

const verificationStatusValidator = v.object({
  manualVerified: v.boolean(),
  pending: v.boolean(),
  rejected: v.boolean(),
});

export const status = query({
  args: {},
  returns: verificationStatusValidator,
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { manualVerified: false, pending: false, rejected: false };
    }

    const user = await ctx.db.get("users", userId);
    if (!user) {
      return { manualVerified: false, pending: false, rejected: false };
    }

    const pendingRequest = await ctx.db
      .query("manualVerificationRequests")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "pending"),
      )
      .first();

    const latestRejected = await ctx.db
      .query("manualVerificationRequests")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "rejected"),
      )
      .order("desc")
      .first();

    const hasRecentRejection =
      latestRejected !== null &&
      pendingRequest === null &&
      user.manualVerified !== true;

    return {
      manualVerified: user.manualVerified === true,
      pending: pendingRequest !== null,
      rejected: hasRecentRejection,
    };
  },
});

export const prepareRequest = internalMutation({
  args: {},
  returns: v.object({
    requestId: v.id("manualVerificationRequests"),
    userId: v.id("users"),
    fullName: v.string(),
    phone: v.string(),
    nationalCode: v.string(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throwUserFacingError("لطفاً دوباره وارد شوید");
    }

    const user = await ctx.db.get("users", userId);
    if (!user) {
      throwUserFacingError("کاربر یافت نشد");
    }

    if (user.profileValidated !== true) {
      throwUserFacingError("ابتدا پروفایل خود را تکمیل کنید");
    }

    if (user.manualVerified === true) {
      throwUserFacingError("حساب شما قبلاً تأیید شده است");
    }

    const pendingRequest = await ctx.db
      .query("manualVerificationRequests")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "pending"),
      )
      .first();

    if (pendingRequest) {
      throwUserFacingError(
        "درخواست تأیید شما در حال بررسی است. لطفاً منتظر بمانید.",
      );
    }

    const rateLimitKey = user.phone ?? userId;
    const minuteStatus = await rateLimiter.limit(ctx, "requestManualVerification", {
      key: rateLimitKey,
      throws: false,
    });
    if (!minuteStatus.ok) {
      throwUserFacingError(
        formatRateLimitMessage(
          "requestManualVerification",
          minuteStatus.retryAfter,
        ),
      );
    }

    const dailyStatus = await rateLimiter.limit(
      ctx,
      "requestManualVerificationDaily",
      {
        key: rateLimitKey,
        throws: false,
      },
    );
    if (!dailyStatus.ok) {
      throwUserFacingError(
        formatRateLimitMessage("requestManualVerificationDaily"),
      );
    }

    if (!user.phone || !user.nationalCode || !user.name) {
      throwUserFacingError("اطلاعات پروفایل برای تأیید کامل نیست");
    }

    const requestId = await ctx.db.insert("manualVerificationRequests", {
      userId,
      status: "pending",
      createdAt: Date.now(),
    });

    return {
      requestId,
      userId,
      fullName: user.name,
      phone: user.phone,
      nationalCode: user.nationalCode,
    };
  },
});

export const cancelPendingRequest = internalMutation({
  args: { requestId: v.id("manualVerificationRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(
      "manualVerificationRequests",
      args.requestId,
    );
    if (!request || request.status !== "pending") {
      return null;
    }

    await ctx.db.delete(args.requestId);
    return null;
  },
});

export const attachTelegramMessage = internalMutation({
  args: {
    requestId: v.id("manualVerificationRequests"),
    telegramChatId: v.string(),
    telegramMessageId: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(
      "manualVerificationRequests",
      args.requestId,
    );
    if (!request || request.status !== "pending") {
      return null;
    }

    await ctx.db.patch(args.requestId, {
      telegramChatId: args.telegramChatId,
      telegramMessageId: args.telegramMessageId,
    });

    return null;
  },
});

export const getRequest = internalQuery({
  args: { requestId: v.id("manualVerificationRequests") },
  returns: v.union(
    v.object({
      _id: v.id("manualVerificationRequests"),
      userId: v.id("users"),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
      telegramChatId: v.optional(v.string()),
      telegramMessageId: v.optional(v.number()),
      createdAt: v.number(),
      resolvedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(
      "manualVerificationRequests",
      args.requestId,
    );
    if (!request) {
      return null;
    }

    return {
      _id: request._id,
      userId: request.userId,
      status: request.status,
      telegramChatId: request.telegramChatId,
      telegramMessageId: request.telegramMessageId,
      createdAt: request.createdAt,
      resolvedAt: request.resolvedAt,
    };
  },
});

export const getRequestUser = internalQuery({
  args: { requestId: v.id("manualVerificationRequests") },
  returns: v.union(
    v.object({
      fullName: v.string(),
      phone: v.string(),
      nationalCode: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(
      "manualVerificationRequests",
      args.requestId,
    );
    if (!request) {
      return null;
    }

    const user = await ctx.db.get("users", request.userId);
    if (!user?.name || !user.phone || !user.nationalCode) {
      return null;
    }

    return {
      fullName: user.name,
      phone: user.phone,
      nationalCode: user.nationalCode,
    };
  },
});

export const approveRequest = internalMutation({
  args: { requestId: v.id("manualVerificationRequests") },
  returns: v.object({
    alreadyResolved: v.boolean(),
    userId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(
      "manualVerificationRequests",
      args.requestId,
    );
    if (!request) {
      throwUserFacingError("درخواست تأیید یافت نشد");
    }

    if (request.status !== "pending") {
      return { alreadyResolved: true, userId: request.userId };
    }

    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      status: "approved",
      resolvedAt: now,
    });
    await ctx.db.patch(request.userId, { manualVerified: true });

    return { alreadyResolved: false, userId: request.userId };
  },
});

export const rejectRequest = internalMutation({
  args: { requestId: v.id("manualVerificationRequests") },
  returns: v.object({
    alreadyResolved: v.boolean(),
    userId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(
      "manualVerificationRequests",
      args.requestId,
    );
    if (!request) {
      throwUserFacingError("درخواست تأیید یافت نشد");
    }

    if (request.status !== "pending") {
      return { alreadyResolved: true, userId: request.userId };
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      resolvedAt: Date.now(),
    });

    return { alreadyResolved: false, userId: request.userId };
  },
});

export function parseCallbackData(
  data: string,
): { action: "approve" | "reject"; requestId: Id<"manualVerificationRequests"> } | null {
  const match = data.match(/^mv:([ar]):([a-z0-9]+)$/);
  if (!match) {
    return null;
  }

  const action = match[1] === "a" ? "approve" : "reject";
  const requestId = match[2] as Id<"manualVerificationRequests">;
  return { action, requestId };
}

export function buildApproveCallbackData(
  requestId: Id<"manualVerificationRequests">,
): string {
  return `mv:a:${requestId}`;
}

export function buildRejectCallbackData(
  requestId: Id<"manualVerificationRequests">,
): string {
  return `mv:r:${requestId}`;
}
