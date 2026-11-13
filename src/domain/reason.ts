import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { opposite, parseUci } from 'chessops/util';
import type { PositionEval, WhiteScore } from './analysis.ts';
import { balance, type Piece, ROLES } from './classify.ts';

/** Why the engine's move was better than the one played (ADR-033). `piece` is null when it is not one clean piece. */
export type Reason =
  | { kind: 'missedMate' | 'allowsMate'; moves: number }
  | { kind: 'loses' | 'wins'; piece: Piece | null };

/** Material (pawns) that counts as a reason: more than a pawn. */
const MATERIAL = 2;

// shortcut: no exchange evaluator, so a line cut right after a quiet in-between move still counts a half-done exchange; calibrate with real games.
/**
 * The position after the last move of `line` that neither captured nor promoted (the captures it ends on may be half
 * an exchange), or after the first such move where `enough` holds.
 */
function settle(start: Chess, line: string[], enough: (pos: Chess) => boolean = () => false): Chess {
  const pos = start.clone();
  let settled = start;
  for (const uci of line) {
    const move = parseUci(uci);
    if (!move || !pos.isLegal(move)) break;
    const before = balance(pos, 'white');
    pos.play(move);
    if (balance(pos, 'white') !== before) continue;
    settled = pos.clone();
    if (enough(settled)) break;
  }
  return settled;
}

/** The piece `color` lost between `start` and `end`, when nothing else changed on the board; null otherwise. */
function onlyLoss(start: Chess, end: Chess, color: 'white' | 'black'): Piece | null {
  const changed = (side: 'white' | 'black') =>
    ROLES.flatMap((role) => {
      const n = Math.abs(start.board.pieces(side, role).size() - end.board.pieces(side, role).size());
      return Array<Piece>(n).fill(role);
    });
  const lost = changed(color);
  return lost.length === 1 && changed(opposite(color)).length === 0 ? (lost[0] as Piece) : null;
}

/**
 * The clearest reason why the engine's move from `fen` was better than `uci`, read from the engine's lines before
 * and after the move; undefined when neither a mate nor material explains it.
 */
export function moveReason(fen: string, uci: string, before: PositionEval, after: PositionEval): Reason | undefined {
  const setup = parseFen(fen);
  const parsed = setup.isOk ? Chess.fromSetup(setup.value) : undefined;
  if (!parsed?.isOk) return undefined;
  const start = parsed.value;
  const mover = start.turn;

  /** Moves to the mate: positive when the mover gives it, negative when the mover gets it, 0 without one. */
  const mate = (score: WhiteScore) => (score.kind !== 'mate' ? 0 : mover === 'white' ? score.mate : -score.mate);
  const had = mate(before.score);
  const has = mate(after.score);
  const mated = after.score.kind === 'final' && after.score.winner === mover;
  if (had > 0 && has <= 0 && !mated) return { kind: 'missedMate', moves: had };
  if (has < 0 && had >= 0) return { kind: 'allowsMate', moves: -has };

  const played = [uci, ...after.pv];
  const gain = (end: Chess) => balance(end, mover) - balance(start, mover);
  const lost = -gain(settle(start, played));
  const won = gain(settle(start, before.pv));
  if (won + lost < MATERIAL) return undefined;
  // The bigger of the two is the reason. The piece is read where the line first gets that far: later it trades on.
  if (lost >= MATERIAL && lost >= won) {
    const there = settle(start, played, (pos) => -gain(pos) >= MATERIAL);
    return { kind: 'loses', piece: onlyLoss(start, there, mover) };
  }
  if (won >= MATERIAL) {
    const there = settle(start, before.pv, (pos) => gain(pos) >= MATERIAL);
    return { kind: 'wins', piece: onlyLoss(start, there, opposite(mover)) };
  }
  return undefined;
}
