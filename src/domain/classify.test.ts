import { describe, expect, it } from 'vitest';
import type { PositionEval } from './analysis.ts';
import { classifyGame } from './classify.ts';
import { epd } from './openings.ts';
import { type Position, parseGamePgn } from './pgn.ts';

/** A score that gives white exactly this win%. */
const win = (percent: number) => ({ kind: 'cp' as const, cp: Math.log(percent / (100 - percent)) / 0.00368208 });
const at = (percent: number, pv: string[] = [], second?: number): PositionEval => ({
  score: win(percent),
  pv,
  ...(second !== undefined && { second: win(second) }),
});
const fromFen = (fen: string, moves: string) => parseGamePgn(`[SetUp "1"]\n[FEN "${fen}"]\n\n${moves} *`);

// White gives the queen for a pawn: Qxh7+ Kxh7.
const QUEEN_SAC = fromFen('6k1/5ppp/8/8/8/3Q4/5PPP/6K1 w - - 0 1', '1. Qxh7+');
const REPLY = ['g8h7', 'g1f1', 'h7g8'];

describe('classifyGame', () => {
  it('gives no label to the starting position', () => {
    expect(classifyGame(parseGamePgn('1. a3 *'), [at(50)])).toEqual([null]);
  });

  it.each([
    [0.9, 'best'],
    [1.1, 'good'],
    [4.9, 'good'],
    [5.1, 'inaccuracy'],
    [9.9, 'inaccuracy'],
    [10.1, 'mistake'],
    [12, 'mistake'],
    [19.9, 'mistake'],
    [20.1, 'blunder'],
  ] as const)('labels a move that loses %s as %s', (drop, label) => {
    const labels = classifyGame(parseGamePgn('1. a3 *'), [at(50, ['e2e4']), at(50 - drop)]);
    expect(labels).toEqual([null, label]);
  });

  it('calls the first engine move best whatever the evaluation says afterwards', () => {
    expect(classifyGame(parseGamePgn('1. e4 *'), [at(50, ['e2e4']), at(38)])[1]).toBe('best');
  });

  it('measures a black move from black', () => {
    const labels = classifyGame(parseGamePgn('1. e4 a6 *'), [at(50, ['e2e4']), at(50, ['e7e5']), at(62)]);
    expect(labels).toEqual([null, 'best', 'mistake']);
  });

  it('knows who moves first from the starting position', () => {
    const positions = fromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', '1... a6');
    expect(classifyGame(positions, [at(50, ['e7e5']), at(62)])[1]).toBe('mistake');
  });

  it('gives no label to the only legal move', () => {
    const positions = fromFen('6k1/8/8/8/8/8/6q1/7K w - - 0 1', '1. Kxg2');
    const evals: PositionEval[] = [at(10, ['h1g2']), { score: { kind: 'final', winner: null }, pv: [] }];
    expect(classifyGame(positions, evals)).toEqual([null, null]);
  });

  it('labels a position of the book as book, whatever it loses', () => {
    const positions = parseGamePgn('1. e4 a6 *');
    const book = { [epd(positions[1]?.fen as string)]: "King's Pawn" };
    expect(classifyGame(positions, [at(50), at(20), at(20, ['d2d4'])], book)).toEqual([null, 'book', 'best']);
  });

  describe('great move', () => {
    it('is the first engine move when the second one loses 10 or more', () => {
      expect(classifyGame(parseGamePgn('1. e4 *'), [at(60, ['e2e4'], 49.9), at(60)])[1]).toBe('great');
      expect(classifyGame(parseGamePgn('1. e4 *'), [at(60, ['e2e4'], 50.1), at(60)])[1]).toBe('best');
    });

    it('measures the second line from black too', () => {
      const evals = [at(50, ['e2e4']), at(40, ['e7e5'], 50.1), at(40)];
      expect(classifyGame(parseGamePgn('1. e4 e5 *'), evals)[2]).toBe('great');
    });

    it('is not a move that merely keeps the evaluation, nor one without a second line', () => {
      expect(classifyGame(parseGamePgn('1. d4 *'), [at(60, ['e2e4'], 45), at(60)])[1]).toBe('best');
      expect(classifyGame(parseGamePgn('1. e4 *'), [at(60, ['e2e4']), at(60)])[1]).toBe('best');
    });
  });

  describe('brilliant move', () => {
    it('is a best move that gives up material and still leaves at least an even game', () => {
      expect(classifyGame(QUEEN_SAC, [at(60, ['d3h7']), at(60, REPLY)])[1]).toBe('brilliant');
      expect(classifyGame(QUEEN_SAC, [at(50.5, ['d3d4']), at(50, REPLY)])[1]).toBe('brilliant');
    });

    it('is not one that leaves a worse game or that was winning already', () => {
      expect(classifyGame(QUEEN_SAC, [at(49, ['d3h7']), at(49, REPLY)])[1]).toBe('best');
      const winning: PositionEval = { score: { kind: 'mate', mate: 5 }, pv: ['d3h7'] };
      expect(classifyGame(QUEEN_SAC, [winning, at(97.5, REPLY)])[1]).toBe('best');
    });

    it('follows the line only while it is legal', () => {
      expect(classifyGame(QUEEN_SAC, [at(60, ['d3h7']), at(60, ['nonsense'])])[1]).toBe('best');
      expect(classifyGame(QUEEN_SAC, [at(60, ['d3h7']), at(60, ['a8a7'])])[1]).toBe('best');
      expect(classifyGame(QUEEN_SAC, [at(60, ['d3h7']), at(60)])[1]).toBe('best');
    });

    it('is not an even trade', () => {
      // 1. Qxd8+ Kxd8: queen for queen
      const trade = fromFen('3qk3/8/8/8/8/8/8/3QK3 w - - 0 1', '1. Qxd8+');
      expect(classifyGame(trade, [at(50, ['d1d8']), at(50, ['e8d8'])])[1]).toBe('best');
    });
  });

  describe('missed chance', () => {
    const positions = parseGamePgn('1. a3 a6 2. b3 b6 *');

    it('replaces the label of a move that loses 10 or more right after a mistake or a blunder', () => {
      // white blunders (50 → 28) and black gives it back (28 → 40), twice; a miss is not itself a mistake to miss after
      const evals = [at(50), at(28), at(40), at(28), at(40)];
      expect(classifyGame(positions, evals)).toEqual([null, 'blunder', 'miss', 'mistake', 'miss']);
    });

    it('leaves a smaller loss, or one after a good move, with its own label', () => {
      expect(classifyGame(positions, [at(50), at(38), at(44), at(44), at(56)])).toEqual([
        null,
        'mistake',
        'inaccuracy',
        'best',
        'mistake',
      ]);
    });
  });

  it('gives no label where the game cannot be read', () => {
    const [start, move] = parseGamePgn('1. a3 *');
    const evals = [at(50), at(50), at(50)];
    expect(classifyGame([start, move] as Position[], evals)).toEqual([null, 'best', null]);
    expect(classifyGame([{ ...start, fen: 'nonsense' }, move] as Position[], evals.slice(0, 2))).toEqual([null, null]);
    expect(
      classifyGame([{ ...start, fen: '8/8/8/8/8/8/8/8 w - - 0 1' }, move] as Position[], evals.slice(0, 2)),
    ).toEqual([null, null]);
    expect(classifyGame([], [at(50)])).toEqual([null]);
  });
});
