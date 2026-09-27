export type SortMode = "recent" | "title" | "author" | "progress";
export type View = "library" | "discover";

interface HeaderProps {
  view: View;
  onViewChange: (view: View) => void;
  count: number;
  query: string;
  onQueryChange: (q: string) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onPick: () => void;
  isImporting: boolean;
}

export default function Header({
  view,
  onViewChange,
  count,
  query,
  onQueryChange,
  sortMode,
  onSortChange,
  onPick,
  isImporting,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-wood-dark/15 bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5 mr-2">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            className="text-wood-dark shrink-0"
          >
            <path
              d="M4 4.5C4 3.67 4.67 3 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z"
              fill="currentColor"
              opacity="0.85"
            />
            <path
              d="M12 3h6.5c.83 0 1.5.67 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5H12V3Z"
              fill="currentColor"
            />
          </svg>
          <h1 className="font-serif text-lg font-bold tracking-tight text-ink">
            Bookshelf
          </h1>
          {view === "library" && count > 0 && (
            <span className="text-xs text-ink/50 mt-0.5">
              {count} {count === 1 ? "book" : "books"}
            </span>
          )}
        </div>

        <nav className="flex items-center gap-1 rounded-full bg-wood-dark/10 p-1">
          <button
            type="button"
            onClick={() => onViewChange("library")}
            className={`cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              view === "library" ? "bg-white shadow-sm text-ink" : "text-ink/60 hover:text-ink"
            }`}
          >
            My Library
          </button>
          <button
            type="button"
            onClick={() => onViewChange("discover")}
            className={`cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              view === "discover" ? "bg-white shadow-sm text-ink" : "text-ink/60 hover:text-ink"
            }`}
          >
            Discover
          </button>
        </nav>

        <div className="flex-1 min-w-[160px] flex items-center gap-3 justify-end">
          {view === "library" && count > 0 && (
            <>
              <div className="relative flex-1 max-w-xs">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Search title or author"
                  className="w-full rounded-full border border-wood-dark/20 bg-white/70 py-1.5 pl-8 pr-3
                    text-sm text-ink placeholder:text-ink/40 outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <select
                value={sortMode}
                onChange={(e) => onSortChange(e.target.value as SortMode)}
                className="hidden sm:block rounded-full border border-wood-dark/20 bg-white/70 py-1.5 px-3
                  text-sm text-ink outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer"
              >
                <option value="recent">Recently added</option>
                <option value="title">Title</option>
                <option value="author">Author</option>
                <option value="progress">Progress</option>
              </select>
            </>
          )}

          <button
            type="button"
            onClick={onPick}
            disabled={isImporting}
            className="cursor-pointer rounded-full bg-wood-dark hover:bg-accent transition-colors
              text-paper text-sm font-medium px-4 py-1.5 shadow-sm disabled:opacity-60 disabled:cursor-wait
              flex items-center gap-1.5 whitespace-nowrap"
          >
            {isImporting ? (
              "Adding…"
            ) : (
              <>
                <span className="text-base leading-none">+</span> Add book
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
