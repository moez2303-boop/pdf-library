import type { ReadAloudStatus } from "../hooks/useReadAloud";

const RATE_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

interface ReadAloudPanelProps {
  status: ReadAloudStatus;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  voices: SpeechSynthesisVoice[];
  voiceURI: string;
  onVoiceChange: (uri: string) => void;
  rate: number;
  onRateChange: (rate: number) => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (value: boolean) => void;
  chunkProgress: { index: number; total: number };
}

export default function ReadAloudPanel({
  status,
  onPlay,
  onPause,
  onStop,
  voices,
  voiceURI,
  onVoiceChange,
  rate,
  onRateChange,
  autoAdvance,
  onAutoAdvanceChange,
  chunkProgress,
}: ReadAloudPanelProps) {
  if (status === "unsupported") {
    return (
      <div className="shrink-0 px-4 sm:px-8 py-2.5 bg-[#241d16] border-b border-white/10 text-center">
        <p className="text-xs text-paper/50">
          Read-aloud isn't supported in this browser.
        </p>
      </div>
    );
  }

  const isPlaying = status === "speaking" || status === "loading";
  const progressPct =
    chunkProgress.total > 0
      ? ((chunkProgress.index + 1) / chunkProgress.total) * 100
      : 0;

  return (
    <div className="shrink-0 px-4 sm:px-8 py-3 bg-[#241d16] border-b border-white/10 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (status === "speaking") onPause();
            else onPlay();
          }}
          disabled={status === "loading"}
          aria-label={status === "speaking" ? "Pause reading" : "Read this page aloud"}
          className="cursor-pointer shrink-0 h-9 w-9 rounded-full bg-accent hover:brightness-110 transition
            flex items-center justify-center text-paper disabled:opacity-60 disabled:cursor-wait"
        >
          {status === "loading" ? (
            <span className="h-4 w-4 rounded-full border-2 border-paper/40 border-t-paper animate-spin" />
          ) : status === "speaking" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="4" width="5" height="16" rx="1" />
              <rect x="14" y="4" width="5" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4.5v15l13-7.5-13-7.5Z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={onStop}
          disabled={status === "idle" || status === "no-text"}
          aria-label="Stop reading"
          className="cursor-pointer shrink-0 h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 transition
            flex items-center justify-center text-paper/80 disabled:opacity-30 disabled:cursor-default"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="5" width="14" height="14" rx="1.5" />
          </svg>
        </button>

        <div className="flex-1 min-w-[100px] h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${isPlaying ? progressPct : 0}%` }}
          />
        </div>

        <select
          value={rate}
          onChange={(e) => onRateChange(Number(e.target.value))}
          className="shrink-0 rounded-full bg-white/10 text-paper/80 text-xs py-1 px-2 outline-none cursor-pointer"
        >
          {RATE_OPTIONS.map((r) => (
            <option key={r} value={r} className="text-ink">
              {r}×
            </option>
          ))}
        </select>

        {voices.length > 0 && (
          <select
            value={voiceURI}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="hidden sm:block shrink-0 max-w-[160px] rounded-full bg-white/10 text-paper/80 text-xs py-1 px-2 outline-none cursor-pointer"
          >
            <option value="" className="text-ink">
              Default voice
            </option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI} className="text-ink">
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        )}

        <label className="shrink-0 flex items-center gap-1.5 text-xs text-paper/60 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(e) => onAutoAdvanceChange(e.target.checked)}
            className="accent-accent cursor-pointer"
          />
          Continue to next page
        </label>
      </div>

      {status === "no-text" && (
        <p className="text-xs text-paper/50 mt-2">
          This page has no selectable text to read (it's likely a scanned image).
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-300 mt-2">
          Couldn't read this page aloud. Try again, or pick a different voice.
        </p>
      )}
    </div>
  );
}
