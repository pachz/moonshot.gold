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
import type * as http from "../http.js";
import type * as identity_shahkar from "../identity/shahkar.js";
import type * as identity_shahkarMessages from "../identity/shahkarMessages.js";
import type * as lib_outboundProxy from "../lib/outboundProxy.js";
import type * as lib_userFacingError from "../lib/userFacingError.js";
import type * as otp_CustomOTP from "../otp/CustomOTP.js";
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

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "auth/phone": typeof auth_phone;
  http: typeof http;
  "identity/shahkar": typeof identity_shahkar;
  "identity/shahkarMessages": typeof identity_shahkarMessages;
  "lib/outboundProxy": typeof lib_outboundProxy;
  "lib/userFacingError": typeof lib_userFacingError;
  "otp/CustomOTP": typeof otp_CustomOTP;
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
};
