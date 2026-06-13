import type { Api } from "@/lib/types";
import { httpsStatus } from "@/lib/types";

export function AuthBadge({ auth, label }: { auth: Api["auth"]; label?: string }) {
  if (auth === "none") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-good-soft px-1.5 py-0.5 text-[11px] font-semibold text-good">
        No auth
      </span>
    );
  }
  const text =
    auth === "apiKey" ? "API key" : auth === "oauth" ? "OAuth" : label ?? "Auth";
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-warn-soft px-1.5 py-0.5 text-[11px] font-semibold text-warn">
      {text}
    </span>
  );
}

export function CorsBadge({ cors }: { cors: boolean | null }) {
  if (cors === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">
        CORS ✓
      </span>
    );
  }
  if (cors === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-bad-soft px-1.5 py-0.5 text-[11px] font-semibold text-bad">
        No CORS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-edge px-1.5 py-0.5 text-[11px] font-semibold text-mute">
      CORS ?
    </span>
  );
}

/**
 * Honest HTTPS badge. We never show a bare "HTTPS ✓" for something we only have
 * the README's word on. We distinguish:
 *  - verified         → we completed an HTTPS request at build time
 *  - claimed          → README says yes, we couldn't confirm (dashed, "claimed")
 *  - unverified-claim → README says yes but our check failed (warn)
 *  - no               → HTTP only
 */
export function HttpsBadge({ api }: { api: Api }) {
  const status = httpsStatus(api);
  switch (status) {
    case "verified":
      return (
        <span
          title="Verified: an HTTPS request completed at build time"
          className="inline-flex items-center gap-1 rounded-md bg-good-soft px-1.5 py-0.5 text-[11px] font-semibold text-good"
        >
          HTTPS ✓ verified
        </span>
      );
    case "claimed":
      return (
        <span
          title="The upstream directory claims HTTPS; APIScout has not independently confirmed it"
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-edge-strong bg-bg px-1.5 py-0.5 text-[11px] font-semibold text-mute"
        >
          HTTPS · claimed
        </span>
      );
    case "unverified-claim":
      return (
        <span
          title="Listed as HTTPS upstream, but our build-time check could not complete an HTTPS request"
          className="inline-flex items-center gap-1 rounded-md bg-warn-soft px-1.5 py-0.5 text-[11px] font-semibold text-warn"
        >
          HTTPS · unconfirmed
        </span>
      );
    case "no":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-bad-soft px-1.5 py-0.5 text-[11px] font-semibold text-bad">
          HTTP only
        </span>
      );
    default:
      return null;
  }
}

function timeAgo(iso: string): string {
  const d = Date.parse(iso);
  if (!d) return "";
  const days = Math.floor((Date.now() - d) / 86400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** GitHub star count, shown only when enrichment resolved a real repo. */
export function StarsBadge({ api }: { api: Api }) {
  const stars = api.enrich?.stars;
  if (typeof stars !== "number") return null;
  const label =
    stars >= 1000 ? `${(stars / 1000).toFixed(stars >= 10000 ? 0 : 1)}k` : `${stars}`;
  return (
    <span
      title={`${stars.toLocaleString()} GitHub stars`}
      className="inline-flex items-center gap-1 rounded-md bg-warn-soft px-1.5 py-0.5 text-[11px] font-semibold text-warn"
    >
      ★ {label}
    </span>
  );
}

/** Maintenance signal from a repo's last push, or liveness for non-GitHub links. */
export function ActivityBadge({ api }: { api: Api }) {
  const e = api.enrich;
  if (!e) return null;
  if (e.lastCommit) {
    const days = Math.floor((Date.now() - Date.parse(e.lastCommit)) / 86400_000);
    const fresh = days < 365;
    return (
      <span
        title={`Last commit ${timeAgo(e.lastCommit)} (checked ${e.lastChecked ? timeAgo(e.lastChecked) : "recently"})`}
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
          fresh ? "bg-good-soft text-good" : "bg-edge text-mute"
        }`}
      >
        {fresh ? "● active" : "○ stale"} · {timeAgo(e.lastCommit)}
      </span>
    );
  }
  if (e.reachable === true) {
    return (
      <span
        title={`Reachable at build time${e.lastChecked ? ` (checked ${timeAgo(e.lastChecked)})` : ""}`}
        className="inline-flex items-center gap-1 rounded-md bg-good-soft px-1.5 py-0.5 text-[11px] font-semibold text-good"
      >
        ● reachable
      </span>
    );
  }
  if (e.reachable === false) {
    return (
      <span
        title={`Build-time liveness check did not get a response${e.lastChecked ? ` (checked ${timeAgo(e.lastChecked)})` : ""}`}
        className="inline-flex items-center gap-1 rounded-md bg-bad-soft px-1.5 py-0.5 text-[11px] font-semibold text-bad"
      >
        ○ no response
      </span>
    );
  }
  return null;
}
