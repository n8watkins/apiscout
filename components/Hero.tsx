"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ApiData } from "@/lib/types";

// Real, callable no-auth endpoints from the directory + a representative
// trimmed JSON response. The hero cycles through these: the endpoint is typed
// out, then its sample response fades in — so visitors immediately see what the
// playground does, using genuine data.
const DEMOS: { endpoint: string; json: string }[] = [
  {
    endpoint: "GET https://catfact.ninja/fact",
    json: `{
  "fact": "Cats have 32 muscles in each ear.",
  "length": 33
}`,
  },
  {
    endpoint: "GET https://api.coingecko.com/api/v3/ping",
    json: `{
  "gecko_says": "(V3) To the Moon!"
}`,
  },
  {
    endpoint: "GET https://dog.ceo/api/breeds/image/random",
    json: `{
  "message": "https://images.dog.ceo/breeds/…/n02110185_10092.jpg",
  "status": "success"
}`,
  },
  {
    endpoint: "GET https://pokeapi.co/api/v2/pokemon/ditto",
    json: `{
  "name": "ditto",
  "id": 132,
  "weight": 40,
  "types": [{ "type": { "name": "normal" } }]
}`,
  },
  {
    endpoint: "GET https://api.agify.io?name=michael",
    json: `{
  "name": "michael",
  "age": 63,
  "count": 233482
}`,
  },
];

const CHIPS = [
  { label: "🐾 Animals", x: "6%", y: "12%", dur: "6.5s", delay: "0s" },
  { label: "🌸 Anime", x: "84%", y: "8%", dur: "7.5s", delay: "0.8s" },
  { label: "🌦️ Weather", x: "2%", y: "62%", dur: "8s", delay: "0.4s" },
  { label: "🪙 Crypto", x: "90%", y: "55%", dur: "6.8s", delay: "1.2s" },
  { label: "🚀 Space", x: "70%", y: "82%", dur: "7.2s", delay: "0.2s" },
];

function useTypewriter(text: string, active: boolean, speed = 38) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!active) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return out;
}

export function Hero({ data }: { data: ApiData }) {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [showJson, setShowJson] = useState(false);
  const demo = DEMOS[idx];
  const typed = useTypewriter(demo.endpoint, !reduce);
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cycle: type endpoint → reveal JSON → hold → advance.
  useEffect(() => {
    if (reduce) {
      setShowJson(true);
      return;
    }
    setShowJson(false);
    const typeMs = demo.endpoint.length * 38 + 150;
    const revealAt = setTimeout(() => setShowJson(true), typeMs);
    tickRef.current = setTimeout(() => {
      setIdx((i) => (i + 1) % DEMOS.length);
    }, typeMs + 3200);
    return () => {
      clearTimeout(revealAt);
      if (tickRef.current) clearTimeout(tickRef.current);
    };
  }, [idx, reduce, demo.endpoint]);

  const stats = [
    { value: data.count.toLocaleString(), label: "public APIs" },
    { value: data.categoryCount.toString(), label: "categories" },
    { value: data.stats.noAuth.toLocaleString(), label: "no-auth" },
    { value: data.stats.corsNoAuth.toLocaleString(), label: "no-auth + CORS" },
  ];

  const verified = data.enrichStats?.httpsVerified ?? 0;

  return (
    <section className="relative overflow-hidden">
      {/* Animated background layers */}
      <div className="pointer-events-none absolute inset-0 hero-field" aria-hidden />
      <div className="pointer-events-none absolute inset-0 hero-grid" aria-hidden />
      {/* Floating category chips (desktop only, decorative) */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        {CHIPS.map((c) => (
          <span
            key={c.label}
            className="float-chip absolute rounded-full border border-edge-strong bg-surface/80 px-3 py-1 text-xs font-semibold text-mute shadow-sm backdrop-blur-sm"
            style={
              {
                left: c.x,
                top: c.y,
                "--dur": c.dur,
                "--delay": c.delay,
              } as React.CSSProperties
            }
          >
            {c.label}
          </span>
        ))}
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pb-8 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-edge-strong bg-surface/90 px-3 py-1 text-xs font-medium text-mute shadow-sm backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-good pulse-dot" />
            Open source · free forever · no sign-up
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
            Find, filter &amp;{" "}
            <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
              test free public APIs
            </span>{" "}
            — live, in your browser.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-mute sm:text-lg">
            A real searchable frontend for the famous{" "}
            <span className="font-semibold text-ink">public-apis</span> directory. Filter{" "}
            {data.count.toLocaleString()} APIs by category, popularity, auth, HTTPS and{" "}
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

        {/* Right: live request/response card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
          className="relative"
        >
          <div className="overflow-hidden rounded-2xl border border-edge-strong bg-[#1a1d29] shadow-xl">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
              <span className="ml-2 font-mono text-[11px] text-white/40">apiscout · try it live</span>
            </div>
            <div className="px-4 py-3.5 font-mono text-[12.5px] leading-relaxed">
              <div className="flex items-start gap-2 text-[#e6e8ef]">
                <span className="shrink-0 rounded bg-good-soft px-1.5 py-0.5 text-[10px] font-bold text-good">
                  GET
                </span>
                <span className="break-all text-[#c7d2fe]">
                  {typed.replace(/^GET /, "")}
                  {!showJson && <span className="caret text-accent">▋</span>}
                </span>
              </div>
              <motion.pre
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: showJson ? 1 : 0, y: showJson ? 0 : 6 }}
                transition={{ duration: 0.35 }}
                className="mt-3 min-h-[120px] whitespace-pre-wrap text-[#9aa0b3]"
              >
                <span className="text-good">200 OK</span>{" "}
                <span className="text-white/30">· 84 ms · application/json</span>
                {"\n"}
                {showJson ? demo.json : ""}
              </motion.pre>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-mute">
            Real endpoints. Trimmed sample responses — run the live ones below.
          </p>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.dl
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="relative mx-auto mt-4 grid max-w-7xl grid-cols-2 gap-3 px-4 sm:grid-cols-4 sm:px-6"
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`rounded-2xl border bg-card/90 p-4 shadow-sm backdrop-blur-sm ${
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
      {verified > 0 && (
        <p className="relative mx-auto mt-3 max-w-7xl px-4 text-center text-[11px] text-faint sm:px-6">
          {verified.toLocaleString()} endpoints HTTPS-verified at build time · star counts &amp; maintenance pulled
          from GitHub
        </p>
      )}
    </section>
  );
}
