import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

type TelegramUpdate = {
  callback_query?: {
    id: string | number;
    data?: string;
  };
};

export const handleTelegramWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (header !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const callbackQuery = update.callback_query;
  if (callbackQuery?.data && callbackQuery.id !== undefined) {
    await ctx.runAction(internal.telegram.bot.processCallback, {
      callbackQueryId: String(callbackQuery.id),
      callbackData: callbackQuery.data,
    });
  }

  return new Response("ok");
});
