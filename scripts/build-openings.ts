// Builds src/data/openings.json from lichess-org/chess-openings (CC0). Run: npm run build:openings
// To upgrade: change COMMIT and run again; the diff of the JSON is the review.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Chess } from 'chessops/chess';
import { makeFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { type Book, epd } from '../src/domain/openings.ts';

const COMMIT = '3ba6b20d31b2e6125cb0e6a2e792f400717d9d39';
const BASE = `https://raw.githubusercontent.com/lichess-org/chess-openings/${COMMIT}`;
const OUT = join(import.meta.dirname, '..', 'src', 'data', 'openings.json');

/** `eco<TAB>name<TAB>pgn` rows (after a header line) → name by final position. The first name of a position wins. */
export function toBook(tsv: string): Book {
  const book: Book = {};
  for (const row of tsv.split('\n').slice(1)) {
    const [, name, pgn] = row.trim().split('\t');
    if (!name || !pgn) continue;
    // Not `parseGamePgn`: Node runs this file by stripping types, and `pgn.ts` has syntax that needs a real compiler.
    const pos = Chess.default();
    for (const san of pgn.split(' ').filter((token) => !token.endsWith('.'))) {
      const move = parseSan(pos, san);
      if (!move) throw new Error(`Illegal move ${san} in "${pgn}"`);
      pos.play(move);
    }
    book[epd(makeFen(pos.toSetup()))] ??= name;
  }
  return book;
}

if (import.meta.main) {
  const book: Book = {};
  for (const file of ['a', 'b', 'c', 'd', 'e']) {
    const response = await fetch(`${BASE}/${file}.tsv`);
    if (!response.ok) throw new Error(`${file}.tsv: HTTP ${response.status}`);
    for (const [key, name] of Object.entries(toBook(await response.text()))) book[key] ??= name;
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(book)}\n`);
  console.log(`${Object.keys(book).length} positions → ${OUT}`);
}
