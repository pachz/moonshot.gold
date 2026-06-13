import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { throwUserFacingError } from "../lib/userFacingError";
import {
  DAILY_PAYMENT_LIMIT_TOMAN,
  DAILY_PAYMENT_WINDOW_MS,
} from "./plans";

function formatToman(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount);
}

export async function getUserDailyPaymentTotalToman(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  now: number,
): Promise<number> {
  const since = now - DAILY_PAYMENT_WINDOW_MS;
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  return orders
    .filter(
      (order) =>
        order.createdAt >= since &&
        (order.status === "pending" || order.status === "paid"),
    )
    .reduce((sum, order) => sum + order.amountToman, 0);
}

export async function assertWithinDailyPaymentLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  amountToman: number,
): Promise<void> {
  const now = Date.now();
  const usedToday = await getUserDailyPaymentTotalToman(ctx, userId, now);
  const remaining = DAILY_PAYMENT_LIMIT_TOMAN - usedToday;

  if (amountToman > remaining) {
    if (remaining <= 0) {
      throwUserFacingError(
        `سقف پرداخت روزانه شما ${formatToman(DAILY_PAYMENT_LIMIT_TOMAN)} تومان است و امروز به این سقف رسیده‌اید.`,
      );
    }

    throwUserFacingError(
      `سقف پرداخت روزانه شما ${formatToman(DAILY_PAYMENT_LIMIT_TOMAN)} تومان است. امروز ${formatToman(usedToday)} تومان پرداخت کرده‌اید و فقط ${formatToman(remaining)} تومان باقی مانده است.`,
    );
  }
}
