# My Library

A Kindle-inspired personal library for PDF books. Upload PDFs and they land on
a warm, wooden bookshelf — with real cover thumbnails generated from each
book's first page, progress tracking, and a distraction-free reader.

Everything runs entirely in the browser: PDFs are parsed with
[pdf.js](https://mozilla.github.io/pdf.js/) and stored locally in
IndexedDB. Nothing is uploaded to a server.

## Features

- Drag-and-drop or click to upload one or more PDFs
- Automatic cover thumbnail, title, and author extraction from each PDF
- Kindle-style shelf grid with search and sort (recent / title / author / progress)
- Full-screen reader with page navigation, keyboard shortcuts, and a
  scrubbable progress bar
- Reading progress is remembered per book and persists across reloads
- All data stays on-device (IndexedDB) — no backend required

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL and upload a PDF to get started.

## Build

```bash
npm run build
```

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS v4
- pdf.js (`pdfjs-dist`) for parsing and rendering
- `idb` for IndexedDB storage
