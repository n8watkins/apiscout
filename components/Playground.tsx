"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Api } from "@/lib/types";
import { resolveSample } from "@/lib/samples";
import { curlSnippet, fetchSnippet } from "@/lib/snippets";
import { JsonViewer } from "./JsonViewer";
import { CopyButton } from "./CopyButton";

type RunState =
  | { phase: "idle" }
  | { phase: "loading" }
  | {
      phase: "done";
      status: number;
      statusText: string;
      contentType: string;
      body: string;
      durationMs: number;
      via: "direct" | "proxy";
      truncated?: boolean;
    }
  | { phase: "error"; message: string; via: "direct" | "proxy" };

export function Playground({ api }: { api: Api }) {
  const initial = resolveSample(api.url);
  const [endpoint, setEndpoint] = useState(initial.endpoint);
  const [state, setState] = useState<RunState>({ phase: "idle" });
  const [tab, setTab] = useState<"response" | "fetch" | "curl">("response");
  // CORS + no-auth ⇒ we can call the API straight from the browser.
  const canDirect = api.cors === true && api.auth === "none";
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const r = resolveSample(api.url);
    setEndpoint(r.endpoint);
    setState({ phase: "idle" });
    setTab("response");
  }, [api.url]);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ phase: "loading" });
    setTab("response");

    const t0 = performance.now();
    // Try a direct browser fetch when the API advertises CORS + no auth.
    if (canDirect) {
      try {
        const res = await fetch(endpoint, {
          signal: ctrl.signal,
          headers: { Accept: "application/json, text/plain, */*" },
        });
        const body = await res.text();
        setState({
          phase: "done",
          status: res.status,
          statusText: res.statusText,
          contentType: res.headers.get("content-type") ?? "",
          body,
          durationMs: Math.round(performance.now() - t0),
          via: "direct",
        });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        // CORS/network failure — fall back to the proxy below.
      }
    }

    // Proxy path: server-side fetch (SSRF-hardened) for non-CORS / fallback.
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(endpoint)}`, {
        signal: ctrl.signal,
      });
      const json = await res.json();
      if (!json.ok && json.error && json.status === undefined) {
        setState({ phase: "error", message: json.error, via: "proxy" });
        return;
      }
      setState({
        phase: "done",
        status: json.status,
        statusText: json.statusText ?? "",
        contentType: json.contentType ?? "",
        body: json.body ?? "",
        durationMs: Math.round(performance.now() - t0),
        via: "proxy",
        truncated: json.truncated,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState({
        phase: "error",
        message: "Request failed. The endpoint may be down or blocking requests.",
        via: "proxy",
      });
    }
  }, [endpoint, canDirect]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="border-t border-edge bg-[#fafbff] px-4 py-4 sm:px-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
          ▸ Try it live
        </span>
        <span className="rounded-full bg-edge px-1.5 py-0.5 text-[10px] font-semibold text-mute">
          {canDirect ? "direct (CORS)" : "via proxy"}
        </span>
        {!initial.curated && (
          <span className="text-[10px] text-faint">edit the endpoint if needed</span>
        )}
      </div>

      {/* Endpoint input + run button */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-edge-strong bg-surface px-2.5 py-1.5 font-mono text-xs">
          <span className="shrink-0 rounded bg-good-soft px-1.5 py-0.5 text-[10px] font-bold text-good">
            GET
          </span>
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            spellCheck={false}
            aria-label="Request endpoint URL"
            className="focus-ring w-full min-w-0 rounded bg-transparent text-ink outline-none placeholder:text-faint"
            placeholder="https://api.example.com/endpoint"
          />
        </div>
        <button
          onClick={run}
          disabled={state.phase === "loading" || !endpoint}
          className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-2 disabled:opacity-60"
        >
          {state.phase === "loading" ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Sending…
            </>
          ) : (
            <>Send request →</>
          )}
        </button>
      </div>

      {initial.note && state.phase === "idle" && (
        <p className="mt-2 text-[11px] text-mute">ℹ {initial.note}</p>
      )}

      {/* Tabs */}
      <div className="mt-3 flex items-center gap-1 border-b border-edge text-xs">
        {(["response", "fetch", "curl"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`focus-ring -mb-px border-b-2 px-3 py-1.5 font-semibold capitalize transition ${
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-mute hover:text-ink"
            }`}
          >
            {t === "fetch" ? "fetch()" : t}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === "response" && (
          <ResponsePane state={state} />
        )}
        {tab === "fetch" && (
          <SnippetPane code={fetchSnippet(endpoint)} lang="js" />
        )}
        {tab === "curl" && (
          <SnippetPane code={curlSnippet(endpoint)} lang="bash" />
        )}
      </div>
    </div>
  );
}

function ResponsePane({ state }: { state: RunState }) {
  return (
    <AnimatePresence mode="wait">
      {state.phase === "idle" && (
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-xl border border-dashed border-edge-strong bg-surface px-4 py-8 text-center text-xs text-mute"
        >
          Hit <span className="font-semibold text-ink">Send request</span> to see the live JSON response.
        </motion.div>
      )}
      {state.phase === "loading" && (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-2 rounded-xl bg-[#fbfbfe] p-4"
        >
          {[88, 64, 76, 52, 70, 40].map((w, i) => (
            <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} />
          ))}
        </motion.div>
      )}
      {state.phase === "error" && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-xl border border-bad/30 bg-bad-soft px-4 py-4 text-xs text-bad"
        >
          <div className="font-semibold">Request failed</div>
          <p className="mt-1 text-bad/80">{state.message}</p>
          <p className="mt-2 text-[11px] text-bad/60">
            Tip: some APIs need an API key or specific path. Edit the endpoint above and retry.
          </p>
        </motion.div>
      )}
      {state.phase === "done" && (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
            <StatusPill status={state.status} statusText={state.statusText} />
            <span className="text-mute">{state.durationMs} ms</span>
            <span className="text-faint">·</span>
            <span className="text-mute">{state.via === "direct" ? "browser fetch" : "server proxy"}</span>
            {state.contentType && (
              <span className="truncate font-mono text-faint">{state.contentType.split(";")[0]}</span>
            )}
            {state.truncated && (
              <span className="rounded bg-warn-soft px-1.5 py-0.5 font-semibold text-warn">
                truncated at 1 MB
              </span>
            )}
            <span className="ml-auto">
              <CopyButton text={state.body} label="Copy" />
            </span>
          </div>
          <JsonViewer body={state.body} contentType={state.contentType} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatusPill({ status, statusText }: { status: number; statusText: string }) {
  const ok = status >= 200 && status < 300;
  const cls = ok
    ? "bg-good-soft text-good"
    : status >= 400
      ? "bg-bad-soft text-bad"
      : "bg-warn-soft text-warn";
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono font-bold ${cls}`}>
      {status} {statusText}
    </span>
  );
}

function SnippetPane({ code }: { code: string; lang: string }) {
  return (
    <div className="relative">
      <div className="absolute right-2 top-2">
        <CopyButton text={code} label="Copy" />
      </div>
      <pre className="scroll-thin overflow-auto rounded-xl bg-[#1a1d29] p-4 font-mono text-[12.5px] leading-relaxed text-[#e6e8ef]">
        {code}
      </pre>
    </div>
  );
}
