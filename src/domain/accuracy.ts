import { type WhiteScore, winPercent } from './analysis.ts';

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

/** The accuracy lichess gives one move (0..100) from the win% its mover lost (ADR-011). */
export function moveAccuracy(drop: number): number {
  if (drop <= 0) return 100;
  // The trailing +1 is the "uncertainty bonus" lichess adds for imperfect analysis.
  return clamp(103.1668100711649 * Math.exp(-0.04354415386753951 * drop) - 3.166924740191411 + 1, 0, 100);
}

function deviation(xs: number[]): number {
  const mean = xs.reduce((a, x) => a + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length);
}

/** Win% lost by the move that led to each position, from its mover's side; index 0 (the start) is 0. */
export function winDrops(scores: WhiteScore[], whiteStarts = true): number[] {
  const wins = scores.map(winPercent);
  return wins.map((win, i) => {
    const prev = wins[i - 1];
    if (prev === undefined) return 0;
    return Math.max(0, (i % 2 === 1) === whiteStarts ? prev - win : win - prev);
  });
}

export type GameAccuracy = { white: number | null; black: number | null };

/**
 * Game accuracy per side as lichess computes it (ADR-011): the mean of the volatility-weighted mean and the
 * harmonic mean of the move accuracies. `scores` are the N+1 positions; a side without moves gets null.
 */
export function gameAccuracy(scores: WhiteScore[], whiteStarts = true): GameAccuracy {
  const wins = scores.map(winPercent);
  const size = clamp(Math.floor((wins.length - 1) / 10), 2, 8);
  // One window per move: the first ones repeat the opening window, then it slides.
  const weight = (move: number) => {
    const start = Math.max(0, move - (size - 2));
    return clamp(deviation(wins.slice(start, start + size)), 0.5, 12);
  };
  const drops = winDrops(scores, whiteStarts);
  const side = (white: boolean): number | null => {
    let n = 0;
    let weighted = 0;
    let weights = 0;
    let inverse = 0;
    for (let i = 1; i < drops.length; i++) {
      if (((i % 2 === 1) === whiteStarts) !== white) continue;
      const accuracy = moveAccuracy(drops[i] as number);
      const w = weight(i - 1);
      n++;
      weighted += accuracy * w;
      weights += w;
      // An accuracy of 0 makes this infinite and the harmonic mean 0, as it should.
      inverse += 1 / accuracy;
    }
    return n ? (weighted / weights + n / inverse) / 2 : null;
  };
  return { white: side(true), black: side(false) };
}
