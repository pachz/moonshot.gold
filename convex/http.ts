import { httpRouter } from "convex/server";
import { registerRoutes } from "convex-telegram";
import { auth } from "./auth";
import { components, internal } from "./_generated/api";
import { bot } from "./telegram/client";
import { isAllowedTelegramUser } from "./telegram/allowedUsers";

const http = httpRouter();

auth.addHttpRoutes(http);

registerRoutes(http, components.telegram, {
  handlers: {
    message: async (ctx, update) => {
      const message = update.message;
      const text = message.text?.trim();
      const userId = message.from?.id;

      if (!text || userId === undefined) {
        return;
      }

      if (!isAllowedTelegramUser(userId)) {
        return;
      }

      await ctx.runAction(internal.telegram.bot.processWhitelistedMessage, {
        chatId: message.chat.id,
        text,
      });
    },
    callback_query: async (ctx, update) => {
      const callbackQuery = update.callback_query;
      if (!callbackQuery.data || callbackQuery.id === undefined) {
        return;
      }

      await ctx.runAction(internal.telegram.bot.processCallback, {
        callbackQueryId: String(callbackQuery.id),
        callbackData: callbackQuery.data,
      });
    },
  },
});

export default http;
