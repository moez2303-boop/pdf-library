import { useState } from "react";
import type { BookWithCover } from "../types";

interface BookCardProps {
  book: BookWithCover;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function BookCard({ book, onOpen, onDelete }: BookCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const hasStarted = book.lastOpenedAt !== null && book.currentPage > 1;
  const progress =
    hasStarted && book.numPages > 0
      ? Math.min(1, book.currentPage / book.numPages)
      : 0;

  return (
    <div className="group flex flex-col animate-fade-in">
      <button
        type="button"
        onClick={() => onOpen(book.id)}
        className="relative h-[210px] w-full rounded-sm overflow-hidden text-left cursor-pointer
          shadow-[3px_4px_10px_rgba(0,0,0,0.35)] transition-all duration-200
          group-hover:-translate-y-1.5 group-hover:shadow-[5px_10px_18px_rgba(0,0,0,0.4)]
          ring-1 ring-black/10"
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-full w-full object-cover object-top bg-white"
            draggable={false}
          />
        ) : (
          <div
            className="h-full w-full flex flex-col items-center justify-center p-3 text-center"
            style={{
              background: `linear-gradient(155deg, ${book.coverColor}, color-mix(in srgb, ${book.coverColor} 55%, black))`,
            }}
          >
            <span className="font-serif text-white/95 text-sm font-semibold leading-snug line-clamp-4">
              {book.title}
            </span>
            <span className="mt-2 h-px w-8 bg-white/40" />
            <span className="mt-2 text-[11px] text-white/70 line-clamp-1">
              {book.author}
            </span>
          </div>
        )}

        {/* page-edge effect */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-[3px] bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,0.15)_0px,rgba(255,255,255,0.5)_1px,rgba(0,0,0,0.1)_2px)]" />

        {progress > 0 && progress < 0.98 && (
          <div className="absolute bottom-0 left-0 h-[3px] w-full bg-black/20">
            <div
              className="h-full bg-accent"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}

        {progress >= 0.98 && (
          <div className="absolute top-1 right-1 rounded-full bg-emerald-700/90 text-white text-[9px] font-semibold px-1.5 py-0.5 shadow">
            READ
          </div>
        )}
      </button>

      <div className="mt-2 px-0.5">
        <p className="font-serif text-[13px] font-semibold leading-tight text-ink line-clamp-2">
          {book.title}
        </p>
        <p className="text-[11px] text-ink/60 mt-0.5 line-clamp-1">
          {book.author}
        </p>
      </div>

      <div className="mt-1 flex items-center gap-2 px-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onOpen(book.id)}
          className="text-[11px] text-wood-dark hover:text-accent font-medium cursor-pointer"
        >
          Read
        </button>
        <span className="text-ink/20">·</span>
        {confirmingDelete ? (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onDelete(book.id)}
              className="text-[11px] text-red-700 hover:text-red-800 font-medium cursor-pointer"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-[11px] text-ink/50 hover:text-ink/70 cursor-pointer"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-[11px] text-ink/50 hover:text-red-700 cursor-pointer"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
