"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

function getKavenegarApiUrl(): string {
  const token = process.env.KAVENEGAR_TOKEN;
  if (!token) {
    throw new Error("KAVENEGAR_TOKEN is not configured");
  }

  const baseUrl = `https://api.kavenegar.com/v1/${token}/verify/lookup.json`;
  const proxyUrl = process.env.KAVENEGAR_PROXY_URL;

  if (proxyUrl) {
    return `${proxyUrl.replace(/\/$/, "")}/${baseUrl}`;
  }

  return baseUrl;
}

async function sendSMS(phoneNumber: string, code: string): Promise<void> {
  const template = process.env.KAVENEGAR_TEMPLATE ?? "moonshot-verify";
  const response = await fetch(getKavenegarApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      receptor: phoneNumber,
      token: code,
      template,
      type: "sms",
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Kavenegar API responded with status: ${response.status}`);
  }

  const data = (await response.json()) as { return?: { status?: number } };
  if (data.return?.status !== 200) {
    console.error("Kavenegar API error:", data);
    throw new Error("Failed to send verification code");
  }
}

export const sendOTP = internalAction({
  args: {
    phoneNumber: v.string(),
    code: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (_ctx, args) => {
    await sendSMS(args.phoneNumber, args.code);
    return { success: true };
  },
});
