import { fetchWithTimeout } from "./fetchTimeout";
import type { DiscoverQuery, DiscoverResult } from "./types";

const SEARCH_BASE = "https://archive.org/advancedsearch.php";
const METADATA_BASE = "https://archive.org/metadata/";
const MAX_RESULTS = 8;
const SEARCH_TIMEOUT_MS = 7000;
const METADATA_TIMEOUT_MS = 5000;

interface ArchiveDoc {
  identifier: string;
  title?: string;
  creator?: string | string[];
  language?: string | string[];
  subject?: string | string[];
}

interface ArchiveSearchResponse {
  response: {
    numFound: number;
    docs: ArchiveDoc[];
  };
}

interface ArchiveFile {
  name: string;
  format?: string;
}

interface ArchiveMetadataResponse {
  files: ArchiveFile[];
}

function asList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  el: "Greek",
  la: "Latin",
  fi: "Finnish",
  hu: "Hungarian",
  sv: "Swedish",
};

function buildQuery(query: DiscoverQuery): string {
  const parts = ["mediatype:texts", "access-restricted-item:false"];
  if (query.text.trim()) {
    // Deliberately metadata-only (title/creator), not `text:(...)` — that field
    // does a full-text scan of every scanned page's OCR output and is extremely
    // slow (tens of seconds) compared to the indexed metadata fields.
    const escaped = query.text.trim().replace(/"/g, '\\"');
    parts.push(`(title:("${escaped}") OR creator:("${escaped}"))`);
  }
  if (query.genre) parts.push(`subject:("${query.genre}")`);
  if (query.language) {
    const name = LANGUAGE_NAMES[query.language];
    if (name) parts.push(`language:("${name}")`);
  }
  return parts.join(" AND ");
}

async function findPdfFile(identifier: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`${METADATA_BASE}${identifier}`, METADATA_TIMEOUT_MS, signal);
    if (!res.ok) return null;
    const data: ArchiveMetadataResponse = await res.json();
    const pdfFile = data.files?.find(
      (f) => f.name.toLowerCase().endsWith(".pdf") && !f.name.toLowerCase().includes("_text.pdf"),
    );
    if (!pdfFile) return null;
    return `https://archive.org/download/${identifier}/${encodeURIComponent(pdfFile.name)}`;
  } catch {
    return null;
  }
}

export async function searchArchive(
  query: DiscoverQuery,
  signal?: AbortSignal,
): Promise<DiscoverResult[]> {
  const params = new URLSearchParams({
    q: buildQuery(query),
    output: "json",
    rows: String(MAX_RESULTS),
    page: "1",
  });
  params.append("fl[]", "identifier");
  params.append("fl[]", "title");
  params.append("fl[]", "creator");
  params.append("fl[]", "language");
  params.append("fl[]", "subject");

  const res = await fetchWithTimeout(`${SEARCH_BASE}?${params.toString()}`, SEARCH_TIMEOUT_MS, signal);
  if (!res.ok) throw new Error(`Internet Archive lookup failed (${res.status})`);
  const data: ArchiveSearchResponse = await res.json();

  const withPdfs = await Promise.all(
    data.response.docs.map(async (doc): Promise<DiscoverResult | null> => {
      const pdfUrl = await findPdfFile(doc.identifier, signal);
      if (!pdfUrl) return null;
      return {
        id: `archive-${doc.identifier}`,
        source: "Internet Archive",
        sourceUrl: `https://archive.org/details/${doc.identifier}`,
        title: doc.title || doc.identifier,
        authors: asList(doc.creator).length ? asList(doc.creator) : ["Unknown author"],
        language: asList(doc.language).join(", ") || "Unknown",
        subjects: asList(doc.subject).slice(0, 4),
        coverUrl: `https://archive.org/services/img/${doc.identifier}`,
        links: [{ label: "PDF", url: pdfUrl, mimeType: "application/pdf", isPdf: true }],
      };
    }),
  );

  return withPdfs.filter((r): r is DiscoverResult => r !== null);
}
