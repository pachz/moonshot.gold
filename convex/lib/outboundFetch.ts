type OutboundFetchArgs = {
  url: string;
  init?: RequestInit;
};

function maskUrl(url: string): string {
  return url.replace(
    /(api\.kavenegar\.com\/v1\/)[^/]+(\/)/g,
    "$1***$2",
  );
}

function formatLogLine(
  method: string,
  url: string,
  durationMs: number,
  status: number | "ERROR",
): string {
  return `${method} ${maskUrl(url)} | ${durationMs}ms ${status}`;
}

export async function outboundFetch({
  url,
  init,
}: OutboundFetchArgs): Promise<Response> {
  const method = init?.method ?? "GET";
  const startedAt = Date.now();

  try {
    const response = await fetch(url, init);
    console.log(formatLogLine(method, url, Date.now() - startedAt, response.status));
    return response;
  } catch (error) {
    console.error(formatLogLine(method, url, Date.now() - startedAt, "ERROR"));
    throw error;
  }
}
