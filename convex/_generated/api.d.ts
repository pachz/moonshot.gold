/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as auth_phone from "../auth/phone.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as identity_shahkar from "../identity/shahkar.js";
import type * as identity_shahkarMessages from "../identity/shahkarMessages.js";
import type * as lib_outboundFetch from "../lib/outboundFetch.js";
import type * as lib_outboundProxy from "../lib/outboundProxy.js";
import type * as lib_userFacingError from "../lib/userFacingError.js";
import type * as manualVerification from "../manualVerification.js";
import type * as manualVerificationActions from "../manualVerificationActions.js";
import type * as payments_confirm from "../payments/confirm.js";
import type * as payments_currency from "../payments/currency.js";
import type * as payments_initiate from "../payments/initiate.js";
import type * as payments_limits from "../payments/limits.js";
import type * as payments_orders from "../payments/orders.js";
import type * as payments_plans from "../payments/plans.js";
import type * as payments_wallet from "../payments/wallet.js";
import type * as payments_zibal from "../payments/zibal.js";
import type * as profile from "../profile.js";
import type * as profileActions from "../profileActions.js";
import type * as ratelimiter from "../ratelimiter.js";
import type * as sms_kavenegar from "../sms/kavenegar.js";
import type * as synapse_accounts from "../synapse/accounts.js";
import type * as synapse_auth from "../synapse/auth.js";
import type * as synapse_client from "../synapse/client.js";
import type * as synapse_session from "../synapse/session.js";
import type * as synapse_totp from "../synapse/totp.js";
import type * as synapse_totpLib from "../synapse/totpLib.js";
import type * as telegram_allowedUsers from "../telegram/allowedUsers.js";
import type * as telegram_bot from "../telegram/bot.js";
import type * as telegram_client from "../telegram/client.js";
import type * as telegram_setup from "../telegram/setup.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "auth/phone": typeof auth_phone;
  crons: typeof crons;
  http: typeof http;
  "identity/shahkar": typeof identity_shahkar;
  "identity/shahkarMessages": typeof identity_shahkarMessages;
  "lib/outboundFetch": typeof lib_outboundFetch;
  "lib/outboundProxy": typeof lib_outboundProxy;
  "lib/userFacingError": typeof lib_userFacingError;
  manualVerification: typeof manualVerification;
  manualVerificationActions: typeof manualVerificationActions;
  "payments/confirm": typeof payments_confirm;
  "payments/currency": typeof payments_currency;
  "payments/initiate": typeof payments_initiate;
  "payments/limits": typeof payments_limits;
  "payments/orders": typeof payments_orders;
  "payments/plans": typeof payments_plans;
  "payments/wallet": typeof payments_wallet;
  "payments/zibal": typeof payments_zibal;
  profile: typeof profile;
  profileActions: typeof profileActions;
  ratelimiter: typeof ratelimiter;
  "sms/kavenegar": typeof sms_kavenegar;
  "synapse/accounts": typeof synapse_accounts;
  "synapse/auth": typeof synapse_auth;
  "synapse/client": typeof synapse_client;
  "synapse/session": typeof synapse_session;
  "synapse/totp": typeof synapse_totp;
  "synapse/totpLib": typeof synapse_totpLib;
  "telegram/allowedUsers": typeof telegram_allowedUsers;
  "telegram/bot": typeof telegram_bot;
  "telegram/client": typeof telegram_client;
  "telegram/setup": typeof telegram_setup;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: {
    lib: {
      checkRateLimit: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
      getValue: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          key?: string;
          name: string;
          sampleShards?: number;
        },
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          shard: number;
          ts: number;
          value: number;
        }
      >;
      rateLimit: FunctionReference<
        "mutation",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      resetRateLimit: FunctionReference<
        "mutation",
        "internal",
        { key?: string; name: string },
        null
      >;
    };
    time: {
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
    };
  };
  telegram: {
    webhooks: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          botId: number;
          botUsername: string;
          secretHash: string;
          settings: {
            allowedUpdates: Array<string>;
            dropPendingUpdates: boolean;
            webhookUrl: string;
          };
        },
        null
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { botUsername: string },
        null
      >;
      verifySecretHash: FunctionReference<
        "query",
        "internal",
        { secretHash: string },
        boolean
      >;
    };
  };
};
