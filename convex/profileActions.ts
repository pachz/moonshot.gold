import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { getUserFacingMessage } from "./lib/userFacingError";

type CompleteProfileResult =
  | { success: true }
  | { success: false; message: string };

export const completeProfile = action({
  args: {
    fullName: v.string(),
    nationalCode: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<CompleteProfileResult> => {
    try {
      const prepared = await ctx.runMutation(
        internal.profile.prepareProfileValidation,
        args,
      );

      const verification = await ctx.runAction(
        internal.identity.shahkar.verify,
        {
          mobile: prepared.phone,
          nationalCode: prepared.nationalCode,
        },
      );

      if (!verification.matched) {
        return {
          success: false,
          message: verification.message,
        };
      }

      await ctx.runMutation(internal.profile.finalizeValidatedProfile, {
        userId: prepared.userId,
        fullName: prepared.fullName,
        nationalCode: prepared.nationalCode,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: getUserFacingMessage(error),
      };
    }
  },
});
