import { describe, expect, it } from 'vitest';
import { gameAccuracy, moveAccuracy, winDrops } from './accuracy.ts';
import type { WhiteScore } from './analysis.ts';

const cps = (...values: number[]): WhiteScore[] => values.map((cp) => ({ kind: 'cp', cp }));
const repeat = (n: number, ...values: number[]) => Array.from({ length: n }, () => values).flat();
// The lichess tests start from its initial evaluation of 15 cp.
const game = (...values: number[]) => gameAccuracy(cps(15, ...values));

describe('moveAccuracy', () => {
  it('follows the lichess curve', () => {
    expect(moveAccuracy(0)).toBe(100);
    expect(moveAccuracy(-3)).toBe(100);
    expect(moveAccuracy(5)).toBeCloseTo(80.815, 2);
    expect(moveAccuracy(10)).toBeCloseTo(64.58, 2);
    expect(moveAccuracy(20)).toBeCloseTo(41.017, 2);
    expect(moveAccuracy(50)).toBeCloseTo(9.528, 2);
  });

  it('never leaves 0..100 and never rises with a bigger drop', () => {
    let prev = 100;
    for (let drop = 0; drop <= 100; drop += 0.25) {
      const accuracy = moveAccuracy(drop);
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(prev);
      prev = accuracy;
    }
    expect(moveAccuracy(100)).toBe(0);
  });
});

describe('winDrops', () => {
  it('measures each move from its mover and never goes below zero', () => {
    const drops = winDrops(cps(0, -100, 100, 100));
    expect(drops[0]).toBe(0);
    expect(drops[1]).toBeCloseTo(9.1, 1); // white lost
    expect(drops[2]).toBeCloseTo(18.2, 1); // black lost
    expect(drops[3]).toBe(0);
    expect(winDrops(cps(0, -100), false)[1]).toBe(0); // black moved first and gained
  });
});

// The vectors of AccuracyPercentTest in lichess, with its tolerances.
describe('gameAccuracy', () => {
  const near = (value: number | null, expected: number, tolerance: number) => {
    expect(value).not.toBeNull();
    expect(Math.abs((value as number) - expected)).toBeLessThanOrEqual(tolerance);
  };

  it('gives null to a side that has not moved', () => {
    expect(gameAccuracy(cps(15))).toEqual({ white: null, black: null });
    expect(game(15)).toEqual({ white: 100, black: null });
  });

  it.each([
    ['two good moves', [15, 15], 100, 1, 100, 1],
    ['white blunders on first move', [-900, -900], 10, 5, 100, 1],
    ['black blunders on first move', [15, 900], 100, 1, 10, 5],
    ['both blunder on first move', [-900, 0], 10, 5, 10, 5],
    ['20 perfect moves', repeat(20, 15), 100, 1, 100, 1],
    ['20 perfect moves and a white blunder', [...repeat(20, 15), -900], 50, 5, 100, 1],
    ['21 perfect moves and a black blunder', [...repeat(21, 15), 900], 100, 1, 50, 5],
    ['5 average moves on each side', repeat(5, -50, 15), 76, 8, 76, 8],
    ['50 average moves on each side', repeat(50, -50, 15), 76, 8, 76, 8],
    ['50 mediocre moves on each side', repeat(50, -135, 15), 54, 8, 54, 8],
    ['50 terrible moves on each side', repeat(50, -435, 15), 20, 8, 20, 8],
  ] as const)('%s', (_name, values, white, whiteTol, black, blackTol) => {
    const accuracy = game(...values);
    near(accuracy.white, white, whiteTol);
    near(accuracy.black, black, blackTol);
  });

  it('swaps the sides when black moves first', () => {
    const accuracy = gameAccuracy(cps(15, 900, 900), false);
    near(accuracy.black, 10, 5);
    near(accuracy.white, 100, 1);
  });

  it('counts mate and finished games as the capped evaluation', () => {
    const accuracy = gameAccuracy([
      { kind: 'cp', cp: 0 },
      { kind: 'mate', mate: -1 },
      { kind: 'final', winner: 'black' },
    ]);
    near(accuracy.white, 10, 5);
    expect(accuracy.black).toBe(100);
  });
});
