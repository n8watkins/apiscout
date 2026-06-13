// SSRF guards for the "Try it" proxy. The user supplies the URL to fetch, so a
// naive server-side fetch is a textbook SSRF + memory-exhaustion primitive: a
// crafted URL (or a redirect from a benign one) could reach the cloud metadata
// endpoint, localhost admin panels, or RFC1918 internal services. We follow
// redirects ourselves and re-validate every hop.

// Hostnames that must never be fetched: loopback, link-local (incl. the cloud
// metadata endpoint 169.254.169.254), and RFC1918 / unique-local IP literals.
const BLOCKED_HOST =
  /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|\[?f[cd])/i;

export function isPublicHttpUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  // Scheme allowlist — no file:, gopher:, data:, etc.
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  return !BLOCKED_HOST.test(u.hostname);
}

export interface SafeFetchResult {
  res: Response;
  finalUrl: string;
}

/**
 * Fetch following redirects manually, re-checking every hop against the
 * private-address blocklist (a remote API can 302 to an internal address —
 * `redirect: "follow"` would chase it). Returns the final Response (body
 * undrained) and its resolved URL, or throws a labeled error.
 */
export async function safeFetch(
  startUrl: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    timeoutMs: number;
    maxHops?: number;
  }
): Promise<SafeFetchResult> {
  const maxHops = init.maxHops ?? 5;
  let url = startUrl;
  for (let hop = 0; hop <= maxHops; hop++) {
    if (!isPublicHttpUrl(url)) {
      throw new SafeFetchError("blocked", "URL points at a private or non-HTTP address");
    }
    let res: Response;
    try {
      res = await fetch(url, {
        method: init.method ?? "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(init.timeoutMs),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; APIScout/1.0; +https://github.com/n8watkins/apiscout)",
          Accept: "application/json, text/plain, */*",
          ...init.headers,
        },
      });
    } catch (e) {
      const name = (e as Error)?.name;
      if (name === "TimeoutError") throw new SafeFetchError("timeout", "Request timed out");
      throw new SafeFetchError("unreachable", "Could not reach the API");
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { res, finalUrl: url };
      url = new URL(loc, url).href; // resolve relative redirect, re-check next loop
      continue;
    }
    return { res, finalUrl: res.url || url };
  }
  throw new SafeFetchError("too_many_redirects", "Too many redirects");
}

export class SafeFetchError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "SafeFetchError";
  }
}

/**
 * Read a response body as text, but never buffer more than `maxBytes` — a
 * hostile server can stream gigabytes within the timeout, and slicing after
 * `res.text()` is too late. Reads incrementally and stops at the budget.
 */
export async function readCapped(
  res: Response,
  maxBytes: number
): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let out = "";
  let total = 0;
  let truncated = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      out += decoder.decode(value, { stream: true });
      if (total >= maxBytes) {
        truncated = true;
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return { text: out, truncated };
}
