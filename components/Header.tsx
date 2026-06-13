import { SITE } from "@/lib/site";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function Header({ stars }: { stars: number | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <a href="/" className="flex items-center gap-2 text-base font-bold tracking-tight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/n8-logo.png" alt="" className="h-7 w-7 rounded-lg" />
            <span>
              API<span className="text-accent">Scout</span>
            </span>
          </a>
          <a
            href={SITE.n8builds}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-xs font-medium text-mute transition hover:text-ink sm:block"
          >
            by n8builds.dev
          </a>
        </div>

        <nav className="flex items-center gap-2">
          <a
            href={SITE.appturnity}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring hidden rounded-lg px-3 py-1.5 text-xs font-semibold text-mute transition hover:text-ink md:block"
          >
            Need this built? →
          </a>
          <a
            href={SITE.kofi}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring hidden items-center gap-1.5 rounded-lg border border-edge-strong px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent sm:flex"
          >
            <span aria-hidden>☕</span>
            <span>Ko-fi</span>
          </a>
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            title="Star APIScout on GitHub"
          >
            <GitHubIcon className="h-4 w-4 fill-current" />
            <span>Star</span>
            {stars !== null && (
              <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[11px] tabular-nums">
                {stars.toLocaleString()}
              </span>
            )}
          </a>
        </nav>
      </div>
    </header>
  );
}
