import type { NextConfig } from "next";

// Defense-in-depth response headers applied to every route. Vercel adds HSTS;
// these cover clickjacking, MIME sniffing, referrer leakage, and a baseline CSP.
// connect-src is open because the playground deliberately fetches arbitrary
// third-party APIs directly from the browser (CORS-enabled, no-auth case).
// Next.js dev (Fast Refresh / HMR) relies on eval, which a strict script-src
// blocks — leaving the animated hero, featured strip and category rail blank
// under `next dev`. Allow 'unsafe-eval' in development only; production keeps
// the locked-down policy below.
const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      // The live "Try it" playground calls public APIs straight from the page.
      "connect-src *",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
