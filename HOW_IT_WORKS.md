# How APIScout works

A deep dive into the architecture, data pipeline, verification model, live
playground, and UI of [APIScout](https://github.com/n8watkins/apiscout) — the
searchable, verifiable frontend for the
[`public-apis/public-apis`](https://github.com/public-apis/public-apis)
directory.

---

## 1. Overview

The upstream `public-apis` README is one of the most-starred repos on GitHub —
but it's a giant alphabetical markdown table. You can't search it, you can't
filter it, you can't try an endpoint without leaving the page, and it carries no
popularity or freshness signal. APIScout turns that README into a real tool:

- **Instant client-side search & filtering** across 1,562 APIs.
- **A curated popularity signal** so the well-known APIs surface first.
- **A visible category rail** (51 real categories) as a first-class browse mechanism.
- **Build-time verification** — we actually test endpoints over HTTPS and pull
  GitHub activity, then show **verified** vs merely **claimed** instead of
  parroting the README's flags.
- **A live "Try it" playground** that fires real requests in-browser, with an
  SSRF-hardened proxy fallback.

Everything ships as a near-static Next.js app with exactly **one** server route
(the proxy). All the verification work happens at build time and is committed to
git, so the deployed app never blocks on the network for data.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  BUILD TIME (offline-capable, committed to git)                  │
│                                                                  │
│  scripts/build-data.mjs   ─ fetch + parse upstream README        │
│        │                    → data/apis.json (1,562 entries)     │
│        │                    + popularity ranks + category meta   │
│        ▼                                                          │
│  scripts/enrich.mjs       ─ GitHub stars/activity + HTTPS probe  │
│        │                    → data/enrichment.json (cache)        │
│        ▼                                                          │
│  build-data merges enrichment back into apis.json                │
└─────────────────────────────────────────────────────────────────┘
                          │ imported statically
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  RUNTIME (Next.js 15 App Router)                                 │
│                                                                  │
│  app/page.tsx (RSC)                                              │
│   ├─ Hero            (animated, client)                          │
│   ├─ Directory       (client) ── FeaturedStrip                   │
│   │     │                     ── CategoryRail                    │
│   │     └─ ApiCard ── Playground ── JsonViewer                   │
│   └─ HowItWorks                                                  │
│                                                                  │
│  app/api/proxy/route.ts  ── the ONLY server code (SSRF-hardened) │
└─────────────────────────────────────────────────────────────────┘
```

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
framer-motion · Playwright (screenshots only). Hosts on Vercel's free tier.

The home page is a Server Component that imports the baked JSON and renders
client components for the interactive parts. The page is statically generated
and revalidated hourly only to refresh the project's own GitHub star count.

---

## 3. Data pipeline

### 3.1 Parsing the README — `scripts/build-data.mjs`

```bash
npm run data    # fetch + parse → data/apis.json
```

The upstream README is a sequence of per-category markdown tables
(`API | Description | Auth | HTTPS | CORS`). The parser walks the file line by
line, tracking the current `### Category` heading, and accumulates table rows
under it. The cells are inconsistent, so each is normalized into a small set of
stable values the UI can filter on:

- **Auth** → `none | apiKey | oauth | other` (+ a human label).
- **HTTPS / CORS** → `true | false | null` (`null` = "Unknown"/blank upstream).
- **Link** → `[name](url)` is split into a name + URL.

Rows are de-duped by `name::url`, sorted, and written to `data/apis.json` along
with aggregate stats (no-auth count, CORS count, the no-auth+CORS count, etc.).

### 3.2 Popularity ranks — `lib/popular.ts`

The README has **no popularity data**, so APIScout adds one. `lib/popular.ts`
holds a hand-ranked, ordered list of the genuinely well-known free APIs
(JSONPlaceholder, PokeAPI, OpenWeatherMap, CoinGecko, NASA, REST Countries,
Dog CEO, Cat Facts, Open-Meteo, Agify/Genderize, TheCatAPI, Jikan/anime, …).
The build matches an entry by hostname and stamps a `popularity` rank onto it
(1 = most popular). **149** entries get tagged this pass.

> The `.mjs` build script mirrors the host order for offline use; `lib/popular.ts`
> remains the source of truth for the app.

### 3.3 Category metadata — `lib/categories.ts`

Each of the 51 real categories gets an emoji icon, and `build-data` emits a
`categoryMeta` array of `{ name, count, icon }` so the category rail can render
counts without recomputing on the client.

---

## 4. Verification & enrichment

> *"Verify the claims — don't assert details you haven't checked."*

This is the heart of the honesty story. `scripts/enrich.mjs` runs a pragmatic,
build-time enrichment pass over all 1,562 entries:

```bash
npm run enrich                  # full pass, reuse cache entries < 14 days old
node scripts/enrich.mjs --popular     # only popular + GitHub entries (fast)
node scripts/enrich.mjs --limit 300   # cap how many NEW checks run this pass
node scripts/enrich.mjs --max-age 7   # treat cache older than N days as stale
```

For each entry, best-effort and never throwing:

1. **GitHub activity** — if the link resolves to `github.com/owner/repo`, hit the
   GitHub API (token via `gh auth token`, falling back to anonymous) for
   **stars** and **last-push date**. Rate-limit responses are detected and the
   pass degrades gracefully.
2. **HTTPS verification + liveness** — force `https://` and make a real
   `HEAD`→`GET` request. A completed HTTP exchange means HTTPS genuinely works
   *and* the host is reachable; this is reconciled with the README's HTTPS flag.

**Pragmatics for 1,500+ entries:** capped concurrency (default 12), short
timeouts (default 6 s), `HEAD`-with-`GET`-fallback, and a committed
`data/enrichment.json` cache keyed by `name::url` with a `lastChecked` stamp.
Re-runs skip fresh entries, so the pass is incremental and the Next build is
fully offline.

### 4.1 The honest HTTPS model — `httpsStatus()` in `lib/types.ts`

We never show a bare "HTTPS ✓" for something we only have the README's word on.
Every API resolves to one of:

| Status | Meaning | Badge |
|---|---|---|
| `verified` | An HTTPS request **completed** at build time | `HTTPS ✓ verified` (green) |
| `claimed` | README says yes, we couldn't confirm | `HTTPS · claimed` (dashed, muted) |
| `unverified-claim` | README says yes, our check **failed** | `HTTPS · unconfirmed` (warn) |
| `no` | README says HTTP-only | `HTTP only` (red) |
| `unknown` | README didn't say, we couldn't check | *(no badge)* |

Maintenance is shown too: GitHub repos get an `● active · 3mo ago` /
`○ stale` badge from the last-push date; non-GitHub links get
`● reachable` / `○ no response` from the liveness probe.

### 4.2 Coverage this pass

| Metric | Count |
|---|---|
| Entries checked | **1,562 / 1,562** |
| HTTPS-verified (completed a real HTTPS request) | **1,363** |
| Reachable at build time | **1,347** |
| GitHub-activity enriched (stars + last commit) | **99** |
| README claimed HTTPS but we couldn't confirm | 180 → shown as *claimed*, not verified |

Only ~99 of the README links resolve to a `github.com/owner/repo`, which is why
GitHub enrichment covers a smaller slice than HTTPS — most links point at the
API's own docs/homepage, not a repo. Anything unchecked is clearly marked rather
than guessed.

---

## 5. Popularity, categories & sorting (UI)

- **`components/FeaturedStrip.tsx`** — a horizontal "Popular APIs" rail of the
  top curated entries (de-duped by hostname). Clicking a card jumps to that API
  in the directory with a highlight flash.
- **`components/CategoryRail.tsx`** — a visible grid of clickable category tiles
  with icons and per-category counts, ordered by size. This makes the 51 real
  categories a first-class browse mechanism instead of a buried dropdown.
- **Sort control** (`lib/data.ts → sortApis`) — **Popular** (default), **A–Z**,
  **Recently checked**. The popularity sort blends the curated rank (which always
  wins) with GitHub stars (which fill in and break ties for the long tail).
- The existing **No-auth + CORS** one-click combo and all filters (category,
  auth, CORS, HTTPS) are preserved.

---

## 6. The live playground

### 6.1 Smart routing

For an API flagged **CORS-enabled + no-auth**, APIScout calls it **directly from
your browser** — exactly how your own frontend code would — so you see the true
status, latency and response. For everything else (no CORS headers, or the
direct call fails), the request transparently falls back to the server proxy.

Because the README lists docs/homepage URLs (not callable endpoints), the most
popular no-auth APIs get a curated real GET endpoint in `lib/samples.ts`; for the
rest we pre-fill the listed URL and let you edit it.

### 6.2 SSRF-hardened proxy — `app/api/proxy/route.ts` + `lib/safefetch.ts`

The proxy is the only server code, and since the user controls the target URL,
it's a textbook SSRF + memory-exhaustion surface. It's hardened the same way the
rest of my projects harden user-supplied URL fetching:

- **Scheme allowlist** — `http:` / `https:` only (no `file:`, `gopher:`, `data:`…).
- **Private-address blocklist** — loopback, link-local, the cloud metadata
  endpoint `169.254.169.254`, and RFC1918 / unique-local ranges are refused.
- **Manual redirect re-validation** — redirects are followed by hand and **every
  hop** is re-checked, so a benign URL can't `302` into your internal network.
- **Timeout + capped body read** — 8 s timeout; the body is read incrementally
  and stops at 1 MB so a hostile server can't OOM the function.
- **GET only**, JSON/text responses, no request bodies or custom headers proxied.

### 6.3 Rendering

`components/JsonViewer.tsx` syntax-highlights the JSON response; the playground
also generates copy-paste `fetch()` and `curl` snippets for any endpoint.

---

## 7. The animated hero — `components/Hero.tsx`

The hero is tasteful, performant motion that respects `prefers-reduced-motion`:

- An **animated indigo gradient field** + a slowly panning **grid** (pure CSS
  `background-position`, GPU-friendly), masked to fade at the edges.
- **Floating category chips** that bob gently (desktop, decorative).
- A **live request/response terminal card**: a typewriter types out a real
  endpoint, then its trimmed sample JSON response fades in, cycling through five
  genuine no-auth APIs.

Under `prefers-reduced-motion: reduce`, all hero animation (and the pulse/skeleton
animations) are disabled via a single CSS guard in `app/globals.css`; the
typewriter resolves immediately to its final state.

---

## 8. SEO & metadata

- `app/layout.tsx` — full Open Graph + Twitter card metadata, keywords, canonical
  URL, and a `WebApplication` JSON-LD block (`isBasedOn` the upstream repo).
- `app/sitemap.ts` and `app/robots.ts` — generated sitemap + robots.
- `app/icon.png` — rasterized from `scripts/icon.svg` during the screenshot pass.

---

## 9. Run locally

```bash
npm install
npm run dev      # → http://localhost:7690
npm run build    # production build (must pass clean)
npm run start    # serve the production build

# Data + verification (network; results are committed):
npm run data     # rebuild data/apis.json from the upstream README
npm run enrich   # run the GitHub + HTTPS verification pass → enrichment.json
npm run data     # re-run to merge fresh enrichment into apis.json

# Screenshots (needs a running production server):
npm run shot
```

GitHub enrichment uses your `gh auth token` automatically; without it the pass
runs anonymously (heavily rate-limited, fine for the popular subset).

---

## 10. Project structure

```
app/
  layout.tsx          Root layout, SEO metadata, JSON-LD
  page.tsx            RSC home page (imports baked data)
  globals.css         Tailwind theme + hero/animation keyframes
  sitemap.ts robots.ts icon.png
  api/proxy/route.ts  The only server route — SSRF-hardened proxy
components/
  Hero.tsx            Animated hero (gradient/grid/chips/typewriter card)
  Directory.tsx       Search + filters + Sort + grid orchestration
  FeaturedStrip.tsx   "Popular APIs" rail
  CategoryRail.tsx    Clickable category tiles with counts
  ApiCard.tsx         Per-API card + badges + Try-it toggle
  Playground.tsx      Live request runner (direct + proxy)
  JsonViewer.tsx      Syntax-highlighted JSON
  Badges.tsx          Honest HTTPS/auth/CORS/stars/activity badges
  Header.tsx Footer.tsx HowItWorks.tsx CopyButton.tsx
lib/
  types.ts            Types + httpsStatus() honesty model
  data.ts             Static data import + sortApis + featuredApis
  popular.ts          Curated popularity seeds (source of truth)
  categories.ts       Category → emoji icons
  samples.ts          Curated callable endpoints for the playground
  snippets.ts         fetch()/curl snippet generators
  safefetch.ts        SSRF guards (scheme allowlist, blocklist, redirect re-check)
  site.ts             Brand/site config
scripts/
  build-data.mjs      README → apis.json (+ popularity + categoryMeta + merge)
  enrich.mjs          GitHub + HTTPS verification pass → enrichment.json
  screenshot.mjs      Playwright README screenshots + icon rasterization
data/
  apis.json           Baked, enriched API directory (committed)
  enrichment.json     Verification cache keyed by name::url (committed)
```

---

Built by [Nate Watkins](https://n8builds.dev). Data from
[`public-apis/public-apis`](https://github.com/public-apis/public-apis) (MIT) —
APIScout is an independent frontend and is not affiliated with that project.
