"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { bot } from "./client";

export const setupWebhook = action({
  args: {},
  returns: v.object({
    botUsername: v.string(),
    webhookUrl: v.string(),
  }),
  handler: async (ctx) => {
    return await bot.setupWebhook(ctx, {
      allowedUpdates: ["message", "callback_query"],
    });
  },
});
