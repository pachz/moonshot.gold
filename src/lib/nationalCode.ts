export const NATIONAL_CODE_PLACEHOLDER = "0021234567";

export function normalizeNationalCode(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatNationalCode(value: string): string {
  return normalizeNationalCode(value).slice(0, 10);
}

export function isValidNationalCode(value: string): boolean {
  return /^\d{10}$/.test(normalizeNationalCode(value));
}
