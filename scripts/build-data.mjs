#!/usr/bin/env node
// Build-time data pipeline. Fetches the public-apis/public-apis README, parses
// every per-category markdown table (API | Description | Auth | HTTPS | CORS),
// and bakes a normalized data/apis.json the frontend loads statically.
//
// Usage: node scripts/build-data.mjs
import fs from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..");
const SOURCE =
  "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md";

// ---------------------------------------------------------------------------
// Normalizers — the upstream table cells are inconsistent, so collapse them
// into a small set of stable values the UI can filter on.
// ---------------------------------------------------------------------------

/** Auth cell → { type, label }. `apiKey`/`OAuth`/`X-Mashape-Key` etc. wrapped
 * in backticks; "No" means none. */
function normalizeAuth(raw) {
  const cell = raw.replace(/`/g, "").trim();
  const lower = cell.toLowerCase();
  if (!cell || lower === "no" || lower === "none") return { type: "none", label: "No auth" };
  if (lower.includes("oauth")) return { type: "oauth", label: cell };
  if (lower.includes("apikey") || lower.includes("api key"))
    return { type: "apiKey", label: "API key" };
  if (lower.includes("user-agent")) return { type: "other", label: "User-Agent" };
  return { type: "other", label: cell };
}

/** "Yes"/"No"/"Unknown" → boolean | null. */
function normalizeBool(raw) {
  const v = raw.replace(/`/g, "").trim().toLowerCase();
  if (v === "yes") return true;
  if (v === "no") return false;
  return null; // "Unknown" or blank
}

/** Extract [text](url) from the API cell. */
function parseLink(cell) {
  const m = cell.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (m) return { name: m[1].trim(), url: m[2].trim() };
  return { name: cell.replace(/[*_`]/g, "").trim(), url: "" };
}

function splitRow(line) {
  // Drop the leading/trailing pipe, then split on unescaped pipes.
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split(/(?<!\\)\|/).map((c) => c.trim());
}

function isSeparatorRow(line) {
  return /^\|?[\s:|-]+\|?$/.test(line.trim()) && line.includes("-");
}

// ---------------------------------------------------------------------------
// Parse: walk the README line by line. Track the current category from the most
// recent "### Heading", then accumulate table rows under it.
// ---------------------------------------------------------------------------
function parse(md) {
  const lines = md.split("\n");
  const out = [];
  let category = null;
  let inTable = false;
  let headerSeen = false;

  for (const line of lines) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      category = heading[1].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim();
      inTable = false;
      headerSeen = false;
      continue;
    }
    // A markdown table header row for the APIs section.
    if (/^\|?\s*API\s*\|/i.test(line) && /Description/i.test(line)) {
      inTable = true;
      headerSeen = false;
      continue;
    }
    if (inTable && isSeparatorRow(line)) {
      headerSeen = true;
      continue;
    }
    if (inTable && headerSeen) {
      if (!line.trim().startsWith("|")) {
        inTable = false;
        continue;
      }
      const cols = splitRow(line);
      if (cols.length < 5) continue;
      const [apiCell, descCell, authCell, httpsCell, corsCell] = cols;
      const { name, url } = parseLink(apiCell);
      if (!name) continue;
      const auth = normalizeAuth(authCell);
      out.push({
        name,
        url,
        description: descCell.replace(/\s+/g, " ").trim(),
        category: category || "Uncategorized",
        auth: auth.type,
        authLabel: auth.label,
        https: normalizeBool(httpsCell),
        cors: normalizeBool(corsCell),
      });
    }
  }
  return out;
}

async function main() {
  console.log(`Fetching ${SOURCE} ...`);
  const res = await fetch(SOURCE, {
    headers: { "User-Agent": "APIScout-pipeline/1.0" },
  });
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  const md = await res.text();

  const apis = parse(md);

  // De-dupe by url+name (a couple of upstream rows repeat).
  const seen = new Set();
  const deduped = [];
  for (const a of apis) {
    const k = `${a.name}::${a.url}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(a);
  }

  // Stable sort: category, then name.
  deduped.sort(
    (a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );

  const categories = [...new Set(deduped.map((a) => a.category))].sort();

  const corsNoAuth = deduped.filter(
    (a) => a.cors === true && a.auth === "none"
  ).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    count: deduped.length,
    categoryCount: categories.length,
    categories,
    stats: {
      noAuth: deduped.filter((a) => a.auth === "none").length,
      cors: deduped.filter((a) => a.cors === true).length,
      https: deduped.filter((a) => a.https === true).length,
      corsNoAuth,
    },
    apis: deduped,
  };

  const outPath = path.join(ROOT, "data", "apis.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(
    `Wrote ${deduped.length} APIs across ${categories.length} categories → data/apis.json`
  );
  console.log(
    `  no-auth: ${payload.stats.noAuth} · CORS: ${payload.stats.cors} · no-auth+CORS: ${corsNoAuth}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
