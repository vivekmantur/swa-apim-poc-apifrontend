// All calls are relative: /api/* goes SWA -> linked APIM -> App Service. No bearer token is sent;
// the SWA session cookie identifies the user.

export interface ApiResult {
  status: number;
  body: unknown;
}

export async function callApi(
  path: string,
  options: { method?: string; graphToken?: string } = {},
): Promise<ApiResult> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.graphToken) {
    headers["X-Graph-Token"] = options.graphToken;
  }

  const response = await fetch(path, { method: options.method ?? "GET", headers, redirect: "manual" });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON error pages from SWA or APIM are shown as text.
  }
  return { status: response.status, body };
}
