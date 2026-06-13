"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { ApiData, Api, AuthType } from "@/lib/types";
import { sortApis, featuredApis, type SortKey } from "@/lib/data";
import { ApiCard } from "./ApiCard";
import { CategoryRail } from "./CategoryRail";
import { FeaturedStrip } from "./FeaturedStrip";

type TriFilter = "any" | "yes" | "no";
type AuthFilter = "any" | AuthType;

const PAGE = 36;

const SORTS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "az", label: "A–Z" },
  { value: "recent", label: "Recently checked" },
];

export function Directory({ data }: { data: ApiData }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [auth, setAuth] = useState<AuthFilter>("any");
  const [cors, setCors] = useState<TriFilter>("any");
  const [https, setHttps] = useState<TriFilter>("any");
  const [sort, setSort] = useState<SortKey>("popular");
  const [limit, setLimit] = useState(PAGE);
  const [highlight, setHighlight] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filterTop = useRef<HTMLDivElement>(null);

  const featured = useMemo(() => featuredApis(data.apis, 10), [data.apis]);

  // "/" focuses search (keyboard a11y), Esc clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape" && el === searchRef.current) {
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = data.apis.filter((a) => {
      if (category !== "All" && a.category !== category) return false;
      if (auth !== "any" && a.auth !== auth) return false;
      if (cors === "yes" && a.cors !== true) return false;
      if (cors === "no" && a.cors === true) return false;
      if (https === "yes" && a.https !== true) return false;
      if (https === "no" && a.https === true) return false;
      if (q) {
        const hay = `${a.name} ${a.description} ${a.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortApis(matched, sort);
  }, [data.apis, query, category, auth, cors, https, sort]);

  useEffect(() => setLimit(PAGE), [query, category, auth, cors, https, sort]);

  const shown = filtered.slice(0, limit);
  const activeFilters =
    (category !== "All" ? 1 : 0) +
    (auth !== "any" ? 1 : 0) +
    (cors !== "any" ? 1 : 0) +
    (https !== "any" ? 1 : 0);

  const applyHeroCombo = useCallback(() => {
    setAuth("none");
    setCors("yes");
    setHttps("any");
    setCategory("All");
    setQuery("");
  }, []);

  const reset = useCallback(() => {
    setAuth("any");
    setCors("any");
    setHttps("any");
    setCategory("All");
    setQuery("");
  }, []);

  const heroActive = auth === "none" && cors === "yes";

  // Jump from the featured strip to that exact API: search by name, reset other
  // filters, scroll the directory into view and flash a highlight.
  const jumpTo = useCallback((api: Api) => {
    reset();
    setSort("popular");
    setQuery(api.name);
    setHighlight(`${api.name}::${api.url}`);
    requestAnimationFrame(() => {
      filterTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    setTimeout(() => setHighlight(null), 2400);
  }, [reset]);

  const pickCategory = useCallback((name: string) => {
    setCategory(name);
    requestAnimationFrame(() => {
      filterTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <>
      <FeaturedStrip apis={featured} onPick={jumpTo} />
      <CategoryRail
        categories={data.categoryMeta}
        active={category}
        onPick={pickCategory}
        total={data.count}
      />

      <section id="directory" className="mx-auto max-w-7xl px-4 pb-20 pt-2 sm:px-6">
        <div ref={filterTop} className="scroll-mt-20" />
        {/* Sticky filter bar */}
        <div className="sticky top-[57px] z-20 -mx-4 mb-6 border-b border-edge bg-bg/85 px-4 pb-4 pt-4 backdrop-blur-md sm:-mx-6 sm:px-6">
          {/* Search */}
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-faint"
              aria-hidden
            >
              <path d="M8 2a6 6 0 1 0 3.7 10.7l4.3 4.3 1.4-1.4-4.3-4.3A6 6 0 0 0 8 2Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 1,500+ APIs by name, description or category…"
              aria-label="Search APIs"
              className="focus-ring w-full rounded-xl border border-edge-strong bg-surface py-3 pl-11 pr-16 text-sm text-ink shadow-sm outline-none transition focus:border-accent placeholder:text-faint"
            />
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-edge-strong bg-bg px-1.5 py-0.5 font-mono text-[10px] text-faint sm:block">
              /
            </kbd>
          </div>

          {/* Filter row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* HERO combo — the unmet need */}
            <button
              onClick={heroActive ? reset : applyHeroCombo}
              className={`focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                heroActive
                  ? "bg-accent text-white"
                  : "bg-gradient-to-r from-accent to-accent-2 text-white hover:opacity-90"
              }`}
              title="The combo nobody else surfaces: callable straight from the browser"
            >
              ⚡ No-auth + CORS
              {heroActive && <span aria-hidden>✕</span>}
            </button>

            <div className="hidden h-5 w-px bg-edge sm:block" />

            <FilterSelect
              label="Category"
              value={category}
              onChange={setCategory}
              options={["All", ...data.categories]}
            />
            <FilterSelect
              label="Auth"
              value={auth}
              onChange={(v) => setAuth(v as AuthFilter)}
              options={[
                { value: "any", label: "Any auth" },
                { value: "none", label: "No auth" },
                { value: "apiKey", label: "API key" },
                { value: "oauth", label: "OAuth" },
              ]}
            />
            <TriToggle label="CORS" value={cors} onChange={setCors} />
            <TriToggle label="HTTPS" value={https} onChange={setHttps} />

            <div className="hidden h-5 w-px bg-edge sm:block" />
            <SortSelect value={sort} onChange={setSort} />

            {activeFilters > 0 && (
              <button
                onClick={reset}
                className="focus-ring ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-mute transition hover:text-ink"
              >
                Clear ({activeFilters}) ✕
              </button>
            )}
          </div>

          {/* Result count */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-mute">
            <span>
              <span className="font-bold text-ink tabular-nums">{filtered.length.toLocaleString()}</span>{" "}
              {filtered.length === 1 ? "API" : "APIs"}
              {filtered.length !== data.count && (
                <span className="text-faint"> of {data.count.toLocaleString()}</span>
              )}
            </span>
            <span className="text-faint">·</span>
            <span className="text-faint">sorted by {SORTS.find((s) => s.value === sort)?.label.toLowerCase()}</span>
            {heroActive && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">
                testable directly in your browser
              </span>
            )}
          </div>
        </div>

        {/* Grid */}
        {shown.length > 0 ? (
          <>
            <motion.div
              layout
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {shown.map((api) => {
                const key = `${api.name}::${api.url}`;
                return (
                  <div
                    key={key}
                    className={
                      highlight === key
                        ? "rounded-2xl ring-2 ring-accent ring-offset-2 ring-offset-bg transition"
                        : undefined
                    }
                  >
                    <ApiCard api={api} />
                  </div>
                );
              })}
            </motion.div>

            {limit < filtered.length && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setLimit((l) => l + PAGE * 2)}
                  className="focus-ring rounded-xl border border-edge-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent"
                >
                  Show more ({(filtered.length - limit).toLocaleString()} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState onReset={reset} query={query} />
        )}
      </section>
    </>
  );
}

function EmptyState({ onReset, query }: { onReset: () => void; query: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge-strong bg-surface px-6 py-16 text-center">
      <div className="text-4xl">🔭</div>
      <h3 className="mt-3 text-lg font-bold text-ink">No APIs match your filters</h3>
      <p className="mt-1 max-w-sm text-sm text-mute">
        {query ? (
          <>
            Nothing matched <span className="font-mono font-semibold text-ink">&ldquo;{query}&rdquo;</span>. Try a
            broader term or loosen the filters.
          </>
        ) : (
          "Try loosening the filters to see more results."
        )}
      </p>
      <button
        onClick={onReset}
        className="focus-ring mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-2"
      >
        Reset filters
      </button>
    </div>
  );
}

function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <label className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-edge-strong bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:border-accent">
      <span className="text-faint">Sort:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="cursor-pointer bg-transparent font-semibold outline-none"
        aria-label="Sort APIs"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: (string | { value: string; label: string })[];
}) {
  const norm = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  const active = value !== "All" && value !== "any";
  return (
    <label
      className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-edge-strong bg-surface text-ink hover:border-accent"
      }`}
    >
      <span className="text-faint">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer bg-transparent font-semibold outline-none"
      >
        {norm.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TriToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriFilter;
  onChange: (v: TriFilter) => void;
}) {
  const next: Record<TriFilter, TriFilter> = { any: "yes", yes: "no", no: "any" };
  const active = value !== "any";
  const txt = value === "yes" ? "Yes" : value === "no" ? "No" : "Any";
  return (
    <button
      onClick={() => onChange(next[value])}
      className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
        active
          ? value === "yes"
            ? "border-good bg-good-soft text-good"
            : "border-bad bg-bad-soft text-bad"
          : "border-edge-strong bg-surface text-ink hover:border-accent"
      }`}
      aria-label={`${label} filter: ${txt}`}
    >
      <span className="text-faint">{label}:</span>
      <span>{txt}</span>
    </button>
  );
}
