"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { generateTotp, getTotpSecret } from "./totpLib";

export const generateCode = internalAction({
  args: {},
  returns: v.string(),
  handler: async () => {
    return generateTotp(getTotpSecret());
  },
});
