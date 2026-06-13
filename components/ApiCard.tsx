"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Api } from "@/lib/types";
import { AuthBadge, CorsBadge, HttpsBadge, StarsBadge, ActivityBadge } from "./Badges";
import { Playground } from "./Playground";

export function ApiCard({ api }: { api: Api }) {
  const [open, setOpen] = useState(false);
  const tryable = Boolean(api.url);

  return (
    <motion.div
      layout="position"
      className="group flex flex-col overflow-hidden rounded-2xl border border-edge bg-card shadow-sm transition hover:border-edge-strong hover:shadow-md"
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold leading-tight text-ink">
            {api.popularity && api.popularity <= 24 && (
              <span
                title="Curated popular API"
                aria-label="Popular"
                className="shrink-0 text-warn"
              >
                ★
              </span>
            )}
            {api.url ? (
              <a
                href={api.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent hover:underline"
              >
                {api.name}
              </a>
            ) : (
              api.name
            )}
          </h3>
          <span className="shrink-0 rounded-md bg-bg px-1.5 py-0.5 text-[10px] font-medium text-mute">
            {api.category}
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-mute">
          {api.description || "No description provided."}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <AuthBadge auth={api.auth} label={api.authLabel} />
          <CorsBadge cors={api.cors} />
          <HttpsBadge api={api} />
          <StarsBadge api={api} />
          <ActivityBadge api={api} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={!tryable}
            aria-expanded={open}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden>▸</span>
            {open ? "Close" : "Try it"}
          </button>
          {api.url && (
            <a
              href={api.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-mute transition hover:text-ink"
            >
              Docs ↗
            </a>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && tryable && (
          <motion.div
            key="pg"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <Playground api={api} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
