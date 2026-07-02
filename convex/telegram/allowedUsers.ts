function parseAllowedTelegramUserIds(raw: string | undefined): Set<number> {
  if (!raw?.trim()) {
    return new Set();
  }

  const ids = new Set<number>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const id = Number(trimmed);
    if (!Number.isInteger(id) || id <= 0) {
      console.warn("Ignoring invalid TELEGRAM_ALLOWED_USER_IDS entry", {
        entry: trimmed,
      });
      continue;
    }
    ids.add(id);
  }
  return ids;
}

export function isAllowedTelegramUser(userId: number): boolean {
  const allowed = parseAllowedTelegramUserIds(
    process.env.TELEGRAM_ALLOWED_USER_IDS,
  );
  return allowed.has(userId);
}
