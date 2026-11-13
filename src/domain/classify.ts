import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { opposite, parseUci } from 'chessops/util';
import { winDrops } from './accuracy.ts';
import { type PositionEval, winPercent } from './analysis.ts';
import { type Book, inBook } from './openings.ts';
import type { Position } from './pgn.ts';

export const MOVE_LABELS = [
  'brilliant',
  'great',
  'best',
  'good',
  'book',
  'inaccuracy',
  'mistake',
  'blunder',
  'miss',
] as const;
export type MoveLabel = (typeof MOVE_LABELS)[number];

/** ADR-012, in win% lost by the mover unless said otherwise. */
export const THRESHOLDS = {
  best: 1,
  good: 5,
  inaccuracy: 10,
  mistake: 20,
  /** The second-best move loses at least this much. */
  great: 10,
  /** Lost right after the opponent's mistake or blunder. */
  miss: 10,
  /** Material (pawns) the mover is down after the sacrifice line. */
  sacrifice: 2,
  /** A brilliant move leaves at least `brilliantAfter` and was not already winning (`brilliantBefore`). */
  brilliantAfter: 50,
  brilliantBefore: 97,
} as const;

const VALUES = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9 } as const;
export type Piece = keyof typeof VALUES;
export const ROLES = Object.keys(VALUES) as Piece[];

/** Material of `color` minus the other side's, in pawns. */
export function balance(pos: Chess, color: 'white' | 'black'): number {
  const count = (c: 'white' | 'black') =>
    ROLES.reduce((sum, role) => sum + VALUES[role] * pos.board.pieces(c, role).size(), 0);
  return count(color) - count(opposite(color));
}

// shortcut: no exchange evaluator, so a trade that ends on ply 5 looks like a sacrifice; calibrate with real games.
/** Whether the mover is down material once `line` (the move plus the engine's reply line) is played. */
function sacrifices(start: Chess, line: string[]): boolean {
  const pos = start.clone();
  const mover = pos.turn;
  const before = balance(pos, mover);
  for (const uci of line) {
    const move = parseUci(uci);
    if (!move || !pos.isLegal(move)) break;
    pos.play(move);
  }
  return before - balance(pos, mover) >= THRESHOLDS.sacrifice;
}

function legalMoves(pos: Chess): number {
  let n = 0;
  for (const dests of pos.allDests().values()) n += dests.size();
  return n;
}

/**
 * The label of the move that led to each analysed position (ADR-012); null for the start,
 * for a move that was the only legal one and for a position that cannot be read.
 */
export function classifyGame(positions: Position[], evals: PositionEval[], book: Book = {}): (MoveLabel | null)[] {
  const whiteStarts = positions[0]?.fen.split(' ')[1] !== 'b';
  const drops = winDrops(
    evals.map((e) => e.score),
    whiteStarts,
  );
  const labels: (MoveLabel | null)[] = [];
  const label = (i: number): MoveLabel | null => {
    const before = evals[i - 1];
    const after = evals[i];
    const from = positions[i - 1];
    const to = positions[i];
    const setup = from && parseFen(from.fen);
    const parsed = setup?.isOk ? Chess.fromSetup(setup.value) : undefined;
    if (!before || !after || !from || !to?.uci || !parsed?.isOk) return null;
    const pos = parsed.value;
    if (inBook(book, to.fen)) return 'book';
    if (legalMoves(pos) <= 1) return null;

    const white = pos.turn === 'white';
    const pov = (score: PositionEval['score']) => (white ? winPercent(score) : 100 - winPercent(score));
    const drop = drops[i] as number;
    const isTop = to.uci === before.pv[0];
    if (isTop || drop <= THRESHOLDS.best) {
      if (
        pov(after.score) >= THRESHOLDS.brilliantAfter &&
        pov(before.score) < THRESHOLDS.brilliantBefore &&
        sacrifices(pos, [to.uci, ...after.pv.slice(0, 3)])
      )
        return 'brilliant';
      // shortcut: an obvious recapture is "great" too (ADR-012 as written); calibrate with real games.
      if (isTop && before.second && pov(before.score) - pov(before.second) >= THRESHOLDS.great) return 'great';
      return 'best';
    }
    const previous = labels[i - 1];
    if (drop >= THRESHOLDS.miss && (previous === 'mistake' || previous === 'blunder')) return 'miss';
    if (drop <= THRESHOLDS.good) return 'good';
    if (drop <= THRESHOLDS.inaccuracy) return 'inaccuracy';
    return drop <= THRESHOLDS.mistake ? 'mistake' : 'blunder';
  };
  for (let i = 0; i < evals.length; i++) labels.push(label(i));
  return labels;
}
