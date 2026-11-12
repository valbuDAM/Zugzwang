import { describe, expect, it } from 'vitest';
import { epd } from '../src/domain/openings.ts';
import { parseGamePgn } from '../src/domain/pgn.ts';
import { toBook } from './build-openings.ts';

const key = (pgn: string) => epd(parseGamePgn(pgn).at(-1)?.fen as string);

describe('build-openings', () => {
  it('maps the final position of each line to its name, skipping the header and blank rows', () => {
    const tsv = [
      'eco\tname\tpgn',
      'C20\tKing’s Pawn Game\t1. e4 e5',
      '',
      'C60\tRuy Lopez\t1. e4 e5 2. Nf3 Nc6 3. Bb5\r',
    ];
    expect(toBook(tsv.join('\n'))).toEqual({
      [key('1. e4 e5 *')]: 'King’s Pawn Game',
      [key('1. e4 e5 2. Nf3 Nc6 3. Bb5 *')]: 'Ruy Lopez',
    });
  });

  it('keeps the first name of a position reached by two move orders', () => {
    const tsv = 'eco\tname\tpgn\nA00\tFirst\t1. e4 e5 2. Nf3\nA00\tSecond\t1. Nf3 e5 2. e4';
    expect(Object.values(toBook(tsv))).toEqual(['First']);
  });
});
