import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-edge bg-surface/60">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 text-base font-bold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/n8-logo.png" alt="" className="h-6 w-6 rounded-md" />
              API<span className="-ml-1 text-accent">Scout</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-mute">
              A free, open-source frontend for the{" "}
              <a
                href={SITE.source}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent hover:underline"
              >
                public-apis/public-apis
              </a>{" "}
              directory — searchable, filterable by CORS &amp; auth, with a live
              in-browser playground.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <div className="mb-2 font-semibold text-ink">Project</div>
              <ul className="space-y-1.5 text-mute">
                <li>
                  <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href={SITE.source} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                    Data source
                  </a>
                </li>
                <li>
                  <a href={SITE.kofi} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                    Support on Ko-fi ☕
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-semibold text-ink">Build</div>
              <ul className="space-y-1.5 text-mute">
                <li>
                  <a href={SITE.appturnity} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                    Appturnity
                  </a>
                </li>
                <li>
                  <a href={SITE.n8builds} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                    n8builds.dev
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-edge pt-6 text-xs text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>
            Built by{" "}
            <a href={SITE.n8builds} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink hover:text-accent">
              Nate
            </a>{" "}
            ·{" "}
            <a href={SITE.n8builds} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
              n8builds.dev
            </a>
          </p>
          <p>
            Data credit:{" "}
            <a href={SITE.source} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
              public-apis/public-apis
            </a>{" "}
            (MIT)
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm">
          <span className="font-semibold text-ink">Need something like this built?</span>{" "}
          <a href={SITE.appturnity} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
            Let&apos;s talk →
          </a>
        </div>
      </div>
    </footer>
  );
}
