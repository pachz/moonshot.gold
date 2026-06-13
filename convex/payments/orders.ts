import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, internalQuery, query } from "../_generated/server";
import {
  formatRateLimitMessage,
  getUserFacingMessage,
  throwUserFacingError,
} from "../lib/userFacingError";
import { rateLimiter } from "../ratelimiter";
import {
  getPlanAmountToman,
  getPlanName,
  isPlanId,
  MAX_WALLET_TOPUP_TOMAN,
  MIN_WALLET_TOPUP_TOMAN,
  paymentMethodValidator,
  planIdValidator,
  SUBSCRIPTION_DURATION_MS,
  type PaymentMethod,
  type PlanId,
} from "./plans";
import { assertWithinDailyPaymentLimit } from "./limits";

const activeSubscriptionValidator = v.union(
  v.object({
    planId: planIdValidator,
    startsAt: v.number(),
    expiresAt: v.number(),
  }),
  v.null(),
);

const paymentSplitValidator = v.object({
  totalToman: v.number(),
  walletAmountToman: v.number(),
  gatewayAmountToman: v.number(),
  walletBalanceToman: v.number(),
  canPay: v.boolean(),
  message: v.optional(v.string()),
});

function getWalletBalanceToman(
  walletBalanceToman: number | undefined,
): number {
  return walletBalanceToman ?? 0;
}

function calculatePaymentSplit(
  totalToman: number,
  walletBalanceToman: number,
  paymentMethod: PaymentMethod,
): {
  walletAmountToman: number;
  gatewayAmountToman: number;
} {
  if (paymentMethod === "gateway") {
    return { walletAmountToman: 0, gatewayAmountToman: totalToman };
  }

  if (paymentMethod === "wallet") {
    if (walletBalanceToman < totalToman) {
      throwUserFacingError("موجودی کیف پول برای پرداخت کامل کافی نیست");
    }
    return { walletAmountToman: totalToman, gatewayAmountToman: 0 };
  }

  const walletAmountToman = Math.min(walletBalanceToman, totalToman);
  const gatewayAmountToman = totalToman - walletAmountToman;

  if (walletAmountToman <= 0) {
    throwUserFacingError("موجودی کیف پول برای پرداخت ترکیبی کافی نیست");
  }

  return { walletAmountToman, gatewayAmountToman };
}

async function assertNoActiveSubscription(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
) {
  const existingSubscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_user_and_status", (q) =>
      q.eq("userId", userId).eq("status", "active"),
    )
    .first();

  if (existingSubscription && existingSubscription.expiresAt > Date.now()) {
    throwUserFacingError("شما در حال حاضر عضویت فعال دارید");
  }
}

async function assertProfileValidatedUser(ctx: QueryCtx | MutationCtx) {
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

  return { userId, user };
}

async function assertCanPay(ctx: QueryCtx | MutationCtx) {
  const { userId, user } = await assertProfileValidatedUser(ctx);

  if (user.manualVerified !== true) {
    throwUserFacingError("برای پرداخت ابتدا باید تأیید دستی انجام شود");
  }

  return { userId, user };
}

async function enforcePaymentRateLimit(
  ctx: MutationCtx,
  phone: string | undefined,
) {
  if (!phone) {
    return;
  }

  const minuteStatus = await rateLimiter.limit(ctx, "initiatePayment", {
    key: phone,
    throws: false,
  });
  if (!minuteStatus.ok) {
    throwUserFacingError(
      formatRateLimitMessage("initiatePayment", minuteStatus.retryAfter),
    );
  }
}

export const activeSubscription = query({
  args: { now: v.number() },
  returns: activeSubscriptionValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "active"),
      )
      .first();

    if (!subscription || subscription.expiresAt <= args.now) {
      return null;
    }

    return {
      planId: subscription.planId,
      startsAt: subscription.startsAt,
      expiresAt: subscription.expiresAt,
    };
  },
});

export const getPaymentPreview = query({
  args: {
    planId: planIdValidator,
    paymentMethod: paymentMethodValidator,
  },
  returns: paymentSplitValidator,
  handler: async (ctx, args) => {
    const { user } = await assertCanPay(ctx);
    const totalToman = getPlanAmountToman(args.planId);
    const walletBalanceToman = getWalletBalanceToman(user.walletBalanceToman);

    try {
      const split = calculatePaymentSplit(
        totalToman,
        walletBalanceToman,
        args.paymentMethod,
      );

      return {
        totalToman,
        walletBalanceToman,
        ...split,
        canPay: true,
      };
    } catch (error) {
      return {
        totalToman,
        walletBalanceToman,
        walletAmountToman: 0,
        gatewayAmountToman: totalToman,
        canPay: false,
        message: getUserFacingMessage(error),
      };
    }
  },
});

