export interface DiscoverLink {
  label: string;
  url: string;
  mimeType: string;
  isPdf: boolean;
}

export type DiscoverSource = "Project Gutenberg" | "Internet Archive";

export interface DiscoverResult {
  id: string;
  source: DiscoverSource;
  sourceUrl: string;
  title: string;
  authors: string[];
  language: string;
  subjects: string[];
  coverUrl: string | null;
  links: DiscoverLink[];
}

export interface DiscoverQuery {
  text: string;
  language: string;
  genre: string;
}

export interface LanguageOption {
  code: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "", label: "Any language" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "ru", label: "Russian" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "el", label: "Greek" },
  { code: "la", label: "Latin" },
  { code: "fi", label: "Finnish" },
  { code: "hu", label: "Hungarian" },
  { code: "sv", label: "Swedish" },
];

export const GENRE_OPTIONS: string[] = [
  "Fiction",
  "Adventure",
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Romance",
  "Drama",
  "Poetry",
  "Philosophy",
  "Religion",
  "History",
  "Biography",
  "War",
  "Politics",
  "Science",
  "Children's Literature",
  "Humor",
];
