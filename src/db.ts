import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Book } from "./types";

interface LibraryDB extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: { addedAt: number };
  };
  pdfs: {
    key: string;
    value: Blob;
  };
  covers: {
    key: string;
    value: Blob;
  };
}

let dbPromise: Promise<IDBPDatabase<LibraryDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LibraryDB>("pdf-library", 1, {
      upgrade(db) {
        const books = db.createObjectStore("books", { keyPath: "id" });
        books.createIndex("addedAt", "addedAt");
        db.createObjectStore("pdfs");
        db.createObjectStore("covers");
      },
    });
  }
  return dbPromise;
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB();
  return db.getAll("books");
}

export async function saveBook(
  book: Book,
  pdfBlob: Blob,
  coverBlob: Blob | null,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["books", "pdfs", "covers"], "readwrite");
  await Promise.all([
    tx.objectStore("books").put(book),
    tx.objectStore("pdfs").put(pdfBlob, book.id),
    coverBlob
      ? tx.objectStore("covers").put(coverBlob, book.id)
      : Promise.resolve(),
    tx.done,
  ]);
}

export async function updateBook(book: Book): Promise<void> {
  const db = await getDB();
  await db.put("books", book);
}

export async function getPdfBlob(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  return db.get("pdfs", id);
}

export async function getCoverBlob(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  return db.get("covers", id);
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["books", "pdfs", "covers"], "readwrite");
  await Promise.all([
    tx.objectStore("books").delete(id),
    tx.objectStore("pdfs").delete(id),
    tx.objectStore("covers").delete(id),
    tx.done,
  ]);
}
