import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { action } from "../_generated/server";
import { getUserFacingMessage } from "../lib/userFacingError";
import { paymentMethodValidator, planIdValidator } from "./plans";

const initiateResultValidator = v.object({
  success: v.boolean(),
  paymentUrl: v.optional(v.string()),
  completed: v.optional(v.boolean()),
  message: v.optional(v.string()),
});

type InitiateResult = {
  success: boolean;
  paymentUrl?: string;
  completed?: boolean;
  message?: string;
};

async function startGatewayPayment(
  ctx: ActionCtx,
  prepared: {
    orderId: Id<"orders">;
    gatewayAmountToman: number;
    description: string;
    phone?: string;
    nationalCode?: string;
  },
): Promise<InitiateResult> {
  const zibal = await ctx.runAction(internal.payments.zibal.requestPayment, {
    orderId: prepared.orderId,
    amountToman: prepared.gatewayAmountToman,
    description: prepared.description,
    phone: prepared.phone,
    nationalCode: prepared.nationalCode,
  });

  if (!zibal.success || !zibal.paymentUrl) {
    await ctx.runMutation(internal.payments.orders.markOrderFailed, {
      orderId: prepared.orderId,
    });
    return {
      success: false,
      message: zibal.message,
    };
  }

  return {
    success: true,
    paymentUrl: zibal.paymentUrl,
  };
}

export const initiateSubscriptionPayment = action({
  args: {
    planId: planIdValidator,
    paymentMethod: paymentMethodValidator,
  },
  returns: initiateResultValidator,
  handler: async (ctx, args): Promise<InitiateResult> => {
    try {
      const prepared = await ctx.runMutation(
        internal.payments.orders.prepareSubscriptionPayment,
        {
          planId: args.planId,
          paymentMethod: args.paymentMethod,
        },
      );

      if (!prepared.requiresGateway) {
        await ctx.runMutation(
          internal.payments.orders.completePaidSubscription,
          {
            orderId: prepared.orderId,
            paidAt: Date.now(),
          },
        );

        return {
          success: true,
          completed: true,
        };
      }

      return await startGatewayPayment(ctx, prepared);
    } catch (error) {
      return {
        success: false,
        message: getUserFacingMessage(error),
      };
    }
  },
});

export const initiateWalletTopup = action({
  args: { amountToman: v.number() },
  returns: initiateResultValidator,
  handler: async (ctx, args): Promise<InitiateResult> => {
    try {
      const prepared = await ctx.runMutation(
        internal.payments.orders.prepareWalletTopup,
        { amountToman: args.amountToman },
      );

      return await startGatewayPayment(ctx, prepared);
    } catch (error) {
      return {
        success: false,
        message: getUserFacingMessage(error),
      };
    }
  },
});

// Backward-compatible alias for any existing callers.
export const initiatePayment = initiateSubscriptionPayment;
