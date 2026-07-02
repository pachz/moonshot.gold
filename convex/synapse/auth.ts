"use node";

import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { generateTotp, getTotpSecret } from "./totpLib";
import { synapseFetch } from "./client";

type SynapseUser = {
  id: number;
  username: string;
  name: string;
};

type LoginResponse = {
  accessToken?: string;
  user?: SynapseUser;
  message?: string;
};

function getSynapseCredentials(): { username: string; password: string } {
  const username = process.env.SYNAPSE_USERNAME?.trim();
  const password = process.env.SYNAPSE_PASSWORD?.trim();

  if (!username) {
    throw new Error("SYNAPSE_USERNAME is not configured");
  }
  if (!password) {
    throw new Error("SYNAPSE_PASSWORD is not configured");
  }

  return { username, password };
}

function isAuthError(status: number): boolean {
  return status === 401 || status === 403;
}

function withBearerToken(
  headers: HeadersInit | undefined,
  accessToken: string,
): HeadersInit {
  const merged = new Headers(headers);
  merged.set("Authorization", `Bearer ${accessToken}`);
  if (!merged.has("Accept")) {
    merged.set("Accept", "application/json");
  }
  return merged;
}

async function loginOnce(): Promise<{ accessToken: string; user: SynapseUser }> {
  const { username, password } = getSynapseCredentials();
  const otp = generateTotp(getTotpSecret());

  const response = await synapseFetch("/v1/auth/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      username,
      otp,
      password,
      rememberMe: true,
    }),
  });

  const data = (await response.json()) as LoginResponse;

  if (!response.ok || !data.accessToken || !data.user) {
    console.error("Synapse login failed:", {
      status: response.status,
      message: data.message,
    });
    throw new Error(data.message ?? "Synapse login failed");
  }

  return {
    accessToken: data.accessToken,
    user: data.user,
  };
}

async function loginWithRetry(): Promise<{
  accessToken: string;
  user: SynapseUser;
}> {
  try {
    return await loginOnce();
  } catch (error) {
    console.warn("Synapse login failed, retrying once:", error);
    return await loginOnce();
  }
}

async function refreshAndSaveSession(ctx: ActionCtx): Promise<string> {
  const login = await loginWithRetry();
  await ctx.runMutation(internal.synapse.session.saveSession, {
    accessToken: login.accessToken,
    user: login.user,
    validatedAt: Date.now(),
  });
  return login.accessToken;
}

async function getAccessTokenOrLogin(ctx: ActionCtx): Promise<string> {
  const stored = await ctx.runQuery(internal.synapse.session.getStoredSession);
  if (stored) {
    return stored.accessToken;
  }
  return await refreshAndSaveSession(ctx);
}

export async function synapseRequestWithAuth(
  ctx: ActionCtx,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  let accessToken = await getAccessTokenOrLogin(ctx);
  let response = await synapseFetch(path, {
    ...init,
    headers: withBearerToken(init?.headers, accessToken),
  });

  if (isAuthError(response.status)) {
    accessToken = await refreshAndSaveSession(ctx);
    response = await synapseFetch(path, {
      ...init,
      headers: withBearerToken(init?.headers, accessToken),
    });
  }

  return response;
}

async function validateAccessToken(accessToken: string): Promise<boolean> {
  const response = await synapseFetch("/v1/user/me", {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.ok) {
    return true;
  }

  console.warn("Synapse token validation failed:", response.status);
  return false;
}

const maintainSessionResultValidator = v.object({
  status: v.union(
    v.literal("logged_in"),
    v.literal("validated"),
    v.literal("relogged_in"),
  ),
  username: v.string(),
});

export const maintainSession = internalAction({
  args: {},
  returns: maintainSessionResultValidator,
  handler: async (ctx): Promise<{
    status: "logged_in" | "validated" | "relogged_in";
    username: string;
  }> => {
    const now = Date.now();
    const stored = await ctx.runQuery(internal.synapse.session.getStoredSession);

    if (!stored) {
      const login = await loginWithRetry();
      await ctx.runMutation(internal.synapse.session.saveSession, {
        accessToken: login.accessToken,
        user: login.user,
        validatedAt: now,
      });
      return { status: "logged_in", username: login.user.username };
    }

    const isValid = await validateAccessToken(stored.accessToken);
    if (isValid) {
      await ctx.runMutation(internal.synapse.session.touchValidatedAt, {
        validatedAt: now,
      });
      return { status: "validated", username: stored.user.username };
    }

    await refreshAndSaveSession(ctx);
    const session = await ctx.runQuery(internal.synapse.session.getStoredSession);
    return {
      status: "relogged_in",
      username: session?.user.username ?? stored.user.username,
    };
  },
});

export const ensureAccessToken = internalAction({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    return await getAccessTokenOrLogin(ctx);
  },
});
