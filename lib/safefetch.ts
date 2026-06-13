import net from "node:net";
import dns from "node:dns";
import { Agent } from "undici";

// SSRF guards for the "Try it" proxy. The user supplies the URL to fetch, so a
// naive server-side fetch is a textbook SSRF + memory-exhaustion primitive: a
// crafted URL (or a redirect from a benign one) could reach the cloud metadata
// endpoint, localhost admin panels, or RFC1918 internal services. We defend in
// two layers:
//   1. A cheap string check on the hostname (rejects obvious localhost / private
//      IP literals before we spend a DNS round-trip).
//   2. The authoritative check: a custom DNS lookup on the fetch dispatcher that
//      resolves the host, rejects if ANY resolved address is private/reserved,
//      and pins the socket to that validated address. This is what defeats DNS
//      rebinding — a public hostname whose A record points at 169.254.169.254 or
//      127.0.0.1 — because the same resolution that we validate is the one the
//      socket connects to (no check-then-reconnect window). It runs on every
//      hop, so a redirect to a private host is caught too.

// Fast first-line reject: loopback, link-local (incl. metadata 169.254.169.254),
// and RFC1918 / unique-local IP literals. The resolved-IP check below is the
// real guarantee; this just avoids a needless DNS lookup for obvious cases.
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

// --- Resolved-IP validation -------------------------------------------------

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const o = Number(part);
    if (o > 255) return null;
    n = (n << 8) | o;
  }
  return n >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable → treat as unsafe
  const inRange = (base: string, bits: number) => {
    const b = ipv4ToInt(base)!;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (n & mask) === (b & mask);
  };
  return (
    inRange("0.0.0.0", 8) || // "this" network
    inRange("10.0.0.0", 8) || // private
    inRange("100.64.0.0", 10) || // CGNAT
    inRange("127.0.0.0", 8) || // loopback
    inRange("169.254.0.0", 16) || // link-local + cloud metadata
    inRange("172.16.0.0", 12) || // private
    inRange("192.0.0.0", 24) || // IETF protocol assignments
    inRange("192.0.2.0", 24) || // TEST-NET-1
    inRange("192.168.0.0", 16) || // private
    inRange("198.18.0.0", 15) || // benchmarking
    inRange("198.51.100.0", 24) || // TEST-NET-2
    inRange("203.0.113.0", 24) || // TEST-NET-3
    inRange("224.0.0.0", 4) || // multicast
    inRange("240.0.0.0", 4) // reserved + broadcast
  );
}

/** True if an IP literal (v4 or v6) is loopback / private / link-local / reserved. */
export function isPrivateIp(ip: string): boolean {
  const fam = net.isIP(ip);
  if (fam === 4) return isPrivateIPv4(ip);
  if (fam === 6) {
    const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
    if (lower === "::" || lower === "::1") return true; // unspecified / loopback
    // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded v4
    const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPrivateIPv4(dotted[1]);
    const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return isPrivateIPv4(
        `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`
      );
    }
    if (/^f[cd]/.test(lower)) return true; // ULA fc00::/7
    if (/^fe[89ab]/.test(lower)) return true; // link-local fe80::/10
    if (/^ff/.test(lower)) return true; // multicast ff00::/8
    return false;
  }
  return true; // not a valid IP → unsafe
}

// Custom DNS lookup for the dispatcher: resolve, reject if any address is
// private, otherwise hand the validated addresses straight to the connector so
// the socket uses exactly what we checked (no rebind window). TLS SNI still uses
// the original hostname, so HTTPS cert validation is unaffected.
type LookupCb = (
  err: NodeJS.ErrnoException | null,
  address?: string | dns.LookupAddress[],
  family?: number
) => void;

function validatingLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: LookupCb
): void {
  dns.lookup(
    hostname,
    { ...options, all: true, verbatim: true },
    (err, addresses) => {
      if (err) {
        callback(err);
        return;
      }
      const list = addresses as dns.LookupAddress[];
      for (const a of list) {
        if (isPrivateIp(a.address)) {
          const e = new Error(
            `"${hostname}" resolves to a private address (${a.address})`
          ) as NodeJS.ErrnoException;
          e.code = "ERR_SSRF_BLOCKED";
          callback(e);
          return;
        }
      }
      if (options.all) callback(null, list);
      else callback(null, list[0].address, list[0].family);
    }
  );
}

// One shared dispatcher; the lookup is stateless so reuse is safe and lets
// connections pool.
const safeAgent = new Agent({
  connect: { lookup: validatingLookup as unknown as net.LookupFunction },
});

export interface SafeFetchResult {
  res: Response;
  finalUrl: string;
}

/**
 * Fetch following redirects manually, re-checking every hop against the
 * private-address blocklist (a remote API can 302 to an internal address —
 * `redirect: "follow"` would chase it). The dispatcher additionally validates
 * the *resolved IP* of every connection and pins to it. Returns the final
 * Response (body undrained) and its resolved URL, or throws a labeled error.
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
        // @ts-expect-error — `dispatcher` is an undici extension to fetch init
        dispatcher: safeAgent,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; APIScout/1.0; +https://github.com/n8watkins/apiscout)",
          Accept: "application/json, text/plain, */*",
          ...init.headers,
        },
      });
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err?.name === "TimeoutError") throw new SafeFetchError("timeout", "Request timed out");
      // The dispatcher's lookup throws ERR_SSRF_BLOCKED when a host resolves to a
      // private IP; undici nests it under `.cause`, so walk the chain.
      let cur: unknown = err;
      for (let i = 0; i < 6 && cur; i++) {
        const c = cur as NodeJS.ErrnoException & { cause?: unknown };
        if (c.code === "ERR_SSRF_BLOCKED" || /resolves to a private address/.test(c.message ?? "")) {
          throw new SafeFetchError("blocked", "URL resolves to a private or internal address");
        }
        cur = c.cause;
      }
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
