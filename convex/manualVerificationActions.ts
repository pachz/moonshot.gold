import { v } from "convex/values";
import { action } from "./_generated/server";
import { getUserFacingMessage } from "./lib/userFacingError";
import { internal } from "./_generated/api";

type RequestVerificationResult = {
  success: boolean;
  message: string;
};

export const requestVerification = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx): Promise<RequestVerificationResult> => {
    try {
      const prepared = await ctx.runMutation(
        internal.manualVerification.prepareRequest,
      );

      const sent = await ctx.runAction(
        internal.telegram.bot.sendVerificationRequest,
        prepared,
      );

      if (!sent.success) {
        await ctx.runMutation(internal.manualVerification.cancelPendingRequest, {
          requestId: prepared.requestId,
        });
        return { success: false, message: sent.message };
      }

      return { success: true, message: sent.message };
    } catch (error) {
      return {
        success: false,
        message: getUserFacingMessage(error),
      };
    }
  },
});
