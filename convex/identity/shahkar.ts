"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { getProxiedUrl } from "../lib/outboundProxy";
import { mapShahkarResponse } from "./shahkarMessages";

const SHAHKAR_API_URL =
  process.env.SHAHKAR_API_URL ??
  "https://service.zohal.io/api/v0/services/inquiry/shahkar";

type ShahkarResponse = {
  result: number;
  response_body: {
    data: {
      matched?: boolean;
    };
    error_code: string | null;
    message: string;
  };
};

export const verify = internalAction({
  args: {
    mobile: v.string(),
    nationalCode: v.string(),
  },
  returns: v.object({
    matched: v.boolean(),
    message: v.string(),
  }),
  handler: async (_ctx, args) => {
    const token = process.env.ZOHAL_API_TOKEN;
    if (!token) {
      return {
        matched: false,
        message: "سرویس تأیید هویت در دسترس نیست. لطفاً بعداً تلاش کنید.",
      };
    }

    let response: Response;
    try {
      response = await fetch(getProxiedUrl(SHAHKAR_API_URL), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobile: args.mobile,
          national_code: args.nationalCode,
        }),
      });
    } catch {
      return {
        matched: false,
        message: "ارتباط با سرویس تأیید هویت برقرار نشد. لطفاً دوباره تلاش کنید.",
      };
    }

    let data: ShahkarResponse;
    try {
      data = (await response.json()) as ShahkarResponse;
    } catch {
      return {
        matched: false,
        message: "پاسخ نامعتبر از سرویس تأیید هویت دریافت شد.",
      };
    }

    const errorCode = data.response_body?.error_code ?? null;
    const apiMessage = data.response_body?.message ?? "";

    if (!response.ok || data.result !== 1) {
      return {
        matched: false,
        message: mapShahkarResponse(false, errorCode, apiMessage),
      };
    }

    const matched = data.response_body?.data?.matched === true;
    return {
      matched,
      message: mapShahkarResponse(
        matched,
        errorCode,
        matched ? apiMessage || "اطلاعات با موفقیت تأیید شد" : apiMessage,
      ),
    };
  },
});
