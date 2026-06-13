"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { getProxiedUrl } from "../lib/outboundProxy";
import {
  buildApproveCallbackData,
  buildRejectCallbackData,
  parseCallbackData,
} from "../manualVerification";

type TelegramSendMessageResponse = {
  ok: boolean;
  result?: {
    message_id: number;
    chat: { id: number };
  };
  description?: string;
};

type TelegramApiResponse = {
  ok: boolean;
  description?: string;
};

function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

function getAdminChannelId(): string | null {
  return process.env.TELEGRAM_ADMIN_CHANNEL_ID ?? null;
}

function getTelegramApiUrl(method: string): string {
  const token = getBotToken();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return getProxiedUrl(`https://api.telegram.org/bot${token}/${method}`);
}

function formatVerificationMessage(args: {
  fullName: string;
  phone: string;
  nationalCode: string;
  userId: string;
  requestId: string;
}): string {
  return [
    "🔔 درخواست تأیید دستی",
    "",
    `👤 نام: ${args.fullName}`,
    `📱 موبایل: ${args.phone}`,
    `🪪 کد ملی: ${args.nationalCode}`,
    `🆔 کاربر: ${args.userId}`,
    `📋 درخواست: ${args.requestId}`,
  ].join("\n");
}

async function callTelegramApi<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(getTelegramApiUrl(method), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
}

export const sendVerificationRequest = internalAction({
  args: {
    requestId: v.id("manualVerificationRequests"),
    userId: v.id("users"),
    fullName: v.string(),
    phone: v.string(),
    nationalCode: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const channelId = getAdminChannelId();
    if (!getBotToken() || !channelId) {
      return {
        success: false,
        message: "ربات تلگرام پیکربندی نشده است",
      };
    }

    let response: TelegramSendMessageResponse;
    try {
      response = await callTelegramApi<TelegramSendMessageResponse>(
        "sendMessage",
        {
          chat_id: channelId,
          text: formatVerificationMessage({
            fullName: args.fullName,
            phone: args.phone,
            nationalCode: args.nationalCode,
            userId: args.userId,
            requestId: args.requestId,
          }),
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ تأیید",
                  callback_data: buildApproveCallbackData(args.requestId),
                },
                {
                  text: "❌ رد",
                  callback_data: buildRejectCallbackData(args.requestId),
                },
              ],
            ],
          },
        },
      );
    } catch {
      return {
        success: false,
        message: "ارسال پیام به تلگرام ناموفق بود",
      };
    }

    if (!response.ok || !response.result) {
      return {
        success: false,
        message: response.description ?? "ارسال پیام به تلگرام ناموفق بود",
      };
    }

    await ctx.runMutation(internal.manualVerification.attachTelegramMessage, {
      requestId: args.requestId,
      telegramChatId: String(response.result.chat.id),
      telegramMessageId: response.result.message_id,
    });

    return {
      success: true,
      message: "درخواست تأیید ارسال شد",
    };
  },
});

export const updateVerificationMessage = internalAction({
  args: {
    requestId: v.id("manualVerificationRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!getBotToken()) {
      return null;
    }

    const request = await ctx.runQuery(internal.manualVerification.getRequest, {
      requestId: args.requestId,
    });
    if (
      !request?.telegramChatId ||
      request.telegramMessageId === undefined
    ) {
      return null;
    }

    const user = await ctx.runQuery(internal.manualVerification.getRequestUser, {
      requestId: args.requestId,
    });
    if (!user) {
      return null;
    }

    const statusLine =
      args.status === "approved"
        ? "✅ وضعیت: تأیید شد"
        : "❌ وضعیت: رد شد";

    const text = [
      formatVerificationMessage({
        fullName: user.fullName,
        phone: user.phone,
        nationalCode: user.nationalCode,
        userId: request.userId,
        requestId: args.requestId,
      }),
      "",
      statusLine,
    ].join("\n");

    try {
      await callTelegramApi<TelegramApiResponse>("editMessageText", {
        chat_id: request.telegramChatId,
        message_id: request.telegramMessageId,
        text,
        reply_markup: { inline_keyboard: [] },
      });
    } catch {
      return null;
    }

    return null;
  },
});

export const answerCallbackQuery = internalAction({
  args: {
    callbackQueryId: v.string(),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    if (!getBotToken()) {
      return null;
    }

    try {
      await callTelegramApi<TelegramApiResponse>("answerCallbackQuery", {
        callback_query_id: args.callbackQueryId,
        text: args.text,
        show_alert: false,
      });
    } catch {
      return null;
    }

    return null;
  },
});

export const processCallback = internalAction({
  args: {
    callbackQueryId: v.string(),
    callbackData: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const parsed = parseCallbackData(args.callbackData);

    if (!parsed) {
      await ctx.runAction(internal.telegram.bot.answerCallbackQuery, {
        callbackQueryId: args.callbackQueryId,
        text: "درخواست نامعتبر",
      });
      return null;
    }

    const { action, requestId } = parsed;

    if (action === "approve") {
      const result = await ctx.runMutation(
        internal.manualVerification.approveRequest,
        { requestId },
      );
      await ctx.runAction(internal.telegram.bot.updateVerificationMessage, {
        requestId,
        status: "approved",
      });
      await ctx.runAction(internal.telegram.bot.answerCallbackQuery, {
        callbackQueryId: args.callbackQueryId,
        text: result.alreadyResolved ? "قبلاً بررسی شده" : "کاربر تأیید شد",
      });
      return null;
    }

    const result = await ctx.runMutation(
      internal.manualVerification.rejectRequest,
      { requestId },
    );
    await ctx.runAction(internal.telegram.bot.updateVerificationMessage, {
      requestId,
      status: "rejected",
    });
    await ctx.runAction(internal.telegram.bot.answerCallbackQuery, {
      callbackQueryId: args.callbackQueryId,
      text: result.alreadyResolved ? "قبلاً بررسی شده" : "درخواست رد شد",
    });

    return null;
  },
});
