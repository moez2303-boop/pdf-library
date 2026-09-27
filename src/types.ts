export interface Book {
  id: string;
  title: string;
  author: string;
  numPages: number;
  currentPage: number;
  addedAt: number;
  lastOpenedAt: number | null;
  fileSize: number;
  coverColor: string;
  fileName: string;
}

export interface BookWithCover extends Book {
  coverUrl: string | null;
}
