import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

function getAppRedirectUrl(
  status: "success" | "failed",
  kind?: "subscription" | "wallet_topup",
): string {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:5173";
  const base = siteUrl.replace(/\/$/, "");

  if (kind === "wallet_topup") {
    return `${base}/home?wallet=${status}`;
  }

  return `${base}/home?payment=${status}`;
}

export const handleZibalCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const trackId = url.searchParams.get("trackId");
  const success = url.searchParams.get("success") === "1";

  if (!trackId) {
    return new Response(null, {
      status: 302,
      headers: { Location: getAppRedirectUrl("failed") },
    });
  }

  const paymentResult = await ctx.runAction(
    internal.payments.zibal.processCallback,
    {
      trackId,
      callbackSuccess: success,
    },
  );

  return new Response(null, {
    status: 302,
    headers: {
      Location: getAppRedirectUrl(
        paymentResult.status,
        paymentResult.kind,
      ),
    },
  });
});
