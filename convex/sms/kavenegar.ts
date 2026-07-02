"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { getProxiedUrl } from "../lib/outboundProxy";
import { outboundFetch } from "../lib/outboundFetch";

function getKavenegarApiUrl(): string {
  const token = process.env.KAVENEGAR_TOKEN;
  if (!token) {
    throw new Error("KAVENEGAR_TOKEN is not configured");
  }

  return getProxiedUrl(
    `https://api.kavenegar.com/v1/${token}/verify/lookup.json`,
  );
}

async function sendLookupSms(params: {
  phoneNumber: string;
  template: string;
  token: string;
}): Promise<void> {
  const response = await outboundFetch({
    url: getKavenegarApiUrl(),
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        receptor: params.phoneNumber,
        token: params.token,
        template: params.template,
        type: "sms",
      }).toString(),
    },
  });

  if (!response.ok) {
    throw new Error(`Kavenegar API responded with status: ${response.status}`);
  }

  const data = (await response.json()) as { return?: { status?: number } };
  if (data.return?.status !== 200) {
    console.error("Kavenegar API error:", data);
    throw new Error("Kavenegar lookup request failed");
  }
}

function formatToman(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount);
}

export const sendOTP = internalAction({
  args: {
    phoneNumber: v.string(),
    code: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (_ctx, args) => {
    const template = process.env.KAVENEGAR_TEMPLATE ?? "moonshot-verify";
    await sendLookupSms({
      phoneNumber: args.phoneNumber,
      template,
      token: args.code,
    });
    return { success: true };
  },
});

export const sendWalletTopupSms = internalAction({
  args: {
    phoneNumber: v.string(),
    amountToman: v.number(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (_ctx, args) => {
    try {
      const template =
        process.env.KAVENEGAR_TOPUP_TEMPLATE ?? "moonshot-topup";
      await sendLookupSms({
        phoneNumber: args.phoneNumber,
        template,
        token: formatToman(args.amountToman),
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to send wallet topup SMS:", {
        phoneNumber: args.phoneNumber,
        amountToman: args.amountToman,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { success: false };
    }
  },
});
