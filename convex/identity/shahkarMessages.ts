function mapShahkarErrorMessage(
  errorCode: string | null | undefined,
  apiMessage: string,
): string {
  const lowerMessage = apiMessage.toLowerCase();

  if (errorCode === "invalid") {
    if (lowerMessage.includes("national code")) {
      return "کد ملی نامعتبر است";
    }
    if (lowerMessage.includes("mobile")) {
      return "شماره موبایل نامعتبر است";
    }
  }

  if (/[\u0600-\u06FF]/.test(apiMessage)) {
    return apiMessage;
  }

  return "اطلاعات وارد شده تأیید نشد. لطفاً نام و کد ملی را بررسی کنید.";
}

export function mapShahkarResponse(
  matched: boolean,
  errorCode: string | null | undefined,
  apiMessage: string,
): string {
  if (matched) {
    return apiMessage || "اطلاعات با موفقیت تأیید شد";
  }

  return mapShahkarErrorMessage(errorCode, apiMessage);
}
