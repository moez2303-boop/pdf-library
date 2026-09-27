import { fetchWithTimeout } from "./fetchTimeout";
import type { DiscoverLink, DiscoverQuery, DiscoverResult } from "./types";

const GUTENDEX_BASE = "https://gutendex.com/books/";
const SEARCH_TIMEOUT_MS = 7000;

interface GutendexPerson {
  name: string;
  birth_year: number | null;
  death_year: number | null;
}

interface GutendexBook {
  id: number;
  title: string;
  authors: GutendexPerson[];
  translators: GutendexPerson[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  formats: Record<string, string>;
}

interface GutendexResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

const FORMAT_LABELS: { match: (mime: string) => boolean; label: string }[] = [
  { match: (m) => m === "application/pdf", label: "PDF" },
  { match: (m) => m === "application/epub+zip", label: "EPUB" },
  { match: (m) => m.includes("mobipocket"), label: "Kindle (MOBI)" },
  { match: (m) => m.startsWith("text/html"), label: "Read online (HTML)" },
  { match: (m) => m.startsWith("text/plain"), label: "Plain text" },
];

function linksFromFormats(formats: Record<string, string>): DiscoverLink[] {
  const links: DiscoverLink[] = [];
  for (const [mime, url] of Object.entries(formats)) {
    if (mime.startsWith("image/") || mime.includes("rdf") || mime.includes("octet-stream")) {
      continue;
    }
    const match = FORMAT_LABELS.find((f) => f.match(mime));
    if (!match) continue;
    links.push({ label: match.label, url, mimeType: mime, isPdf: mime === "application/pdf" });
  }
  return links.sort((a, b) => Number(b.isPdf) - Number(a.isPdf));
}

function coverFromFormats(formats: Record<string, string>): string | null {
  const jpeg = Object.entries(formats).find(([mime]) => mime.startsWith("image/"));
  return jpeg ? jpeg[1] : null;
}

export async function searchGutenberg(
  query: DiscoverQuery,
  signal?: AbortSignal,
): Promise<DiscoverResult[]> {
  const params = new URLSearchParams();
  if (query.text.trim()) params.set("search", query.text.trim());
  if (query.language) params.set("languages", query.language);
  if (query.genre) params.set("topic", query.genre);

  const res = await fetchWithTimeout(`${GUTENDEX_BASE}?${params.toString()}`, SEARCH_TIMEOUT_MS, signal);
  if (!res.ok) throw new Error(`Project Gutenberg lookup failed (${res.status})`);
  const data: GutendexResponse = await res.json();

  return data.results.map((book): DiscoverResult => {
    const authors = book.authors.length
      ? book.authors.map((a) => a.name)
      : book.translators.length
        ? book.translators.map((t) => `${t.name} (translator)`)
        : ["Unknown author"];

    return {
      id: `gutenberg-${book.id}`,
      source: "Project Gutenberg",
      sourceUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
      title: book.title,
      authors,
      language: book.languages.join(", ").toUpperCase(),
      subjects: [...book.subjects, ...book.bookshelves].slice(0, 4),
      coverUrl: coverFromFormats(book.formats),
      links: linksFromFormats(book.formats),
    };
  });
}
