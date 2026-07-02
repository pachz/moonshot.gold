"use node";

import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { synapseRequestWithAuth } from "./auth";
import { getSynapseAccountActionId, synapseJsonHeaders } from "./client";

type AccountListItem = {
  id: number;
  username: string;
};

type AccountListResponse = {
  items?: AccountListItem[];
  message?: string;
};

type AccountActionResponse = {
  success?: boolean;
  message?: string;
};

const lookupResultValidator = v.object({
  status: v.union(
    v.literal("not_found"),
    v.literal("success"),
    v.literal("failed"),
    v.literal("error"),
  ),
  message: v.string(),
});

function findExactAccountMatch(
  items: AccountListItem[],
  username: string,
): AccountListItem | null {
  const normalized = username.toLowerCase();
  return (
    items.find((item) => item.username.toLowerCase() === normalized) ?? null
  );
}

async function searchAccounts(
  ctx: ActionCtx,
  search: string,
): Promise<AccountListItem[]> {
  const response = await synapseRequestWithAuth(ctx, "/v1/account/list", {
    method: "POST",
    headers: synapseJsonHeaders(),
    body: JSON.stringify({
      search,
      groups: null,
      page: 1,
      limit: 5,
    }),
  });

  const data = (await response.json()) as AccountListResponse;
  if (!response.ok) {
    console.error("Synapse account list failed:", {
      status: response.status,
      message: data.message,
    });
    throw new Error(data.message ?? "Synapse account search failed");
  }

  return data.items ?? [];
}

async function initAccountAction(
  ctx: ActionCtx,
  accountId: number,
): Promise<AccountActionResponse> {
  const actionId = getSynapseAccountActionId();
  const response = await synapseRequestWithAuth(
    ctx,
    `/v1/account/action/${actionId}/init`,
    {
      method: "POST",
      headers: synapseJsonHeaders(),
      body: JSON.stringify({ id: String(accountId) }),
    },
  );

  const data = (await response.json()) as AccountActionResponse;
  if (!response.ok) {
    console.error("Synapse account action failed:", {
      status: response.status,
      message: data.message,
    });
    throw new Error(data.message ?? "Synapse account action failed");
  }

  return data;
}

export const lookupAndInitAccount = internalAction({
  args: {
    username: v.string(),
  },
  returns: lookupResultValidator,
  handler: async (ctx, args): Promise<{
    status: "not_found" | "success" | "failed" | "error";
    message: string;
  }> => {
    const username = args.username.trim();
    if (!username) {
      return {
        status: "error",
        message: "Send an account username to look up.",
      };
    }

    try {
      const items = await searchAccounts(ctx, username);
      const match = findExactAccountMatch(items, username);

      if (!match) {
        return {
          status: "not_found",
          message: `Username "${username}" was not found.`,
        };
      }

      const actionResult = await initAccountAction(ctx, match.id);
      if (actionResult.success === true) {
        return {
          status: "success",
          message: `Action succeeded for "${match.username}" (id ${match.id}).`,
        };
      }

      return {
        status: "failed",
        message:
          actionResult.message ??
          `Action failed for "${match.username}" (id ${match.id}).`,
      };
    } catch (error) {
      console.error("Synapse account lookup failed:", error);
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Synapse account lookup failed",
      };
    }
  },
});
