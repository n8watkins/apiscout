export type AuthType = "none" | "apiKey" | "oauth" | "other";

/** How sure we are an endpoint speaks HTTPS.
 * - "verified": we actually completed an HTTPS request at build time
 * - "claimed":  the upstream README says yes, but we couldn't confirm it
 * - "unverified-claim": README says yes AND our check said no/unreachable
 * - "no": README says HTTP-only
 * - "unknown": README didn't say and we couldn't check
 */
export type HttpsStatus =
  | "verified"
  | "claimed"
  | "unverified-claim"
  | "no"
  | "unknown";

/** Build-time enrichment attached to an API (all best-effort, may be absent). */
export interface Enrichment {
  /** GitHub stars, when the API's link resolves to a github.com/owner/repo. */
  stars?: number;
  /** ISO date of the repo's last push, when it's a GitHub repo. */
  lastCommit?: string;
  /** Liveness for non-GitHub links: did a HEAD/GET succeed at build time? */
  reachable?: boolean;
  /** Did an HTTPS request actually complete at build time? */
  httpsOk?: boolean;
  /** ISO date this entry was last checked by the enrichment pipeline. */
  lastChecked?: string;
}

export interface Api {
  name: string;
  url: string;
  description: string;
  category: string;
  auth: AuthType;
  authLabel: string;
  https: boolean | null;
  cors: boolean | null;
  /** Curated popularity rank (1 = most popular). Absent for the long tail. */
  popularity?: number;
  /** Build-time enrichment (stars, activity, HTTPS verification, liveness). */
  enrich?: Enrichment;
}

export interface CategoryMeta {
  name: string;
  count: number;
  /** Emoji used on the category rail. */
  icon: string;
}

export interface ApiData {
  generatedAt: string;
  source: string;
  count: number;
  categoryCount: number;
  categories: string[];
  categoryMeta: CategoryMeta[];
  /** When the enrichment pass last ran, if ever. */
  enrichedAt?: string;
  /** Coverage stats from the enrichment pass. */
  enrichStats?: {
    httpsVerified: number;
    githubEnriched: number;
    reachable: number;
    checked: number;
  };
  stats: {
    noAuth: number;
    cors: number;
    https: number;
    corsNoAuth: number;
  };
  apis: Api[];
}

/** Resolve the honest HTTPS status of an API from its claim + verification. */
export function httpsStatus(api: Api): HttpsStatus {
  const verified = api.enrich?.httpsOk;
  if (verified === true) return "verified";
  if (api.https === false) return "no";
  if (api.https === true) {
    // README claims HTTPS. If we tried and it failed, flag the discrepancy;
    // otherwise it's an unconfirmed claim.
    return verified === false ? "unverified-claim" : "claimed";
  }
  // README didn't say. A successful check would have set verified=true above.
  return "unknown";
}
