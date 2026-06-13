#!/usr/bin/env node
// Build-time enrichment pass. Verifies the claims APIScout displays instead of
// asserting them blindly. For each API entry we attempt, best-effort:
//
//   1. GitHub repos (link is github.com/owner/repo)  → stars + last push date
//      via the GitHub API (token from `gh auth token`, falls back to anon).
//   2. Every entry                                   → an actual HTTPS request
//      (the listed URL or a curated sample endpoint) to confirm reachability
//      and that HTTPS genuinely completes — reconciled later with the README's
//      claimed HTTPS flag so the UI can show "verified" vs merely "claimed".
//
// Pragmatics for 1,500+ entries: capped concurrency, short timeouts, graceful
// degradation (any failure → recorded as a negative/unknown, never throws), and
// the result is cached to data/enrichment.json (committed) so the Next build is
// fully offline. Re-running reuses fresh cache entries (see --max-age / --only).
//
// Usage:
//   node scripts/enrich.mjs                 # enrich everything, reuse fresh cache
//   node scripts/enrich.mjs --popular       # only curated-popular + GitHub entries (fast)
//   node scripts/enrich.mjs --limit 300     # cap how many *new* checks run this pass
//   node scripts/enrich.mjs --max-age 7     # treat cache entries older than N days as stale
//   node scripts/enrich.mjs --concurrency 16
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = path.join(import.meta.dirname, "..");
const APIS = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "apis.json"), "utf8"));
const CACHE_PATH = path.join(ROOT, "data", "enrichment.json");

// --- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
};
const POPULAR_ONLY = argv.includes("--popular");
const NEW_LIMIT = Number(flag("limit", Infinity));
const MAX_AGE_DAYS = Number(flag("max-age", 14));
const CONCURRENCY = Number(flag("concurrency", 12));
const HTTP_TIMEOUT = Number(flag("timeout", 6000));

// --- GitHub token ----------------------------------------------------------
let GH_TOKEN = process.env.GITHUB_TOKEN || "";
if (!GH_TOKEN) {
  try {
    GH_TOKEN = execSync("gh auth token", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    /* anon — heavily rate-limited but still works for a small popular set */
  }
}
console.log(GH_TOKEN ? "GitHub token: present" : "GitHub token: none (anonymous, rate-limited)");

// --- cache -----------------------------------------------------------------
let cache = { generatedAt: null, entries: {} };
if (fs.existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    if (!cache.entries) cache.entries = {};
  } catch {
    /* start fresh */
  }
}
const now = Date.now();
const isFresh = (e) =>
  e && e.lastChecked && now - Date.parse(e.lastChecked) < MAX_AGE_DAYS * 86400_000;

// --- helpers ---------------------------------------------------------------
function parseGitHubRepo(url) {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, "") !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repoRaw] = parts;
    const repo = repoRaw.replace(/\.git$/, "");
    // Skip non-repo paths (topics, orgs handled by length check above).
    if (["topics", "search", "sponsors", "marketplace"].includes(owner)) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

async function withTimeout(promise, ms, ctrl) {
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await promise;
  } finally {
    clearTimeout(t);
  }
}

async function fetchGitHub(owner, repo) {
  const ctrl = new AbortController();
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "APIScout-enrich/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GH_TOKEN) headers.Authorization = `Bearer ${GH_TOKEN}`;
  try {
    const res = await withTimeout(
      fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers,
        signal: ctrl.signal,
      }),
      HTTP_TIMEOUT,
      ctrl
    );
    if (res.status === 403 || res.status === 429) {
      return { rateLimited: true };
    }
    if (!res.ok) return { stars: undefined, lastCommit: undefined };
    const j = await res.json();
    return {
      stars: typeof j.stargazers_count === "number" ? j.stargazers_count : undefined,
      lastCommit: j.pushed_at || j.updated_at || undefined,
    };
  } catch {
    return { stars: undefined, lastCommit: undefined };
  }
}

