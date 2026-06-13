"use client";

import { motion } from "framer-motion";
import type { ApiData } from "@/lib/types";

export function Hero({ data }: { data: ApiData }) {
  const stats = [
    { value: data.count.toLocaleString(), label: "public APIs" },
    { value: data.categoryCount.toString(), label: "categories" },
    { value: data.stats.noAuth.toLocaleString(), label: "no-auth" },
    { value: data.stats.corsNoAuth.toLocaleString(), label: "no-auth + CORS" },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-3xl"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-edge-strong bg-surface px-3 py-1 text-xs font-medium text-mute shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-good pulse-dot" />
          Open source · free forever · no sign-up
        </div>
        <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
          Find, filter &amp; <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">test free public APIs</span> — live, in your browser.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-mute sm:text-lg">
          A real searchable frontend for the famous{" "}
          <span className="font-semibold text-ink">public-apis</span> directory. Filter{" "}
          {data.count.toLocaleString()} APIs by category, auth, HTTPS and{" "}
          <span className="font-semibold text-accent">CORS</span> — then fire a request and read the JSON
          response without leaving the page.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href="#directory"
            className="focus-ring rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent-2"
          >
            Browse the directory ↓
          </a>
          <a
            href="https://github.com/n8watkins/apiscout"
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded-xl border border-edge-strong bg-surface px-5 py-3 text-sm font-bold text-ink shadow-sm transition hover:border-accent hover:text-accent"
          >
            ★ Star on GitHub
          </a>
        </div>
      </motion.div>

      <motion.dl
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
        className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`rounded-2xl border bg-card p-4 shadow-sm ${
              i === 3 ? "border-accent/30 bg-accent-soft" : "border-edge"
            }`}
          >
            <dt className="order-2 text-xs font-medium text-mute">{s.label}</dt>
            <dd className={`text-2xl font-extrabold tabular-nums sm:text-3xl ${i === 3 ? "text-accent" : "text-ink"}`}>
              {s.value}
            </dd>
          </div>
        ))}
      </motion.dl>
    </section>
  );
}
