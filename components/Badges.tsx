import type { Api } from "@/lib/types";

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

export function HttpsBadge({ https }: { https: boolean | null }) {
  if (https === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-good-soft px-1.5 py-0.5 text-[11px] font-semibold text-good">
        HTTPS
      </span>
    );
  }
  if (https === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-bad-soft px-1.5 py-0.5 text-[11px] font-semibold text-bad">
        HTTP only
      </span>
    );
  }
  return null;
}
