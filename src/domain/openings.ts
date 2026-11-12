/** Opening names by position (`epd`), built from lichess-org/chess-openings by `scripts/build-openings.ts`. */
export type Book = Record<string, string>;

/** A position without its move counters: the same one reached by another move order. */
export const epd = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

export const inBook = (book: Book, fen: string) => Object.hasOwn(book, epd(fen));

/** The name of the last position of the game that is in the book. */
export function openingName(book: Book, fens: string[]): string | undefined {
  return fens.map((fen) => book[epd(fen)]).findLast((name) => name !== undefined);
}

/** ~3,500 openings: loaded on demand, in its own chunk. */
export const loadBook = async (): Promise<Book> => (await import('../data/openings.json')).default;
