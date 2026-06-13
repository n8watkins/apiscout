"use client";

import { motion } from "framer-motion";
import type { CategoryMeta } from "@/lib/types";

/** A visible, clickable rail of real categories with per-category counts.
 * Clicking a tile sets the active category filter in the Directory. */
export function CategoryRail({
  categories,
  active,
  onPick,
  total,
}: {
  categories: CategoryMeta[];
  active: string;
  onPick: (name: string) => void;
  total: number;
}) {
  // Show the meatiest categories first — they're the most useful entry points.
  const ordered = [...categories].sort((a, b) => b.count - a.count);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-2 pt-2 sm:px-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-ink">Browse by category</h2>
          <p className="text-xs text-mute">
            {categories.length} real categories from the directory — pick one to filter.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <Tile
          icon="✷"
          name="All"
          count={total}
          active={active === "All"}
          onClick={() => onPick("All")}
        />
        {ordered.map((c, i) => (
          <Tile
            key={c.name}
            icon={c.icon}
            name={c.name}
            count={c.count}
            active={active === c.name}
            onClick={() => onPick(c.name)}
            delay={Math.min(i, 16) * 0.012}
          />
        ))}
      </div>
    </section>
  );
}

function Tile({
  icon,
  name,
  count,
  active,
  onClick,
  delay = 0,
}: {
  icon: string;
  name: string;
  count: number;
  active: boolean;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      onClick={onClick}
      aria-pressed={active}
      title={`${name} — ${count.toLocaleString()} APIs`}
      className={`focus-ring group flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left shadow-sm transition ${
        active
          ? "border-accent bg-accent-soft"
          : "border-edge bg-card hover:border-accent hover:bg-accent-soft/40"
      }`}
    >
      <span className="text-lg leading-none transition-transform group-hover:scale-110" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[13px] font-semibold leading-tight ${
            active ? "text-accent" : "text-ink"
          }`}
        >
          {name}
        </span>
        <span className="block text-[11px] tabular-nums text-faint">
          {count.toLocaleString()} APIs
        </span>
      </span>
    </motion.button>
  );
}
