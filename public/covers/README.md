# Book covers

Drop-in cover art for the reading shelf (`src/constants/readingList.ts`).

Files here are served from the site root, so `public/covers/foo.jpg` is
referenced as `/covers/foo.jpg` in a book's `coverURL`.

Use this only when Open Library has no cover for the edition you want. When
Open Library does have it, prefer `coverFromISBN(isbn)` — no file to maintain.

The loader tries `coverURL`, then `coverFallbackURL`, then falls back to the
procedural placeholder painter in `BookShowcase.tsx`. A missing file here is
therefore harmless: the book still renders, just with a different cover.

## Expected files

| File | Book | Status |
| --- | --- | --- |
| `autobiography-of-a-yogi.jpg` | Autobiography of a Yogi — the illustrated mandala edition, which is not on Open Library | **not committed yet** |

Portrait JPEG, roughly 2:3, ≥600px wide. It is painted onto a 1024×1536 cover
texture, so anything smaller will look soft.