export const prepareSubscriptionPayment = internalMutation({
  args: {
    planId: planIdValidator,
    paymentMethod: paymentMethodValidator,
  },
  returns: v.object({
    orderId: v.id("orders"),
    userId: v.id("users"),
    amountToman: v.number(),
    walletAmountToman: v.number(),
    gatewayAmountToman: v.number(),
    planId: planIdValidator,
    phone: v.optional(v.string()),
    nationalCode: v.optional(v.string()),
    description: v.string(),
    requiresGateway: v.boolean(),
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

    if (user.profileValidated !== true) {
      throwUserFacingError("ابتدا پروفایل خود را تکمیل کنید");
    }

    if (user.manualVerified !== true) {
      throwUserFacingError("برای پرداخت ابتدا باید تأیید دستی انجام شود");
    }

    await assertNoActiveSubscription(ctx, userId);
    await enforcePaymentRateLimit(ctx, user.phone);

    const amountToman = getPlanAmountToman(args.planId);
    await assertWithinDailyPaymentLimit(ctx, userId, amountToman);

    const walletBalanceToman = getWalletBalanceToman(user.walletBalanceToman);
    const split = calculatePaymentSplit(
      amountToman,
      walletBalanceToman,
      args.paymentMethod,
    );

    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      userId,
      kind: "subscription",
      planId: args.planId,
      amountToman,
      walletAmountToman: split.walletAmountToman,
      gatewayAmountToman: split.gatewayAmountToman,
      status: "pending",
      createdAt: now,
    });

    if (split.walletAmountToman > 0) {
      await ctx.runMutation(internal.payments.wallet.debitWallet, {
        userId,
        amountToman: split.walletAmountToman,
        orderId,
        description: `پرداخت عضویت ${getPlanName(args.planId)}`,
      });
    }

    return {
      orderId,
      userId,
      amountToman,
      walletAmountToman: split.walletAmountToman,
      gatewayAmountToman: split.gatewayAmountToman,
      planId: args.planId,
      phone: user.phone,
      nationalCode: user.nationalCode,
      description: `عضویت ${getPlanName(args.planId)} — ماه‌شات`,
      requiresGateway: split.gatewayAmountToman > 0,
    };
  },
});

export const prepareWalletTopup = internalMutation({
  args: { amountToman: v.number() },
  returns: v.object({
    orderId: v.id("orders"),
    userId: v.id("users"),
    amountToman: v.number(),
    walletAmountToman: v.number(),
    gatewayAmountToman: v.number(),
    phone: v.optional(v.string()),
    nationalCode: v.optional(v.string()),
    description: v.string(),
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

    if (user.profileValidated !== true) {
      throwUserFacingError("ابتدا پروفایل خود را تکمیل کنید");
    }

    if (user.manualVerified !== true) {
      throwUserFacingError("برای پرداخت ابتدا باید تأیید دستی انجام شود");
    }

    if (
      args.amountToman < MIN_WALLET_TOPUP_TOMAN ||
      args.amountToman > MAX_WALLET_TOPUP_TOMAN
    ) {
      throwUserFacingError(
        `مبلغ شارژ باید بین ${MIN_WALLET_TOPUP_TOMAN.toLocaleString("fa-IR")} و ${MAX_WALLET_TOPUP_TOMAN.toLocaleString("fa-IR")} تومان باشد`,
      );
    }

    await enforcePaymentRateLimit(ctx, user.phone);
    await assertWithinDailyPaymentLimit(ctx, userId, args.amountToman);

    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      userId,
      kind: "wallet_topup",
      amountToman: args.amountToman,
      walletAmountToman: 0,
      gatewayAmountToman: args.amountToman,
      status: "pending",
      createdAt: now,
    });

    return {
      orderId,
      userId,
      amountToman: args.amountToman,
      walletAmountToman: 0,
      gatewayAmountToman: args.amountToman,
      phone: user.phone,
      nationalCode: user.nationalCode,
      description: `شارژ کیف پول — ماه‌شات`,
    };
  },
});

export const attachTrackId = internalMutation({
  args: {
    orderId: v.id("orders"),
    zibalTrackId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      throwUserFacingError("سفارش یافت نشد");
    }

    if (order.status !== "pending") {
      throwUserFacingError("وضعیت سفارش برای پرداخت معتبر نیست");
    }

    await ctx.db.patch(args.orderId, {
      zibalTrackId: args.zibalTrackId,
    });

    return null;
  },
});

