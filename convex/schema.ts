import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { planIdValidator } from "./payments/plans";

const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("expired"),
);

const orderKindValidator = v.union(
  v.literal("subscription"),
  v.literal("wallet_topup"),
);

const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("expired"),
);

const walletTransactionTypeValidator = v.union(
  v.literal("topup"),
  v.literal("subscription_payment"),
  v.literal("subscription_refund"),
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    nationalCode: v.optional(v.string()),
    profileValidated: v.optional(v.boolean()),
    manualVerified: v.optional(v.boolean()),
    walletBalanceToman: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  orders: defineTable({
    userId: v.id("users"),
    kind: orderKindValidator,
    planId: v.optional(planIdValidator),
    amountToman: v.number(),
    walletAmountToman: v.number(),
    gatewayAmountToman: v.number(),
    status: orderStatusValidator,
    zibalTrackId: v.optional(v.string()),
    zibalRefNumber: v.optional(v.string()),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_zibalTrackId", ["zibalTrackId"])
    .index("by_status", ["status"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    orderId: v.id("orders"),
    planId: planIdValidator,
    startsAt: v.number(),
    expiresAt: v.number(),
    status: subscriptionStatusValidator,
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  walletTransactions: defineTable({
    userId: v.id("users"),
    orderId: v.optional(v.id("orders")),
    amountToman: v.number(),
    balanceAfterToman: v.number(),
    type: walletTransactionTypeValidator,
    description: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  manualVerificationRequests: defineTable({
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
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),
});
