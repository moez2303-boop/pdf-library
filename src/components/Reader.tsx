import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { getPdfBlob } from "../db";
import type { Book } from "../types";

interface ReaderProps {
  book: Book;
  onClose: () => void;
  onProgress: (id: string, currentPage: number) => void;
}

export default function Reader({ book, onClose, onProgress }: ReaderProps) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(
    Math.min(Math.max(1, book.currentPage || 1), book.numPages || 1),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState(String(pageNum));
  const [controlsVisible, setControlsVisible] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [blob, { loadPdfFromArrayBuffer }] = await Promise.all([
          getPdfBlob(book.id),
          import("../pdf"),
        ]);
        if (!blob) throw new Error("This book's file could not be found.");
        const buf = await blob.arrayBuffer();
        const doc = await loadPdfFromArrayBuffer(buf);
        if (!cancelled) {
          setPdf(doc);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to open PDF");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book.id]);

  const renderPage = useCallback(
    async (doc: PDFDocumentProxy, num: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const page = await doc.getPage(num);
      const baseViewport = page.getViewport({ scale: 1 });
      const availWidth = container.clientWidth - 32;
      const availHeight = container.clientHeight - 32;
      const scale = Math.min(
        availWidth / baseViewport.width,
        availHeight / baseViewport.height,
      );
      const viewport = page.getViewport({
        scale: Math.max(scale, 0.1) * (window.devicePixelRatio || 1),
      });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
      canvas.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") throw err;
      }
    },
    [],
  );

  useEffect(() => {
    if (!pdf) return;
    renderPage(pdf, pageNum).catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to render page"),
    );
    setPageInput(String(pageNum));
    onProgress(book.id, pageNum);
  }, [pdf, pageNum, renderPage, book.id, onProgress]);

  useEffect(() => {
    if (!pdf) return;
    const onResize = () => renderPage(pdf, pageNum).catch(() => {});
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pdf, pageNum, renderPage]);

  const goTo = useCallback(
    (n: number) => {
      if (!book.numPages) return;
      const clamped = Math.min(Math.max(1, n), book.numPages);
      setPageNum(clamped);
    },
    [book.numPages],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goTo(pageNum + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(pageNum - 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageNum, goTo, onClose]);

  function bumpControls() {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2600);
  }

  useEffect(() => {
    bumpControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress =
    book.numPages > 0 ? (pageNum / book.numPages) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-[#1c1712]"
      onMouseMove={bumpControls}
      onClick={bumpControls}
    >
      <div
        className={`shrink-0 flex items-center gap-3 px-4 py-3 bg-[#241d16]/95 border-b border-white/10
          transition-transform duration-300 ${controlsVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer flex items-center gap-1.5 text-paper/80 hover:text-paper text-sm font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Library
        </button>
        <div className="flex-1 min-w-0 text-center px-2">
          <p className="font-serif text-sm font-semibold text-paper truncate">
            {book.title}
          </p>
          <p className="text-[11px] text-paper/50 truncate">{book.author}</p>
        </div>
        <div className="w-20" />
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden"
      >
        {loading && (
          <div className="flex flex-col items-center gap-3 text-paper/70">
            <div className="h-8 w-8 rounded-full border-2 border-paper/30 border-t-paper animate-spin" />
            <p className="text-sm">Opening book…</p>
          </div>
        )}
        {error && !loading && (
          <div className="text-center px-6">
            <p className="text-paper/90 font-medium">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 cursor-pointer rounded-full bg-accent px-4 py-1.5 text-sm text-paper"
            >
              Back to library
            </button>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`shadow-2xl rounded-sm ${loading || error ? "hidden" : ""}`}
        />

        {!loading && !error && (
          <>
            <button
              type="button"
              aria-label="Previous page"
              onClick={(e) => {
                e.stopPropagation();
                goTo(pageNum - 1);
              }}
              disabled={pageNum <= 1}
              className="cursor-pointer absolute left-0 top-0 h-full w-1/4 flex items-center justify-start pl-2
                opacity-0 hover:opacity-100 disabled:opacity-0 disabled:cursor-default transition-opacity"
            >
              <span className="h-10 w-10 rounded-full bg-black/40 text-paper flex items-center justify-center">
                ‹
              </span>
            </button>
            <button
              type="button"
              aria-label="Next page"
              onClick={(e) => {
                e.stopPropagation();
                goTo(pageNum + 1);
              }}
              disabled={pageNum >= book.numPages}
              className="cursor-pointer absolute right-0 top-0 h-full w-1/4 flex items-center justify-end pr-2
                opacity-0 hover:opacity-100 disabled:opacity-0 disabled:cursor-default transition-opacity"
            >
              <span className="h-10 w-10 rounded-full bg-black/40 text-paper flex items-center justify-center">
                ›
              </span>
            </button>
          </>
        )}
      </div>

      <div
        className={`shrink-0 px-4 sm:px-8 py-3 bg-[#241d16]/95 border-t border-white/10 flex items-center gap-4
          transition-transform duration-300 ${controlsVisible ? "translate-y-0" : "translate-y-full"}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goTo(Number(pageInput) || 1);
          }}
          className="flex items-center gap-1.5 text-paper/70 text-xs shrink-0"
        >
          <input
            type="text"
            inputMode="numeric"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={() => goTo(Number(pageInput) || 1)}
            className="w-10 rounded bg-white/10 text-center py-1 text-paper outline-none focus:ring-1 focus:ring-accent"
          />
          <span>/ {book.numPages || "…"}</span>
        </form>

        <input
          type="range"
          min={1}
          max={Math.max(1, book.numPages)}
          value={pageNum}
          onChange={(e) => goTo(Number(e.target.value))}
          className="flex-1 accent-accent cursor-pointer"
        />
        <span className="text-paper/50 text-xs w-10 text-right shrink-0">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
