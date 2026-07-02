"use node";

import { outboundFetch } from "../lib/outboundFetch";

export const DEFAULT_SYNAPSE_API_URL = "https://api.edge.synapse.autos";

export function getSynapseApiUrl(): string {
  return (
    process.env.SYNAPSE_API_URL?.trim().replace(/\/$/, "") ??
    DEFAULT_SYNAPSE_API_URL
  );
}

export async function synapseFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${getSynapseApiUrl()}${path}`;
  return await outboundFetch({ url, init });
}

export function synapseJsonHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export function synapseAuthHeaders(accessToken: string): HeadersInit {
  return {
    ...synapseJsonHeaders(),
    Authorization: `Bearer ${accessToken}`,
  };
}

export function getSynapseAccountActionId(): string {
  const actionId = process.env.SYNAPSE_ACCOUNT_ACTION_ID?.trim();
  if (!actionId) {
    throw new Error("SYNAPSE_ACCOUNT_ACTION_ID is not configured");
  }
  return actionId;
}
