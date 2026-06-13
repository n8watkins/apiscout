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

// --- Curated popularity seeds (kept in sync with lib/popular.ts) -----------
// Ordered most-popular first; index drives the rank. The .mjs build script
// can't import the TS module, so we mirror the host order here. lib/popular.ts
// remains the source of truth for the app; this list only feeds the build.
const POPULAR_ORDER = [
  "jsonplaceholder.typicode.com", "pokeapi.co", "api.openweathermap.org",
  "openweathermap.org", "api.coingecko.com", "coingecko.com", "restcountries.com",
  "api.nasa.gov", "nasa.gov", "dog.ceo", "catfact.ninja", "open-meteo.com",
  "api.open-meteo.com", "api.github.com", "github.com", "api.spacexdata.com",
  "spacexdata.com", "rickandmortyapi.com", "swapi.dev", "jikan.moe",
  "api.jikan.moe", "agify.io", "genderize.io", "nationalize.io",
  "api.thecatapi.com", "thecatapi.com", "api.thedogapi.com", "thedogapi.com",
  "randomuser.me", "api.chucknorris.io", "chucknorris.io",
  "official-joke-api.appspot.com", "icanhazdadjoke.com", "api.adviceslip.com",
  "adviceslip.com", "api.coinpaprika.com", "coinpaprika.com", "openlibrary.org",
  "world.openfoodfacts.org", "openfoodfacts.org", "api.frankfurter.app",
  "frankfurter.app", "open.er-api.com", "api.exchangerate.host",
  "exchangerate.host", "dummyjson.com", "reqres.in", "api.tvmaze.com",
  "tvmaze.com", "api.disneyapi.dev", "disneyapi.dev", "ghibliapi.vercel.app",
  "ghibliapi.herokuapp.com", "api.quotable.io", "quotable.io", "zenquotes.io",
  "boredapi.com", "api.ipify.org", "ipify.org", "ipapi.co", "api.kanye.rest",
  "kanye.rest", "yesno.wtf", "api.artic.edu", "artic.edu", "datausa.io",
  "api.zippopotam.us", "zippopotam.us", "uselessfacts.jsph.pl", "shibe.online",
  "random.dog", "http.cat", "http.dog", "meowfacts.herokuapp.com",
  "api.sampleapis.com", "fakerapi.it",
];
const POPULAR_RANK = new Map(POPULAR_ORDER.map((h, i) => [h, i + 1]));

const CATEGORY_ICONS = {
  Animals: "🐾", Anime: "🌸", "Anti-Malware": "🛡️", "Art & Design": "🎨",
  "Authentication & Authorization": "🔐", Blockchain: "⛓️", Books: "📚",
  Business: "💼", Calendar: "📅", "Cloud Storage & File Sharing": "☁️",
  "Continuous Integration": "🔁", Cryptocurrency: "🪙", "Currency Exchange": "💱",
  "Data Validation": "✅", Development: "💻", Dictionaries: "📖",
  "Documents & Productivity": "📄", Email: "✉️", Entertainment: "🎬",
  Environment: "🌱", Events: "🎟️", Finance: "💰", "Food & Drink": "🍔",
  "Games & Comics": "🎮", Geocoding: "🗺️", Government: "🏛️", Health: "🩺",
  Jobs: "🧑‍💼", "Machine Learning": "🤖", Music: "🎵", News: "📰",
  "Open Data": "📊", "Open Source Projects": "🌐", Patent: "📝",
  Personality: "🧠", Phone: "📱", Photography: "📷", Programming: "⌨️",
  "Science & Math": "🔬", Security: "🔒", Shopping: "🛍️", Social: "💬",
  "Sports & Fitness": "🏅", "Test Data": "🧪", "Text Analysis": "🔤",
  Tracking: "📦", Transportation: "🚆", "URL Shorteners": "🔗", Vehicle: "🚗",
  Video: "📺", Weather: "🌦️",
};

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

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

  // Stamp curated popularity rank by hostname.
  for (const a of deduped) {
    const rank = POPULAR_RANK.get(hostOf(a.url));
    if (rank) a.popularity = rank;
  }

  // Merge any cached enrichment (stars / activity / HTTPS verification) keyed
  // by name::url. Produced by scripts/enrich.mjs and committed to git so the
  // build never depends on the network for verification data.
  const enrichPath = path.join(ROOT, "data", "enrichment.json");
  let enrichMap = {};
  let enrichedAt;
  if (fs.existsSync(enrichPath)) {
    try {
      const cache = JSON.parse(fs.readFileSync(enrichPath, "utf8"));
      enrichMap = cache.entries ?? {};
      enrichedAt = cache.generatedAt;
    } catch (e) {
      console.warn("Could not read enrichment cache:", e.message);
    }
  }
  for (const a of deduped) {
    const e = enrichMap[`${a.name}::${a.url}`];
    if (e) a.enrich = e;
  }

  // Stable sort: category, then name.
  deduped.sort(
    (a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );

  const categories = [...new Set(deduped.map((a) => a.category))].sort();

  const categoryMeta = categories.map((name) => ({
    name,
    count: deduped.filter((a) => a.category === name).length,
    icon: CATEGORY_ICONS[name] ?? "🧩",
  }));

  const corsNoAuth = deduped.filter(
    (a) => a.cors === true && a.auth === "none"
  ).length;

  const enriched = deduped.filter((a) => a.enrich);
  const enrichStats = {
    httpsVerified: enriched.filter((a) => a.enrich.httpsOk === true).length,
    githubEnriched: enriched.filter((a) => typeof a.enrich.stars === "number").length,
    reachable: enriched.filter((a) => a.enrich.reachable === true).length,
    checked: enriched.length,
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    count: deduped.length,
    categoryCount: categories.length,
    categories,
    categoryMeta,
    enrichedAt,
    enrichStats,
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
  console.log(
    `  popular-tagged: ${deduped.filter((a) => a.popularity).length} · enriched: ${enrichStats.checked} (https-verified ${enrichStats.httpsVerified}, github ${enrichStats.githubEnriched})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
