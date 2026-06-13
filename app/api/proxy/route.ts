import { NextResponse } from "next/server";
import { safeFetch, readCapped, isPublicHttpUrl, SafeFetchError } from "@/lib/safefetch";

// The ONLY server code in APIScout. CORS-enabled no-auth APIs are called
// directly from the browser; everything else (no CORS headers) is routed
// through here so the playground still works. Because the user controls the
// target URL, this is SSRF-hardened exactly like portfolio-rank's inspector:
// scheme allowlist + private-address blocklist + manual redirect re-validation
// + timeout + capped body read. No request bodies, no custom headers proxied —
// GET only, JSON/text responses only.
export const runtime = "nodejs";

const MAX_BYTES = 1_000_000; // 1 MB response cap
const TIMEOUT_MS = 8_000;

// Per-IP rate limit. This is an in-process backstop: serverless instances are
// ephemeral and not shared, so it resets on cold starts and won't catch a
// distributed abuser — that's the job of a platform rate limit (Vercel WAF).
// What it does cheaply stop is a single client scripting the proxy as a fetch
// relay. The Map is bounded by opportunistic eviction of expired entries.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30; // requests per window per IP
const rlHits = new Map<string, { count: number; reset: number }>();

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function rateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (rlHits.size > 5000) {
    for (const [k, v] of rlHits) if (v.reset < now) rlHits.delete(k);
  }
  const entry = rlHits.get(ip);
  if (!entry || entry.reset < now) {
    rlHits.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  entry.count++;
  if (entry.count > RL_MAX) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export async function GET(req: Request) {
  const rl = rateLimit(clientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded — slow down a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const target = new URL(req.url).searchParams.get("url");

  if (!target) {
    return NextResponse.json({ ok: false, error: "Missing ?url" }, { status: 400 });
  }
  // First-line scheme + private-address check (safeFetch re-checks every hop).
  if (!isPublicHttpUrl(target)) {
    return NextResponse.json(
      { ok: false, error: "URL must be a public http(s) address" },
      { status: 400 }
    );
  }

  const started = Date.now();
  try {
    const { res, finalUrl } = await safeFetch(target, { timeoutMs: TIMEOUT_MS });
    const { text, truncated } = await readCapped(res, MAX_BYTES);
    const contentType = res.headers.get("content-type") ?? "";

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      contentType,
      finalUrl,
      truncated,
      durationMs: Date.now() - started,
      body: text,
    });
  } catch (e) {
    if (e instanceof SafeFetchError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.code === "blocked" ? 400 : 502 }
      );
    }
    return NextResponse.json({ ok: false, error: "Proxy failed" }, { status: 502 });
  }
}
