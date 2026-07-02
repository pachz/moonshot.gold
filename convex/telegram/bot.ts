"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
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
  error_code?: number;
};

type TelegramApiResponse = {
  ok: boolean;
  description?: string;
  error_code?: number;
};

type TelegramCallResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? null;
}

function getAdminChannelId(): string | null {
  return process.env.TELEGRAM_ADMIN_CHANNEL_ID?.trim() ?? null;
}

function getTelegramApiUrl(method: string): string {
  const token = getBotToken();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const targetUrl = `https://api.telegram.org/bot${token}/${method}`;
  const telegramProxy = process.env.TELEGRAM_PROXY_URL?.trim();

  if (telegramProxy) {
    return `${telegramProxy.replace(/\/$/, "")}/${targetUrl}`;
  }

  return targetUrl;
}

function maskTelegramUrl(url: string): string {
  return url.replace(/bot[^/]+/, "bot***");
}

function mapTelegramError(description: string | undefined): string {
  if (!description) {
    return "ارسال پیام به تلگرام ناموفق بود";
  }

  const lower = description.toLowerCase();

  if (lower.includes("chat not found")) {
    return "کانال تلگرام پیدا نشد. شناسه کانال (TELEGRAM_ADMIN_CHANNEL_ID) را بررسی کنید.";
  }

  if (lower.includes("not a member") || lower.includes("have rights")) {
    return "ربات در کانال عضو نیست یا دسترسی ارسال پیام ندارد. ربات را ادمین کانال کنید.";
  }

  if (lower.includes("unauthorized")) {
    return "توکن ربات تلگرام (TELEGRAM_BOT_TOKEN) نامعتبر است.";
  }

  if (lower.includes("button_data_invalid")) {
    return "دکمه‌های تأیید/رد نامعتبر است. با پشتیبانی تماس بگیرید.";
  }

  return `خطای تلگرام: ${description}`;
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

async function callTelegramApi<T extends TelegramApiResponse>(
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramCallResult<T>> {
  const url = getTelegramApiUrl(method);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown network error";
    console.error("Telegram API network error", {
      method,
      url: maskTelegramUrl(url),
      detail,
    });
    return {
      success: false,
      message:
        "ارتباط با تلگرام برقرار نشد. اگر در ایران هستید، TELEGRAM_PROXY_URL را روی deployment تنظیم کنید.",
    };
  }

  const rawBody = await response.text();
  let data: T;
  try {
    data = JSON.parse(rawBody) as T;
  } catch {
    console.error("Telegram API returned non-JSON", {
      method,
      status: response.status,
      url: maskTelegramUrl(url),
      bodyPreview: rawBody.slice(0, 300),
    });
    return {
      success: false,
      message: `پاسخ نامعتبر از تلگرام (HTTP ${response.status})`,
    };
  }

  if (!data.ok) {
    console.error("Telegram API request failed", {
      method,
      status: response.status,
      description: data.description,
      errorCode: data.error_code,
      url: maskTelegramUrl(url),
    });
    return {
      success: false,
      message: mapTelegramError(data.description),
    };
  }

  return { success: true, data };
}

export const processWhitelistedMessage = internalAction({
  args: {
    chatId: v.number(),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.runAction(
      internal.synapse.accounts.lookupAndInitAccount,
      { username: args.text.trim() },
    );

    const sendResult = await callTelegramApi<TelegramApiResponse>("sendMessage", {
      chat_id: args.chatId,
      text: result.message,
    });

    if (!sendResult.success) {
      console.error("Failed to reply to whitelisted Telegram user", {
        chatId: args.chatId,
        message: sendResult.message,
      });
    }

    return null;
  },
});

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

    const approveData = buildApproveCallbackData(args.requestId);
    const rejectData = buildRejectCallbackData(args.requestId);
    if (approveData.length > 64 || rejectData.length > 64) {
      console.error("Telegram callback_data too long", {
        approveLength: approveData.length,
        rejectLength: rejectData.length,
      });
      return {
        success: false,
        message: "شناسه درخواست برای دکمه‌های تلگرام خیلی طولانی است",
      };
    }

    const result = await callTelegramApi<TelegramSendMessageResponse>(
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
              { text: "✅ تأیید", callback_data: approveData },
              { text: "❌ رد", callback_data: rejectData },
            ],
          ],
        },
      },
    );

    if (!result.success) {
      return { success: false, message: result.message };
    }

    const response = result.data;
    if (!response.result) {
      return {
        success: false,
        message: "پاسخ تلگرام ناقص بود",
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

    const result = await callTelegramApi<TelegramApiResponse>("editMessageText", {
      chat_id: request.telegramChatId,
      message_id: request.telegramMessageId,
      text,
      reply_markup: { inline_keyboard: [] },
    });

    if (!result.success) {
      console.error("Failed to update Telegram verification message", {
        requestId: args.requestId,
        message: result.message,
      });
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

    const result = await callTelegramApi<TelegramApiResponse>(
      "answerCallbackQuery",
      {
        callback_query_id: args.callbackQueryId,
        text: args.text,
        show_alert: false,
      },
    );

    if (!result.success) {
      console.error("Failed to answer Telegram callback", {
        message: result.message,
      });
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