// HTTPS liveness probe. We force https:// (a README may list http) and accept
// any HTTP response (even 4xx) as "HTTPS works + reachable" — we only care that
// the TLS handshake + an HTTP exchange completed, not that the path is valid.
async function probeHttps(url) {
  let target;
  try {
    const u = new URL(url);
    u.protocol = "https:";
    target = u.toString();
  } catch {
    return { httpsOk: false, reachable: false };
  }
  for (const method of ["HEAD", "GET"]) {
    const ctrl = new AbortController();
    try {
      const res = await withTimeout(
        fetch(target, {
          method,
          redirect: "follow",
          signal: ctrl.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; APIScout/1.0; +https://github.com/n8watkins/apiscout)",
            Accept: "*/*",
          },
        }),
        HTTP_TIMEOUT,
        ctrl
      );
      // Some servers reject HEAD with 405 — retry with GET before giving up.
      if (method === "HEAD" && (res.status === 405 || res.status === 501)) continue;
      return { httpsOk: true, reachable: res.status < 500 };
    } catch {
      if (method === "GET") return { httpsOk: false, reachable: false };
    }
  }
  return { httpsOk: false, reachable: false };
}

// --- pool ------------------------------------------------------------------
async function pool(items, n, worker) {
  let i = 0;
  let done = 0;
  const total = items.length;
  const runners = Array.from({ length: Math.min(n, total) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
      done++;
      if (done % 50 === 0 || done === total) {
        process.stdout.write(`\r  checked ${done}/${total}   `);
      }
    }
  });
  await Promise.all(runners);
  process.stdout.write("\n");
}

// --- main ------------------------------------------------------------------
async function main() {
  let targets = APIS.apis.filter((a) => a.url);
  if (POPULAR_ONLY) {
    targets = targets.filter((a) => a.popularity || parseGitHubRepo(a.url));
  }

  // Skip entries with fresh cache; honor the new-check budget.
  let newBudget = NEW_LIMIT;
  const work = [];
  for (const a of targets) {
    const key = `${a.name}::${a.url}`;
    if (isFresh(cache.entries[key])) continue;
    if (newBudget <= 0) break;
    newBudget--;
    work.push(a);
  }

  console.log(
    `Targets: ${targets.length} · already-fresh: ${targets.length - work.length} · checking now: ${work.length}`
  );
  if (work.length === 0) {
    console.log("Nothing to do. Cache is fresh.");
    finalize();
    return;
  }

  let ghRateLimited = false;
  await pool(work, CONCURRENCY, async (a) => {
    const key = `${a.name}::${a.url}`;
    const entry = { lastChecked: new Date().toISOString() };

    const gh = parseGitHubRepo(a.url);
    if (gh && !ghRateLimited) {
      const r = await fetchGitHub(gh.owner, gh.repo);
      if (r.rateLimited) {
        ghRateLimited = true;
      } else {
        if (typeof r.stars === "number") entry.stars = r.stars;
        if (r.lastCommit) entry.lastCommit = r.lastCommit;
      }
    }

    // Liveness / HTTPS probe for everything (GitHub repos included — the repo
    // page itself is a fine HTTPS reachability signal).
    const probe = await probeHttps(a.url);
    entry.httpsOk = probe.httpsOk;
    entry.reachable = probe.reachable;

    cache.entries[key] = entry;
  });

  if (ghRateLimited) {
    console.warn("⚠ GitHub rate limit hit — some star counts skipped this pass. Re-run later.");
  }
  finalize();
}

function finalize() {
  cache.generatedAt = new Date().toISOString();
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  const entries = Object.values(cache.entries);
  const httpsVerified = entries.filter((e) => e.httpsOk === true).length;
  const github = entries.filter((e) => typeof e.stars === "number").length;
  const reachable = entries.filter((e) => e.reachable === true).length;
  console.log(
    `Cache: ${entries.length} entries → data/enrichment.json\n` +
      `  https-verified: ${httpsVerified} · github-enriched: ${github} · reachable: ${reachable}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
