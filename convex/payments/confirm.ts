import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

const confirmResultValidator = v.object({
  status: v.union(v.literal("success"), v.literal("failed")),
  kind: v.optional(
    v.union(v.literal("subscription"), v.literal("wallet_topup")),
  ),
});

type ConfirmResult = {
  status: "success" | "failed";
  kind?: "subscription" | "wallet_topup";
};

export const confirmPayment = action({
  args: {
    trackId: v.string(),
    callbackSuccess: v.boolean(),
  },
  returns: confirmResultValidator,
  handler: async (ctx, args): Promise<ConfirmResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { status: "failed" as const };
    }

    const order = await ctx.runQuery(internal.payments.orders.getOrderByTrackId, {
      zibalTrackId: args.trackId,
    });

    if (!order || order.userId !== userId) {
      return { status: "failed" as const };
    }

    return await ctx.runAction(internal.payments.zibal.processCallback, {
      trackId: args.trackId,
      callbackSuccess: args.callbackSuccess,
    });
  },
});
