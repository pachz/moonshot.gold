import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { throwUserFacingError } from "../lib/userFacingError";

const walletTransactionValidator = v.object({
  _id: v.id("walletTransactions"),
  amountToman: v.number(),
  balanceAfterToman: v.number(),
  type: v.union(
    v.literal("topup"),
    v.literal("subscription_payment"),
    v.literal("subscription_refund"),
  ),
  description: v.string(),
  createdAt: v.number(),
});

export const balance = query({
  args: {},
  returns: v.object({
    balanceToman: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { balanceToman: 0 };
    }

    const user = await ctx.db.get("users", userId);
    return { balanceToman: user?.walletBalanceToman ?? 0 };
  },
});

export const recentTransactions = query({
  args: {},
  returns: v.array(walletTransactionValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const transactions = await ctx.db
      .query("walletTransactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    return transactions.map((transaction) => ({
      _id: transaction._id,
      amountToman: transaction.amountToman,
      balanceAfterToman: transaction.balanceAfterToman,
      type: transaction.type,
      description: transaction.description,
      createdAt: transaction.createdAt,
    }));
  },
});

export const creditWallet = internalMutation({
  args: {
    userId: v.id("users"),
    amountToman: v.number(),
    orderId: v.optional(v.id("orders")),
    type: v.union(v.literal("topup"), v.literal("subscription_refund")),
    description: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (args.amountToman <= 0) {
      throwUserFacingError("مبلغ کیف پول معتبر نیست");
    }

    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throwUserFacingError("کاربر یافت نشد");
    }

    const currentBalance = user.walletBalanceToman ?? 0;
    const newBalance = currentBalance + args.amountToman;

    await ctx.db.patch(args.userId, { walletBalanceToman: newBalance });
    await ctx.db.insert("walletTransactions", {
      userId: args.userId,
      orderId: args.orderId,
      amountToman: args.amountToman,
      balanceAfterToman: newBalance,
      type: args.type,
      description: args.description,
      createdAt: Date.now(),
    });

    return newBalance;
  },
});

export const debitWallet = internalMutation({
  args: {
    userId: v.id("users"),
    amountToman: v.number(),
    orderId: v.id("orders"),
    description: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (args.amountToman <= 0) {
      throwUserFacingError("مبلغ کیف پول معتبر نیست");
    }

    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throwUserFacingError("کاربر یافت نشد");
    }

    const currentBalance = user.walletBalanceToman ?? 0;
    if (currentBalance < args.amountToman) {
      throwUserFacingError("موجودی کیف پول کافی نیست");
    }

    const newBalance = currentBalance - args.amountToman;

    await ctx.db.patch(args.userId, { walletBalanceToman: newBalance });
    await ctx.db.insert("walletTransactions", {
      userId: args.userId,
      orderId: args.orderId,
      amountToman: -args.amountToman,
      balanceAfterToman: newBalance,
      type: "subscription_payment",
      description: args.description,
      createdAt: Date.now(),
    });

    return newBalance;
  },
});
