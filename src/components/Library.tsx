import { useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { BookWithCover } from "../types";
import BookCard from "./BookCard";
import Discover from "./Discover";
import EmptyState from "./EmptyState";
import Header, { type SortMode, type View } from "./Header";

interface LibraryProps {
  books: BookWithCover[];
  isImporting: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  view: View;
  onViewChange: (view: View) => void;
  onImportPdfUrl: (url: string, title: string, author: string) => Promise<boolean>;
}

export default function Library({
  books,
  isImporting,
  onFilesSelected,
  onOpen,
  onDelete,
  view,
  onViewChange,
  onImportPdfUrl,
}: LibraryProps) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = books;
    if (q) {
      result = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q),
      );
    }
    const sorted = [...result];
    switch (sortMode) {
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "author":
        sorted.sort((a, b) => a.author.localeCompare(b.author));
        break;
      case "progress":
        sorted.sort(
          (a, b) =>
            b.currentPage / Math.max(1, b.numPages) -
            a.currentPage / Math.max(1, a.numPages),
        );
        break;
      default:
        sorted.sort((a, b) => b.addedAt - a.addedAt);
    }
    return sorted;
  }, [books, query, sortMode]);

  function handlePick() {
    fileInputRef.current?.click();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      onFilesSelected(e.dataTransfer.files);
    }
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    dragCounter.current += 1;
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  }

  return (
    <div
      className="min-h-full relative"
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
    >
      <Header
        view={view}
        onViewChange={onViewChange}
        count={books.length}
        query={query}
        onQueryChange={setQuery}
        sortMode={sortMode}
        onSortChange={setSortMode}
        onPick={handlePick}
        isImporting={isImporting}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />

      {view === "discover" ? (
        <Discover onImportPdf={onImportPdfUrl} />
      ) : (
        <main className="mx-auto max-w-7xl px-5 sm:px-8 py-8">
          {books.length === 0 ? (
            <EmptyState onPick={handlePick} />
          ) : visibleBooks.length === 0 ? (
            <p className="text-center text-sm text-ink/50 py-16">
              No books match "{query}".
            </p>
          ) : (
            <div className="shelf-grid">
              {visibleBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onOpen={onOpen}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {dragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-wood-dark/70 backdrop-blur-sm pointer-events-none animate-fade-in">
          <div className="rounded-2xl border-2 border-dashed border-paper/80 px-12 py-10 text-center">
            <p className="font-serif text-2xl font-semibold text-paper">
              Drop your PDF to add it
            </p>
            <p className="text-sm text-paper/70 mt-1">
              It'll appear on your shelf instantly
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
