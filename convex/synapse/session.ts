import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const SESSION_KEY = "admin" as const;

const synapseUserValidator = v.object({
  id: v.number(),
  username: v.string(),
  name: v.string(),
});

const synapseSessionValidator = v.object({
  accessToken: v.string(),
  user: synapseUserValidator,
  loggedInAt: v.number(),
  lastValidatedAt: v.number(),
});

export const getStoredSession = internalQuery({
  args: {},
  returns: v.union(synapseSessionValidator, v.null()),
  handler: async (ctx) => {
    const session = await ctx.db
      .query("synapseSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", SESSION_KEY))
      .unique();

    if (!session) {
      return null;
    }

    return {
      accessToken: session.accessToken,
      user: {
        id: session.userId,
        username: session.username,
        name: session.name,
      },
      loggedInAt: session.loggedInAt,
      lastValidatedAt: session.lastValidatedAt,
    };
  },
});

export const saveSession = internalMutation({
  args: {
    accessToken: v.string(),
    user: synapseUserValidator,
    validatedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("synapseSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", SESSION_KEY))
      .unique();

    const sessionDoc = {
      sessionKey: SESSION_KEY,
      accessToken: args.accessToken,
      userId: args.user.id,
      username: args.user.username,
      name: args.user.name,
      loggedInAt: existing?.loggedInAt ?? args.validatedAt,
      lastValidatedAt: args.validatedAt,
    };

    if (existing) {
      await ctx.db.patch("synapseSessions", existing._id, sessionDoc);
      return null;
    }

    await ctx.db.insert("synapseSessions", sessionDoc);
    return null;
  },
});

export const touchValidatedAt = internalMutation({
  args: {
    validatedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("synapseSessions")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", SESSION_KEY))
      .unique();

    if (!session) {
      throw new Error("Synapse session not found");
    }

    await ctx.db.patch("synapseSessions", session._id, {
      lastValidatedAt: args.validatedAt,
    });
    return null;
  },
});
