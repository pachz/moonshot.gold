export function getProxiedUrl(targetUrl: string): string {
  const proxyUrl = process.env.OUTBOUND_PROXY_URL ?? process.env.KAVENEGAR_PROXY_URL;

  if (proxyUrl) {
    return `${proxyUrl.replace(/\/$/, "")}/${targetUrl}`;
  }

  return targetUrl;
}
