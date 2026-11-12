import { describe, expect, it } from 'vitest';
import { playLine } from './line.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('playLine', () => {
  it('plays the line, with the notation and the position after each move', () => {
    const steps = playLine(START, ['e2e4', 'e7e5', 'g1f3']);
    expect(steps.map((s) => s.san)).toEqual(['e4', 'e5', 'Nf3']);
    expect(steps.map((s) => s.uci)).toEqual(['e2e4', 'e7e5', 'g1f3']);
    expect(steps[2]?.fen).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2');
  });

  it('writes castling and checks the way a scoresheet does', () => {
    expect(playLine('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', ['e1g1', 'a8a1']).map((s) => s.san)).toEqual([
      'O-O',
      'Rxa1',
    ]);
    expect(playLine('6k1/5ppp/8/8/8/3Q4/5PPP/6K1 w - - 0 1', ['d3h7'])[0]?.san).toBe('Qxh7+');
  });

  it('stops at the first move that cannot be played', () => {
    expect(playLine(START, ['e2e4', 'e2e4', 'e7e5']).map((s) => s.san)).toEqual(['e4']);
    expect(playLine(START, ['nonsense'])).toEqual([]);
    expect(playLine(START, [])).toEqual([]);
  });

  it('gives nothing for a position it cannot read', () => {
    expect(playLine('nonsense', ['e2e4'])).toEqual([]);
    expect(playLine('8/8/8/8/8/8/8/8 w - - 0 1', ['e2e4'])).toEqual([]);
  });
});
