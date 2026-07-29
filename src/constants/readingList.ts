import { coverFromISBN, type ShowcaseBook } from "../components/BookShowcase";

/* Reading list for the 3D shelf.
   ─────────────────────────────────────────────────────────────────────────────
   To add a book: append an entry, set `isbn` to an edition that Open Library
   actually has a cover for (check
   https://covers.openlibrary.org/b/isbn/<ISBN>-L.jpg?default=false — a 404 means
   no cover, and the shelf falls back to the procedural placeholder painter).

   The cloth colors below are the only per-item styling: `edge` is the board
   trim, `backBg`/`backInk` the back cover, `spineBg`/`spineInk`/`spineFont` the
   spine. All of them sit in the site's gold-on-near-black palette. */

const goodreads = (q: string) =>
  `https://www.goodreads.com/search?q=${encodeURIComponent(q)}`;

export const READING_LIST: ShowcaseBook[] = [
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    status: "Finished",
    desc: "Picked it up for the systems-over-goals argument and it stuck. The part that changed how I work is that you don't rise to the level of your goals, you fall to the level of your systems — so I stopped setting targets and started designing the small daily loop instead.",
    trackUrl: goodreads("Atomic Habits James Clear"),
    isbn: "9780735211292",
    coverURL: coverFromISBN("9780735211292"),
    edge: "#1c1a16",
    backBg: "#17150f",
    backInk: "240,237,232",
    spineBg: "#c9a84c",
    spineInk: "#17140f",
    spineFont: '500 34px "Jost", system-ui, sans-serif',
  },
  {
    id: "psychology-of-money",
    title: "The Psychology of Money",
    author: "Morgan Housel",
    status: "Finished",
    desc: "Read it expecting a finance book and got a behaviour book. The short-essay format makes it easy to put down and hard to forget; the chapter on how much of a good outcome is just luck and timing is the one I keep coming back to.",
    trackUrl: goodreads("The Psychology of Money Morgan Housel"),
    isbn: "9780857197689",
    coverURL: coverFromISBN("9780857197689"),
    edge: "#23201a",
    backBg: "#1d1a13",
    backInk: "240,237,232",
    spineBg: "#2a251b",
    spineInk: "#c9a84c",
    spineFont: '500 34px "Jost", system-ui, sans-serif',
  },
  {
    id: "autobiography-of-a-yogi",
    title: "Autobiography of a Yogi",
    author: "Paramahansa Yogananda",
    status: "Reading",
    desc: "Slower reading than the rest of this shelf, and deliberately so — a chapter at a time rather than start to finish. Reading it for the perspective more than the narrative.",
    trackUrl: goodreads("Autobiography of a Yogi Paramahansa Yogananda"),
    isbn: "9780876120798",
    coverURL: coverFromISBN("9780876120798"),
    edge: "#2a2118",
    backBg: "#241c12",
    backInk: "240,225,190",
    spineBg: "#8a6f2a",
    spineInk: "#f5eeda",
    spineFont: '500 34px "Jost", system-ui, sans-serif',
  },
  {
    id: "the-5am-club",
    title: "The 5 AM Club",
    author: "Robin Sharma",
    status: "Reading",
    desc: "Currently in progress. The fable framing takes some getting used to, but the underlying case for owning the first hour of the day is worth the read — testing whether it survives contact with an actual schedule.",
    trackUrl: goodreads("The 5 AM Club Robin Sharma"),
    isbn: "9781443456623",
    coverURL: coverFromISBN("9781443456623"),
    edge: "#191713",
    backBg: "#14120e",
    backInk: "240,237,232",
    spineBg: "#f0c060",
    spineInk: "#17140f",
    spineFont: '500 34px "Jost", system-ui, sans-serif',
  },
];
