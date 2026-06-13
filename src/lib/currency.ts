export function formatToman(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount);
}

export function parseTomanInput(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }

  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}
