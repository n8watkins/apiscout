import raw from "@/data/apis.json";
import type { ApiData, Api } from "@/lib/types";

export const apiData = raw as ApiData;

export type SortKey = "popular" | "az" | "recent";

/** Blended popularity score: lower is "more popular". Curated rank dominates;
 * GitHub stars fill in for un-ranked entries and break ties. */
function popularityScore(a: Api): number {
  if (a.popularity) return a.popularity; // 1..N curated, always wins
  const stars = a.enrich?.stars;
  if (typeof stars === "number" && stars > 0) {
    // Map stars onto a band *below* the curated set so curated always sorts
    // first, but star-rich repos beat unknown long-tail entries.
    return 1000 - Math.min(999, Math.log10(stars + 1) * 120);
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Most recent "lastChecked" timestamp, for the Recently-checked sort. */
function lastCheckedTs(a: Api): number {
  const t = a.enrich?.lastChecked;
  return t ? Date.parse(t) : 0;
}

export function sortApis(apis: Api[], key: SortKey): Api[] {
  const copy = [...apis];
  switch (key) {
    case "popular":
      return copy.sort(
        (a, b) =>
          popularityScore(a) - popularityScore(b) ||
          (b.enrich?.stars ?? 0) - (a.enrich?.stars ?? 0) ||
          a.name.localeCompare(b.name)
      );
    case "az":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "recent":
      return copy.sort(
        (a, b) => lastCheckedTs(b) - lastCheckedTs(a) || a.name.localeCompare(b.name)
      );
  }
}

/** The curated "Popular APIs" featured strip — top-ranked, callable entries,
 * de-duped by hostname so near-identical upstream rows don't both show up. */
export function featuredApis(apis: Api[], n = 8): Api[] {
  const seen = new Set<string>();
  const out: Api[] = [];
  for (const a of apis
    .filter((a) => a.popularity)
    .sort((a, b) => (a.popularity ?? 0) - (b.popularity ?? 0))) {
    let host = "";
    try {
      host = new URL(a.url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      host = a.name.toLowerCase();
    }
    // Collapse api.* and bare hosts (e.g. api.coingecko.com / coingecko.com).
    const base = host.replace(/^api\./, "");
    if (seen.has(base)) continue;
    seen.add(base);
    out.push(a);
    if (out.length >= n) break;
  }
  return out;
}

/** GitHub repo star count for the project itself, cached at the edge. Best-effort:
 * returns null on any failure so the page never blocks on it. */
export async function getStars(): Promise<number | null> {
  try {
    const res = await fetch("https://api.github.com/repos/n8watkins/apiscout", {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { stargazers_count?: number };
    return typeof json.stargazers_count === "number" ? json.stargazers_count : null;
  } catch {
    return null;
  }
}
