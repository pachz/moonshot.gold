/** Client-side app routes served from app.html (keep vercel.json rewrites in sync). */
export const SPA_ROUTE_PREFIXES = [
  "/login",
  "/complete-profile",
  "/home",
] as const;

export function isSpaRoute(url: string): boolean {
  return SPA_ROUTE_PREFIXES.some(
    (prefix) => url === prefix || url.startsWith(`${prefix}/`),
  );
}
