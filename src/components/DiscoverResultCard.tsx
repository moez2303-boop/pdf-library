import { useState } from "react";
import type { DiscoverLink, DiscoverResult } from "../discover/types";

interface DiscoverResultCardProps {
  result: DiscoverResult;
  onImportPdf: (url: string, title: string, author: string) => Promise<boolean>;
}

export default function DiscoverResultCard({ result, onImportPdf }: DiscoverResultCardProps) {
  const [importState, setImportState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const pdfLink = result.links.find((l) => l.isPdf);

  async function handleImport(link: DiscoverLink) {
    setImportState("loading");
    const ok = await onImportPdf(link.url, result.title, result.authors.join(", "));
    if (ok) {
      setImportState("done");
    } else {
      setImportState("error");
      window.open(link.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="flex gap-3 rounded-lg border border-wood-dark/15 bg-white/50 p-3 animate-fade-in">
      <div
        className="h-28 w-20 shrink-0 rounded-sm overflow-hidden shadow ring-1 ring-black/10 bg-wood-light flex items-center justify-center"
        style={{ background: result.coverUrl ? undefined : "var(--color-wood-light)" }}
      >
        {result.coverUrl ? (
          <img
            src={result.coverUrl}
            alt={result.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-white/70 text-[10px] px-1 text-center">{result.title}</span>
        )}
      </div>

      <div className="min-w-0 flex-1 flex flex-col">
        <p className="font-serif text-sm font-semibold leading-tight text-ink line-clamp-2">
          {result.title}
        </p>
        <p className="text-xs text-ink/60 mt-0.5 line-clamp-1">{result.authors.join(", ")}</p>
        <p className="text-[10px] text-ink/40 mt-0.5">
          {result.source}
          {result.language ? ` · ${result.language}` : ""}
        </p>

        {result.subjects.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {result.subjects.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-[9px] uppercase tracking-wide text-wood-dark/70 bg-wood-dark/10 rounded-full px-1.5 py-0.5"
              >
                {s.length > 24 ? `${s.slice(0, 24)}…` : s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
          {pdfLink && (
            <button
              type="button"
              onClick={() => handleImport(pdfLink)}
              disabled={importState === "loading" || importState === "done"}
              className="cursor-pointer rounded-full bg-wood-dark hover:bg-accent transition-colors
                text-paper text-[11px] font-medium px-3 py-1 disabled:cursor-default disabled:opacity-70"
            >
              {importState === "loading"
                ? "Adding…"
                : importState === "done"
                  ? "Added ✓"
                  : "Add to library"}
            </button>
          )}
          {result.links.map((link) => (
            <a
              key={link.mimeType}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-wood-dark/80 hover:text-accent underline underline-offset-2"
            >
              {link.label}
            </a>
          ))}
          <a
            href={result.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-ink/40 hover:text-ink/70 ml-auto"
          >
            View source ↗
          </a>
        </div>
        {importState === "error" && (
          <p className="text-[10px] text-red-700 mt-1">
            Couldn't fetch it directly — opened the file in a new tab instead.
          </p>
        )}
      </div>
    </div>
  );
}
