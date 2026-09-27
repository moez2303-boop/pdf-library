import { useCallback, useRef, useState } from "react";
import { GENRE_OPTIONS, LANGUAGE_OPTIONS } from "../discover/types";
import type { DiscoverResult } from "../discover/types";
import DiscoverResultCard from "./DiscoverResultCard";

interface DiscoverProps {
  onImportPdf: (url: string, title: string, author: string) => Promise<boolean>;
}

type SourceState = "idle" | "loading" | "done" | "error";

export default function Discover({ onImportPdf }: DiscoverProps) {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("");
  const [genre, setGenre] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [gutenbergState, setGutenbergState] = useState<SourceState>("idle");
  const [archiveState, setArchiveState] = useState<SourceState>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async () => {
    if (!text.trim() && !language && !genre) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setHasSearched(true);
    setResults([]);
    setGutenbergState("loading");
    setArchiveState("loading");

    const query = { text, language, genre };

    const [{ searchGutenberg }, { searchArchive }] = await Promise.all([
      import("../discover/gutenberg"),
      import("../discover/archive"),
    ]);

    searchGutenberg(query, controller.signal)
      .then((r) => {
        if (controller.signal.aborted) return;
        setResults((prev) => [...prev, ...r]);
        setGutenbergState("done");
      })
      .catch(() => {
        if (!controller.signal.aborted) setGutenbergState("error");
      });

    searchArchive(query, controller.signal)
      .then((r) => {
        if (controller.signal.aborted) return;
        setResults((prev) => [...prev, ...r]);
        setArchiveState("done");
      })
      .catch(() => {
        if (!controller.signal.aborted) setArchiveState("error");
      });
  }, [text, language, genre]);

  const isLoading = gutenbergState === "loading" || archiveState === "loading";
  const bothFailed = gutenbergState === "error" && archiveState === "error";

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-lg font-bold text-ink">Discover free ebooks</h2>
        <p className="text-sm text-ink/60 mt-1">
          Search public-domain books from Project Gutenberg and the Internet Archive —
          real, legal PDF and EPUB links you can read online or add straight to your shelf.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="flex flex-wrap gap-3 mb-6"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by title or author, e.g. Sun Tzu"
          className="flex-1 min-w-[220px] rounded-full border border-wood-dark/20 bg-white/70 py-2 px-4
            text-sm text-ink placeholder:text-ink/40 outline-none focus:ring-2 focus:ring-accent/40"
        />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-full border border-wood-dark/20 bg-white/70 py-2 px-3 text-sm text-ink
            outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="rounded-full border border-wood-dark/20 bg-white/70 py-2 px-3 text-sm text-ink
            outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer"
        >
          <option value="">Any genre</option>
          {GENRE_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isLoading}
          className="cursor-pointer rounded-full bg-wood-dark hover:bg-accent transition-colors
            text-paper text-sm font-medium px-5 py-2 disabled:opacity-60 disabled:cursor-wait"
        >
          {isLoading ? "Searching…" : "Search"}
        </button>
      </form>

      {!hasSearched && (
        <p className="text-sm text-ink/50 py-12 text-center">
          Type an author or title, or pick a language and genre, then hit search.
        </p>
      )}

      {hasSearched && (
        <>
          {isLoading && results.length === 0 && (
            <div className="flex items-center gap-3 text-ink/60 text-sm py-8 justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-wood-dark/30 border-t-wood-dark animate-spin" />
              Searching Project Gutenberg and the Internet Archive…
            </div>
          )}

          {bothFailed && (
            <p className="text-sm text-red-700 py-8 text-center">
              Couldn't reach either source right now. Check your connection and try again.
            </p>
          )}

          {!isLoading && !bothFailed && results.length === 0 && (
            <p className="text-sm text-ink/50 py-12 text-center">
              No matches found. Try a different spelling, or clear a filter.
            </p>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.map((r) => (
                <DiscoverResultCard key={r.id} result={r} onImportPdf={onImportPdf} />
              ))}
            </div>
          )}

          {!isLoading && archiveState === "error" && gutenbergState === "done" && (
            <p className="text-xs text-ink/40 mt-4 text-center">
              Internet Archive results couldn't be loaded this time; showing Project Gutenberg only.
            </p>
          )}
          {!isLoading && gutenbergState === "error" && archiveState === "done" && (
            <p className="text-xs text-ink/40 mt-4 text-center">
              Project Gutenberg results couldn't be loaded this time; showing Internet Archive only.
            </p>
          )}
        </>
      )}
    </div>
  );
}
