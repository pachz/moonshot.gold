import { ConvexError } from "convex/values";

export function formatRateLimitMessage(
  limitName: string,
  retryAfter?: number,
): string {
  if (limitName === "validateProfileDaily") {
    return "امروز ۵ بار درخواست تأیید داده‌اید. فردا می‌توانید دوباره تلاش کنید.";
  }

  if (limitName === "initiatePayment") {
    return "تعداد درخواست‌های پرداخت زیاد است. لطفاً یک دقیقه صبر کنید.";
  }

  if (limitName === "requestManualVerification") {
    return "لطفاً یک دقیقه صبر کنید و دوباره درخواست تأیید دهید.";
  }

  if (limitName === "requestManualVerificationDaily") {
    return "امروز ۳ بار درخواست تأیید داده‌اید. فردا می‌توانید دوباره تلاش کنید.";
  }

  if (retryAfter !== undefined) {
    const seconds = Math.max(1, Math.ceil(retryAfter / 1000));
    if (seconds < 60) {
      return `لطفاً ${seconds} ثانیه صبر کنید و دوباره تلاش کنید.`;
    }

    const minutes = Math.ceil(seconds / 60);
    return `لطفاً ${minutes} دقیقه صبر کنید و دوباره تلاش کنید.`;
  }

  return "لطفاً کمی صبر کنید و دوباره تلاش کنید.";
}

export function throwUserFacingError(message: string): never {
  throw new ConvexError({ message });
}

export function getUserFacingMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data;

    if (
      typeof data === "object" &&
      data !== null &&
      "kind" in data &&
      data.kind === "RateLimited" &&
      "name" in data &&
      typeof data.name === "string"
    ) {
      const retryAfter =
        "retryAfter" in data && typeof data.retryAfter === "number"
          ? data.retryAfter
          : undefined;
      return formatRateLimitMessage(data.name, retryAfter);
    }

    if (typeof data === "string") {
      return data;
    }

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }

  if (error instanceof Error) {
    const persianMatch = error.message.match(
      /Uncaught Error: ([\u0600-\u06FF0-9\s.،؟!]+)/,
    );
    if (persianMatch?.[1]) {
      return persianMatch[1].trim();
    }
  }

  return "خطا در تأیید اطلاعات. لطفاً دوباره تلاش کنید.";
}
