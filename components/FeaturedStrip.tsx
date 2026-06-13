"use client";

import { motion } from "framer-motion";
import type { Api } from "@/lib/types";
import { httpsStatus } from "@/lib/types";

/** A "Popular APIs" featured strip — the genuinely well-known APIs people reach
 * for first. Clicking a card jumps the user to that API in the directory. */
export function FeaturedStrip({
  apis,
  onPick,
}: {
  apis: Api[];
  onPick: (api: Api) => void;
}) {
  if (apis.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-warn" aria-hidden>
          ★
        </span>
        <h2 className="text-sm font-bold tracking-tight text-ink">Popular APIs</h2>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
          most reached-for, free &amp; callable
        </span>
      </div>

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 scroll-thin sm:mx-0 sm:px-0">
        {apis.map((api, i) => (
          <motion.button
            key={`${api.name}::${api.url}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04, ease: "easeOut" }}
            onClick={() => onPick(api)}
            className="focus-ring group w-[230px] shrink-0 snap-start rounded-2xl border border-edge bg-card p-3.5 text-left shadow-sm transition hover:border-accent hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[14px] font-bold text-ink group-hover:text-accent">
                {api.name}
              </span>
              {typeof api.enrich?.stars === "number" && (
                <span className="shrink-0 rounded-md bg-warn-soft px-1.5 py-0.5 text-[10px] font-bold text-warn">
                  ★ {api.enrich.stars >= 1000 ? `${(api.enrich.stars / 1000).toFixed(0)}k` : api.enrich.stars}
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 h-[34px] text-[12px] leading-snug text-mute">
              {api.description || "No description provided."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="rounded bg-bg px-1.5 py-0.5 text-[10px] font-medium text-mute">
                {api.category}
              </span>
              {api.auth === "none" && (
                <span className="rounded bg-good-soft px-1.5 py-0.5 text-[10px] font-semibold text-good">
                  no auth
                </span>
              )}
              {api.cors === true && (
                <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  CORS
                </span>
              )}
              {httpsStatus(api) === "verified" && (
                <span className="rounded bg-good-soft px-1.5 py-0.5 text-[10px] font-semibold text-good">
                  HTTPS ✓
                </span>
              )}
            </div>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent opacity-0 transition group-hover:opacity-100">
              Try it ▸
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
