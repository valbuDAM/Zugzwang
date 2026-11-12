import { describe, expect, it } from 'vitest';
import { classifyGame } from './classify.ts';
import { epd, inBook, loadBook, openingName } from './openings.ts';
import { parseGamePgn } from './pgn.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('openings', () => {
  it('identifies a position without its move counters', () => {
    expect(epd(START)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    expect(epd(START.replace('0 1', '7 12'))).toBe(epd(START));
  });

  it('names the game after its last position in the book', () => {
    const fens = parseGamePgn('1. e4 e5 2. Nf3 *').map((p) => p.fen);
    const book = { [epd(fens[1] as string)]: 'King’s Pawn', [epd(fens[2] as string)]: 'Open Game' };
    expect(openingName(book, fens)).toBe('Open Game');
    expect(openingName(book, fens.slice(0, 2))).toBe('King’s Pawn');
    expect(openingName(book, [START])).toBeUndefined();
    expect(inBook(book, fens[1] as string)).toBe(true);
    expect(inBook(book, START)).toBe(false);
    expect(inBook(book, 'toString')).toBe(false);
  });

  it('knows the Ruy Lopez move by move (the real book)', async () => {
    const book = await loadBook();
    const positions = parseGamePgn('1. e4 e5 2. Nf3 Nc6 3. Bb5 *');
    const evals = positions.map(() => ({ score: { kind: 'cp' as const, cp: 20 }, pv: [] }));
    expect(classifyGame(positions, evals, book).slice(1)).toEqual(['book', 'book', 'book', 'book', 'book']);
    expect(
      openingName(
        book,
        positions.map((p) => p.fen),
      ),
    ).toBe('Ruy Lopez');
    expect(inBook(book, START)).toBe(false);
  });
});
