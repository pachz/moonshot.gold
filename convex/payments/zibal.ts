"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { getProxiedUrl } from "../lib/outboundProxy";
import { tomanToRials } from "./currency";

const ZIBAL_REQUEST_URL =
  process.env.ZIBAL_REQUEST_URL ?? "https://gateway.zibal.ir/v1/request";
const ZIBAL_VERIFY_URL =
  process.env.ZIBAL_VERIFY_URL ?? "https://gateway.zibal.ir/v1/verify";
const ZIBAL_START_URL =
  process.env.ZIBAL_START_URL ?? "https://gateway.zibal.ir/start";

type ZibalRequestResponse = {
  result: number;
  message?: string;
  trackId?: number | string;
};

type ZibalVerifyResponse = {
  result: number;
  message?: string;
  amount?: number;
  refNumber?: string | number;
  paidAt?: string;
  status?: number;
};

const callbackResultValidator = v.object({
  status: v.union(v.literal("success"), v.literal("failed")),
  kind: v.optional(
    v.union(v.literal("subscription"), v.literal("wallet_topup")),
  ),
});

type CallbackResult = {
  status: "success" | "failed";
  kind?: "subscription" | "wallet_topup";
};

function getZibalMerchant(): string | null {
  return process.env.ZIBAL_MERCHANT ?? null;
}

function getZibalCallbackUrl(): string | null {
  if (process.env.ZIBAL_CALLBACK_URL) {
    return process.env.ZIBAL_CALLBACK_URL;
  }

  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) {
    return null;
  }

  return `${siteUrl.replace(/\/$/, "")}/zibal/callback`;
}

function getPaymentStartUrl(trackId: string): string {
  return `${ZIBAL_START_URL.replace(/\/$/, "")}/${trackId}`;
}

async function postToZibal<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(getProxiedUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
}

export const requestPayment = internalAction({
  args: {
    orderId: v.id("orders"),
    amountToman: v.number(),
    description: v.string(),
    phone: v.optional(v.string()),
    nationalCode: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    paymentUrl: v.optional(v.string()),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const merchant = getZibalMerchant();
    const callbackUrl = getZibalCallbackUrl();

    if (!merchant) {
      return {
        success: false,
        message: "درگاه پرداخت پیکربندی نشده است",
      };
    }

    if (!callbackUrl) {
      return {
        success: false,
        message: "آدرس بازگشت از درگاه پرداخت پیکربندی نشده است",
      };
    }

    const amountRials = tomanToRials(args.amountToman);

    let data: ZibalRequestResponse;
    try {
      data = await postToZibal<ZibalRequestResponse>(ZIBAL_REQUEST_URL, {
        merchant,
        amount: amountRials,
        callbackUrl,
        description: args.description,
        orderId: args.orderId,
        ...(args.phone ? { mobile: args.phone } : {}),
        ...(args.nationalCode ? { nationalCode: args.nationalCode } : {}),
      });
    } catch {
      return {
        success: false,
        message: "ارتباط با درگاه پرداخت برقرار نشد. لطفاً دوباره تلاش کنید.",
      };
    }

    if (data.result !== 100 || data.trackId === undefined) {
      return {
        success: false,
        message: data.message ?? "ایجاد درخواست پرداخت ناموفق بود",
      };
    }

    const trackId = String(data.trackId);

    await ctx.runMutation(internal.payments.orders.attachTrackId, {
      orderId: args.orderId,
      zibalTrackId: trackId,
    });

    return {
      success: true,
      paymentUrl: getPaymentStartUrl(trackId),
      message: "درخواست پرداخت با موفقیت ایجاد شد",
    };
  },
});

export const processCallback = internalAction({
  args: {
    trackId: v.string(),
    callbackSuccess: v.boolean(),
  },
  returns: callbackResultValidator,
  handler: async (ctx, args): Promise<CallbackResult> => {
    const order = await ctx.runQuery(internal.payments.orders.getOrderByTrackId, {
      zibalTrackId: args.trackId,
    });

    if (!order) {
      return { status: "failed" };
    }

    if (order.status === "paid") {
      return { status: "success", kind: order.kind };
    }

    if (!args.callbackSuccess) {
      await ctx.runMutation(internal.payments.orders.markOrderFailed, {
        orderId: order._id,
      });
      return { status: "failed", kind: order.kind };
    }

    const merchant = getZibalMerchant();
    if (!merchant) {
      await ctx.runMutation(internal.payments.orders.markOrderFailed, {
        orderId: order._id,
      });
      return { status: "failed", kind: order.kind };
    }

    let verifyData: ZibalVerifyResponse;
    try {
      verifyData = await postToZibal<ZibalVerifyResponse>(ZIBAL_VERIFY_URL, {
        merchant,
        trackId: args.trackId,
      });
    } catch {
      await ctx.runMutation(internal.payments.orders.markOrderFailed, {
        orderId: order._id,
      });
      return { status: "failed", kind: order.kind };
    }

    const verified =
      verifyData.result === 100 || verifyData.result === 201;
    const expectedRials = tomanToRials(order.gatewayAmountToman);
    const amountMatches =
      verifyData.amount === undefined || verifyData.amount === expectedRials;

    if (!verified || !amountMatches) {
      await ctx.runMutation(internal.payments.orders.markOrderFailed, {
        orderId: order._id,
      });
      return { status: "failed", kind: order.kind };
    }

    const paidAt = verifyData.paidAt
      ? Date.parse(verifyData.paidAt)
      : Date.now();
    const resolvedPaidAt = Number.isNaN(paidAt) ? Date.now() : paidAt;
    const refNumber =
      verifyData.refNumber !== undefined
        ? String(verifyData.refNumber)
        : undefined;

    if (order.kind === "wallet_topup") {
      await ctx.runMutation(internal.payments.orders.completeWalletTopup, {
        orderId: order._id,
        zibalRefNumber: refNumber,
        paidAt: resolvedPaidAt,
      });
      return { status: "success", kind: "wallet_topup" };
    }

    await ctx.runMutation(internal.payments.orders.completePaidSubscription, {
      orderId: order._id,
      zibalRefNumber: refNumber,
      paidAt: resolvedPaidAt,
    });

    return { status: "success", kind: "subscription" };
  },
});
