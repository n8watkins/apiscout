"use client";

import { useMemo } from "react";

// Lightweight, dependency-free JSON syntax highlighter. Tokenizes a
// pretty-printed JSON string with a single regex and wraps each token in a
// span the CSS colors. Falls back to plain text for non-JSON bodies.
function highlight(json: string): string {
  const esc = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "tok-num";
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "tok-key" : "tok-str";
      } else if (/true|false/.test(match)) {
        cls = "tok-bool";
      } else if (/null/.test(match)) {
        cls = "tok-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export function JsonViewer({
  body,
  contentType,
}: {
  body: string;
  contentType?: string;
}) {
  const { html, pretty, isJson } = useMemo(() => {
    const looksJson =
      (contentType?.includes("json") ?? false) ||
      /^\s*[[{]/.test(body);
    if (looksJson) {
      try {
        const parsed = JSON.parse(body);
        const p = JSON.stringify(parsed, null, 2);
        return { html: highlight(p), pretty: p, isJson: true };
      } catch {
        // fall through to plain text
      }
    }
    const escaped = body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return { html: escaped, pretty: body, isJson: false };
  }, [body, contentType]);

  return (
    <pre
      className="scroll-thin max-h-[28rem] overflow-auto rounded-xl bg-[#fbfbfe] p-4 font-mono text-[12.5px] leading-relaxed text-ink"
      data-format={isJson ? "json" : "text"}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
