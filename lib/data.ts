import raw from "@/data/apis.json";
import type { ApiData } from "@/lib/types";

export const apiData = raw as ApiData;

/** GitHub repo star count, cached at the edge. Best-effort: returns null on
 * any failure so the page never blocks on it. */
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
