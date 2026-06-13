import { v } from "convex/values";

export const planIdValidator = v.union(v.literal("silver"), v.literal("gold"));

export const paymentMethodValidator = v.union(
  v.literal("gateway"),
  v.literal("wallet"),
  v.literal("combined"),
);

export type PlanId = "silver" | "gold";
export type PaymentMethod = "gateway" | "wallet" | "combined";

export const PLAN_PRICES_TOMAN: Record<PlanId, number> = {
  silver: 250_000,
  gold: 450_000,
};

export const SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export const MIN_WALLET_TOPUP_TOMAN = 50_000;
export const MAX_WALLET_TOPUP_TOMAN = 50_000_000;

export function getPlanAmountToman(planId: PlanId): number {
  return PLAN_PRICES_TOMAN[planId];
}

export function isPlanId(value: string): value is PlanId {
  return value === "silver" || value === "gold";
}

export function getPlanName(planId: PlanId): string {
  const planNames: Record<PlanId, string> = {
    silver: "نقره‌ای",
    gold: "طلایی",
  };
  return planNames[planId];
}