export const getOrderByTrackId = internalQuery({
  args: { zibalTrackId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("orders"),
      userId: v.id("users"),
      kind: v.union(v.literal("subscription"), v.literal("wallet_topup")),
      planId: v.optional(planIdValidator),
      amountToman: v.number(),
      walletAmountToman: v.number(),
      gatewayAmountToman: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("failed"),
        v.literal("expired"),
      ),
      zibalTrackId: v.optional(v.string()),
      zibalRefNumber: v.optional(v.string()),
      createdAt: v.number(),
      paidAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_zibalTrackId", (q) =>
        q.eq("zibalTrackId", args.zibalTrackId),
      )
      .unique();

    if (!order) {
      return null;
    }

    return {
      _id: order._id,
      userId: order.userId,
      kind: order.kind,
      planId: order.planId,
      amountToman: order.amountToman,
      walletAmountToman: order.walletAmountToman,
      gatewayAmountToman: order.gatewayAmountToman,
      status: order.status,
      zibalTrackId: order.zibalTrackId,
      zibalRefNumber: order.zibalRefNumber,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    };
  },
});

export const markOrderFailed = internalMutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order || order.status === "paid") {
      return null;
    }

    if (order.walletAmountToman > 0) {
      await ctx.runMutation(internal.payments.wallet.creditWallet, {
        userId: order.userId,
        amountToman: order.walletAmountToman,
        orderId: order._id,
        type: "subscription_refund",
        description:
          order.kind === "wallet_topup"
            ? "بازگشت وجه ناموفق شارژ کیف پول"
            : "بازگشت وجه کیف پول — پرداخت ناموفق",
      });
    }

    await ctx.db.patch(args.orderId, {
      status: "failed",
      walletAmountToman: 0,
    });

    return null;
  },
});

export const completePaidSubscription = internalMutation({
  args: {
    orderId: v.id("orders"),
    zibalRefNumber: v.optional(v.string()),
    paidAt: v.number(),
  },
  returns: v.object({
    alreadyPaid: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      throwUserFacingError("سفارش یافت نشد");
    }

    if (order.kind !== "subscription" || !order.planId) {
      throwUserFacingError("سفارش عضویت معتبر نیست");
    }

    if (order.status === "paid") {
      return { alreadyPaid: true };
    }

    if (order.status !== "pending") {
      throwUserFacingError("وضعیت سفارش برای تأیید پرداخت معتبر نیست");
    }

    await ctx.db.patch(args.orderId, {
      status: "paid",
      paidAt: args.paidAt,
      zibalRefNumber: args.zibalRefNumber,
    });

    const startsAt = args.paidAt;
    const expiresAt = startsAt + SUBSCRIPTION_DURATION_MS;

    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", order.userId).eq("status", "active"),
      )
      .collect();

    for (const subscription of activeSubscriptions) {
      await ctx.db.patch(subscription._id, { status: "expired" });
    }

    await ctx.db.insert("subscriptions", {
      userId: order.userId,
      orderId: args.orderId,
      planId: order.planId,
      startsAt,
      expiresAt,
      status: "active",
    });

    return { alreadyPaid: false };
  },
});

export const completeWalletTopup = internalMutation({
  args: {
    orderId: v.id("orders"),
    zibalRefNumber: v.optional(v.string()),
    paidAt: v.number(),
  },
  returns: v.object({
    alreadyPaid: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      throwUserFacingError("سفارش یافت نشد");
    }

    if (order.kind !== "wallet_topup") {
      throwUserFacingError("سفارش شارژ کیف پول معتبر نیست");
    }

    if (order.status === "paid") {
      return { alreadyPaid: true };
    }

    if (order.status !== "pending") {
      throwUserFacingError("وضعیت سفارش برای تأیید پرداخت معتبر نیست");
    }

    await ctx.db.patch(args.orderId, {
      status: "paid",
      paidAt: args.paidAt,
      zibalRefNumber: args.zibalRefNumber,
    });

    await ctx.runMutation(internal.payments.wallet.creditWallet, {
      userId: order.userId,
      amountToman: order.amountToman,
      orderId: args.orderId,
      type: "topup",
      description: "شارژ کیف پول",
    });

    const user = await ctx.db.get("users", order.userId);
    if (user?.phone) {
      await ctx.scheduler.runAfter(0, internal.sms.kavenegar.sendWalletTopupSms, {
        phoneNumber: user.phone,
        amountToman: order.amountToman,
      });
    }

    return { alreadyPaid: false };
  },
});

export function assertValidPlanId(planId: string): asserts planId is PlanId {
  if (!isPlanId(planId)) {
    throwUserFacingError("پلن انتخاب‌شده معتبر نیست");
  }
}
