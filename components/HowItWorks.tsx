const STEPS = [
  {
    icon: "🔎",
    title: "Search & filter",
    body: "Instant client-side search across 1,500+ APIs. Filter by category, auth type, HTTPS — and CORS, the combination nobody else surfaces.",
  },
  {
    icon: "⚡",
    title: "The no-auth + CORS combo",
    body: "One click finds APIs you can call straight from browser JavaScript with zero setup — no key, no backend, no CORS errors. Perfect for demos and side projects.",
  },
  {
    icon: "▸",
    title: "Try it live",
    body: "Fire a real GET request and read the syntax-highlighted JSON in-page. CORS APIs run directly from your browser; the rest go through one SSRF-hardened proxy.",
  },
  {
    icon: "📋",
    title: "Copy & ship",
    body: "Grab a ready-to-paste fetch() or curl snippet for any endpoint and drop it straight into your code.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-edge bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          How it works
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          APIScout turns a giant alphabetical README into a tool you can actually use.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-edge bg-card p-5 shadow-sm transition hover:border-edge-strong hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-lg">
                {s.icon}
              </div>
              <h3 className="mt-3 font-bold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-mute">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
