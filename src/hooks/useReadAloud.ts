import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

export type ReadAloudStatus =
  | "unsupported"
  | "idle"
  | "loading"
  | "speaking"
  | "paused"
  | "no-text"
  | "error";

interface UseReadAloudOptions {
  pdf: PDFDocumentProxy | null;
  pageNum: number;
  numPages: number;
  onAutoAdvance: () => void;
}

interface UseReadAloudResult {
  supported: boolean;
  status: ReadAloudStatus;
  play: () => void;
  pause: () => void;
  stop: () => void;
  voices: SpeechSynthesisVoice[];
  voiceURI: string;
  setVoiceURI: (uri: string) => void;
  rate: number;
  setRate: (rate: number) => void;
  autoAdvance: boolean;
  setAutoAdvance: (value: boolean) => void;
  chunkProgress: { index: number; total: number };
}

// Splits page text into short sentence-ish chunks and speaks them as a queue
// of utterances (rather than one long one) to sidestep a long-standing Chrome
// bug where a single very long SpeechSynthesisUtterance can silently stop
// partway through. Chunking also makes pause/resume behave more predictably.
function chunkText(text: string, maxLen = 220): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && (current + sentence).length > maxLen) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function useReadAloud({
  pdf,
  pageNum,
  numPages,
  onAutoAdvance,
}: UseReadAloudOptions): UseReadAloudResult {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [status, setStatus] = useState<ReadAloudStatus>(
    supported ? "idle" : "unsupported",
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [chunkProgress, setChunkProgress] = useState({ index: 0, total: 0 });

  const textCache = useRef<Map<number, string>>(new Map());
  const chunksRef = useRef<string[]>([]);
  const autoAdvanceRef = useRef(autoAdvance);
  const autoAdvancingRef = useRef(false);
  const keepAliveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rateRef = useRef(rate);
  const voiceURIRef = useRef(voiceURI);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);
  useEffect(() => {
    voiceURIRef.current = voiceURI;
  }, [voiceURI]);
  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);

  useEffect(() => {
    if (!supported) return;
    function loadVoices() {
      const list = window.speechSynthesis.getVoices();
      if (list.length) setVoices(list);
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [supported]);

  useEffect(() => {
    textCache.current.clear();
  }, [pdf]);

  const clearKeepAlive = useCallback(() => {
    if (keepAliveTimer.current) {
      clearInterval(keepAliveTimer.current);
      keepAliveTimer.current = null;
    }
  }, []);

  const speakChunk = useCallback(
    (index: number) => {
      const chunks = chunksRef.current;
      if (index >= chunks.length) {
        clearKeepAlive();
        if (autoAdvanceRef.current && pageNum < numPages) {
          autoAdvancingRef.current = true;
          onAutoAdvance();
        } else {
          setStatus("idle");
        }
        return;
      }
      setChunkProgress({ index, total: chunks.length });
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.rate = rateRef.current;
      const voice = voicesRef.current.find(
        (v) => v.voiceURI === voiceURIRef.current,
      );
      if (voice) utterance.voice = voice;
      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") {
          clearKeepAlive();
          setStatus("error");
        }
      };
      window.speechSynthesis.speak(utterance);
    },
    [clearKeepAlive, onAutoAdvance, pageNum, numPages],
  );

  const play = useCallback(async () => {
    if (!supported || !pdf) return;
    if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("speaking");
      return;
    }
    setStatus("loading");
    try {
      let text = textCache.current.get(pageNum);
      if (text === undefined) {
        const { getPageText } = await import("../pdf");
        text = await getPageText(pdf, pageNum);
        textCache.current.set(pageNum, text);
      }
      if (!text) {
        setStatus("no-text");
        return;
      }
      chunksRef.current = chunkText(text);
      window.speechSynthesis.cancel();
      setStatus("speaking");
      keepAliveTimer.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
      speakChunk(0);
    } catch {
      setStatus("error");
    }
  }, [supported, pdf, status, pageNum, speakChunk]);

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    clearKeepAlive();
    window.speechSynthesis.cancel();
    setStatus("idle");
  }, [supported, clearKeepAlive]);

  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);

  useEffect(() => {
    if (autoAdvancingRef.current) {
      autoAdvancingRef.current = false;
      playRef.current();
      return;
    }
    clearKeepAlive();
    if (supported) window.speechSynthesis.cancel();
    setStatus(supported ? "idle" : "unsupported");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum]);

  useEffect(() => {
    return () => {
      clearKeepAlive();
      if (supported) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    supported,
    status,
    play,
    pause,
    stop,
    voices,
    voiceURI,
    setVoiceURI,
    rate,
    setRate,
    autoAdvance,
    setAutoAdvance,
    chunkProgress,
  };
}
