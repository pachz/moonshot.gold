/** Format Iranian mobile as 0912 277 6425 */
export function formatIranianPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function normalizeIranianPhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidIranianPhone(value: string): boolean {
  return /^09\d{9}$/.test(normalizeIranianPhone(value));
}
