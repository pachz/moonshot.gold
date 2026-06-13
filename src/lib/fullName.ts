export function isValidFullName(value: string): boolean {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length >= 3 && /^[\p{L}\s]+$/u.test(trimmed);
}

export function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
