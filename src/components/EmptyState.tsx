interface EmptyStateProps {
  onPick: () => void;
}

export default function EmptyState({ onPick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6 animate-fade-in">
      <div className="relative mb-6">
        <div className="flex items-end gap-1">
          <div className="h-20 w-4 rounded-t-sm bg-wood shadow-md" />
          <div className="h-24 w-4 rounded-t-sm bg-accent shadow-md" />
          <div className="h-16 w-4 rounded-t-sm bg-emerald-800 shadow-md" />
          <div className="h-22 w-4 rounded-t-sm bg-wood-light shadow-md" />
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-wood-dark shadow-inner" />
      </div>
      <h2 className="font-serif text-xl font-semibold text-ink">
        Your library is empty
      </h2>
      <p className="mt-2 max-w-sm text-sm text-ink/60">
        Upload a PDF to add your first book. It'll show up right here on the
        shelf, cover and all.
      </p>
      <button
        type="button"
        onClick={onPick}
        className="mt-6 cursor-pointer rounded-md bg-wood-dark px-5 py-2.5 text-sm font-medium text-paper
          shadow-md hover:bg-accent transition-colors"
      >
        Add your first book
      </button>
    </div>
  );
}
