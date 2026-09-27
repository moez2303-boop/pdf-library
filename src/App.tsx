import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "./components/Header";
import Library from "./components/Library";
import Reader from "./components/Reader";
import {
  deleteBook as dbDeleteBook,
  getAllBooks,
  getCoverBlob,
  saveBook,
  updateBook,
} from "./db";
import type { Book, BookWithCover } from "./types";

function makeId(): string {
  return crypto.randomUUID();
}

export default function App() {
  const [books, setBooks] = useState<BookWithCover[]>([]);
  const [ready, setReady] = useState(false);
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [view, setView] = useState<View>("library");

  const progressTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getAllBooks();
      const withCovers = await Promise.all(
        stored.map(async (book): Promise<BookWithCover> => {
          const coverBlob = await getCoverBlob(book.id);
          return {
            ...book,
            coverUrl: coverBlob ? URL.createObjectURL(coverBlob) : null,
          };
        }),
      );
      if (!cancelled) {
        setBooks(withCovers);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      books.forEach((b) => b.coverUrl && URL.revokeObjectURL(b.coverUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importPdfFile = useCallback(
    async (file: File, overrides?: { title?: string; author?: string }) => {
      const { colorForId, parsePdfFile } = await import("./pdf");
      const arrayBuffer = await file.arrayBuffer();
      const parsed = await parsePdfFile(file, arrayBuffer);
      const id = makeId();
      const book: Book = {
        id,
        title: overrides?.title || parsed.title,
        author: overrides?.author || parsed.author,
        numPages: parsed.numPages,
        currentPage: 1,
        addedAt: Date.now(),
        lastOpenedAt: null,
        fileSize: file.size,
        coverColor: colorForId(id),
        fileName: file.name,
      };
      await saveBook(book, new Blob([arrayBuffer], { type: "application/pdf" }), parsed.coverBlob);
      const coverUrl = parsed.coverBlob ? URL.createObjectURL(parsed.coverBlob) : null;
      setBooks((prev) => [{ ...book, coverUrl }, ...prev]);
    },
    [],
  );

  const handleFilesSelected = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (files.length === 0) {
        setImportError("Please choose a PDF file.");
        return;
      }
      setIsImporting(true);
      setImportError(null);
      for (const file of files) {
        try {
          await importPdfFile(file);
        } catch (err) {
          setImportError(
            `Couldn't add "${file.name}": ${
              err instanceof Error ? err.message : "unknown error"
            }`,
          );
        }
      }
      setIsImporting(false);
    },
    [importPdfFile],
  );

  const handleImportPdfUrl = useCallback(
    async (url: string, title: string, author: string): Promise<boolean> => {
      setIsImporting(true);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const fileName = `${title.slice(0, 60).replace(/[\\/:*?"<>|]+/g, "_") || "book"}.pdf`;
        const file = new File([blob], fileName, { type: "application/pdf" });
        await importPdfFile(file, { title, author });
        return true;
      } catch {
        return false;
      } finally {
        setIsImporting(false);
      }
    },
    [importPdfFile],
  );

  const handleOpen = useCallback((id: string) => {
    setOpenBookId(id);
    setBooks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, lastOpenedAt: Date.now() } : b,
      ),
    );
  }, []);

  const handleClose = useCallback(() => {
    setOpenBookId(null);
  }, []);

  const handleProgress = useCallback((id: string, currentPage: number) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, currentPage } : b)),
    );

    const timers = progressTimers.current;
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    timers.set(
      id,
      setTimeout(() => {
        setBooks((prev) => {
          const book = prev.find((b) => b.id === id);
          if (book) {
            const { coverUrl, ...rest } = book;
            void coverUrl;
            void updateBook(rest as Book);
          }
          return prev;
        });
        timers.delete(id);
      }, 500),
    );
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const book = books.find((b) => b.id === id);
      await dbDeleteBook(id);
      if (book?.coverUrl) URL.revokeObjectURL(book.coverUrl);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      if (openBookId === id) setOpenBookId(null);
    },
    [books, openBookId],
  );

  const openBook = openBookId ? books.find((b) => b.id === openBookId) : null;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="h-8 w-8 rounded-full border-2 border-wood-dark/30 border-t-wood-dark animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Library
        books={books}
        isImporting={isImporting}
        onFilesSelected={handleFilesSelected}
        onOpen={handleOpen}
        onDelete={handleDelete}
        view={view}
        onViewChange={setView}
        onImportPdfUrl={handleImportPdfUrl}
      />

      {openBook && (
        <Reader book={openBook} onClose={handleClose} onProgress={handleProgress} />
      )}

      {importError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-red-800 text-white text-sm px-4 py-2.5 shadow-lg animate-fade-in">
          {importError}
          <button
            type="button"
            onClick={() => setImportError(null)}
            className="ml-3 cursor-pointer underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
