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

export async function GET(req: Request) {
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
