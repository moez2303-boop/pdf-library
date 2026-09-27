import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function loadPdfFromArrayBuffer(
  data: ArrayBuffer,
): Promise<PDFDocumentProxy> {
  return pdfjsLib.getDocument({ data }).promise;
}

function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export interface ParsedPdf {
  title: string;
  author: string;
  numPages: number;
  coverBlob: Blob | null;
}

export async function parsePdfFile(
  file: File,
  arrayBuffer: ArrayBuffer,
): Promise<ParsedPdf> {
  const pdf = await loadPdfFromArrayBuffer(arrayBuffer.slice(0));
  const meta = await pdf.getMetadata().catch(() => null);
  const info = (meta?.info ?? {}) as Record<string, unknown>;

  const title =
    (typeof info.Title === "string" && info.Title.trim()) ||
    titleFromFileName(file.name) ||
    "Untitled";
  const author =
    (typeof info.Author === "string" && info.Author.trim()) || "Unknown author";

  const coverBlob = await renderCoverThumbnail(pdf);

  return { title, author, numPages: pdf.numPages, coverBlob };
}

export async function renderCoverThumbnail(
  pdf: PDFDocumentProxy,
  targetWidth = 400,
): Promise<Blob | null> {
  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport }).promise;

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
    });
  } catch {
    return null;
  }
}

const SPINE_COLORS = [
  "#8a3b2e",
  "#2f5233",
  "#1f4e79",
  "#5b3a70",
  "#a9612f",
  "#3c3c3c",
  "#7a5c2e",
  "#264d4a",
  "#8c2f4f",
  "#3e5c76",
];

export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return SPINE_COLORS[hash % SPINE_COLORS.length];
}
