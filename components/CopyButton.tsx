"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="focus-ring inline-flex items-center gap-1 rounded-md border border-edge-strong bg-surface px-2 py-1 text-[11px] font-semibold text-mute transition hover:border-accent hover:text-accent"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current text-good" aria-hidden>
            <path d="M13.5 3.5 6 11 2.5 7.5 1 9l5 5 9-9z" />
          </svg>
          <span className="text-good">Copied</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current" aria-hidden>
            <path d="M10 1H4a2 2 0 0 0-2 2v7h1.5V3a.5.5 0 0 1 .5-.5h6V1Zm2 3H7a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
