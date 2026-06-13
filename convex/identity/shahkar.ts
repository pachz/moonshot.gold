"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { getProxiedUrl } from "../lib/outboundProxy";

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
      throw new Error("ZOHAL_API_TOKEN is not configured");
    }

    const response = await fetch(getProxiedUrl(SHAHKAR_API_URL), {
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

    const data = (await response.json()) as ShahkarResponse;
    const message = data.response_body?.message ?? "خطا در اعتبارسنجی اطلاعات";

    if (!response.ok || data.result !== 1) {
      return {
        matched: false,
        message,
      };
    }

    const matched = data.response_body?.data?.matched === true;
    return {
      matched,
      message: matched ? message : "کد ملی با شماره موبایل مطابقت ندارد",
    };
  },
});
