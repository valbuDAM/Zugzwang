import { Chess, type Position as ChessPosition, castlingSide } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { makePgn, parseComment, parsePgn, startingPosition } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import type { Move } from 'chessops/types';
import { kingCastlesTo, makeSquare, makeUci } from 'chessops/util';

export type Position = {
  fen: string;
  /** Move that led here; null for the starting position. */
  san: string | null;
  uci: string | null;
  /** Seconds left for the player who just moved, from `[%clk]`; null when absent. */
  clock: number | null;
  /** Square of the king this move checkmated; null when the move is not mate. */
  mated: string | null;
};

export type PgnProblem =
  | { kind: 'empty' }
  | { kind: 'setup' }
  /** A game of a variant (Chess960, Crazyhouse…) that standard Stockfish cannot analyse. */
  | { kind: 'variant'; name: string }
  /** `black`: the move belongs to Black, so it is written «12… Nf6». */
  | { kind: 'illegal'; number: number; black: boolean; san: string };

/**
 * `rules` of the chess.com API or `Variant` of a PGN; only standard chess (or none) can be analysed. Lichess calls a
 * standard game from a FEN «From Position».
 */
export const isStandard = (variant?: string) =>
  variant === undefined || ['chess', 'standard', 'from position'].includes(variant.toLowerCase());

/** The position of a FEN, or undefined when it is not a legal standard position. */
export function positionFromFen(fen: string): Chess | undefined {
  const setup = parseFen(fen);
  const pos = setup.isOk ? Chess.fromSetup(setup.value) : undefined;
  return pos?.isOk ? pos.value : undefined;
}

/** `move` in UCI as Stockfish reads it: chessops writes castling as king-takes-rook, engines want the king's target. */
export function engineUci(pos: ChessPosition, move: Move): string {
  const side = castlingSide(pos, move);
  return makeUci(side && 'from' in move ? { ...move, to: kingCastlesTo(pos.turn, side) } : move);
}

/** Number and side of the move that reached `ply` (1 = the first move), from the start's FEN: a game may start mid-way. */
export function moveNumber(startFen: string, ply: number): { number: number; black: boolean } {
  const [, turn, , , , fullmoves] = startFen.split(' ');
  const half = ply - (turn === 'b' ? 0 : 1);
  return { number: Number(fullmoves) + Math.floor(half / 2), black: half % 2 === 1 };
}

/** A PGN that cannot be analysed; `problem` is what the UI turns into text. */
export class PgnError extends Error {
  constructor(readonly problem: PgnProblem) {
    super(problem.kind === 'illegal' ? `Illegal move ${problem.san} at move ${problem.number}` : problem.kind);
  }
}

export type PgnGame = {
  /** This game alone, ready for `parseGamePgn`. */
  pgn: string;
  white: string;
  black: string;
  result: string;
  /** Raw `[Date]`, or null when unknown. */
  date: string | null;
};

/** Every game with at least one move in a pasted text; throws `empty` when there is none. */
export function readPgn(text: string): PgnGame[] {
  const games = parsePgn(text)
    .filter((g) => g.moves.children.length > 0)
    .map((g) => {
      const date = g.headers.get('Date');
      return {
        pgn: makePgn(g),
        // chessops fills White, Black and Result with '?' / '*' when the PGN lacks them
        white: g.headers.get('White') as string,
        black: g.headers.get('Black') as string,
        result: g.headers.get('Result') as string,
        date: date && !date.includes('?') ? date : null,
      };
    });
  if (games.length === 0) throw new PgnError({ kind: 'empty' });
  return games;
}

/** Positions of the main line: the start plus one per move (N+1). Throws a `PgnError` on a PGN that is not legal. */
export function parseGamePgn(pgn: string): Position[] {
  const [game] = parsePgn(pgn);
  if (!game) throw new PgnError({ kind: 'empty' });
  const variant = game.headers.get('Variant');
  if (!isStandard(variant)) throw new PgnError({ kind: 'variant', name: variant as string });
  const start = startingPosition(game.headers);
  if (start.isErr) throw new PgnError({ kind: 'setup' });
  const pos = start.unwrap();
  const positions: Position[] = [{ fen: makeFen(pos.toSetup()), san: null, uci: null, clock: null, mated: null }];
  for (const node of game.moves.mainline()) {
    const move = parseSan(pos, node.san);
    if (!move)
      throw new PgnError({ kind: 'illegal', number: pos.fullmoves, black: pos.turn === 'black', san: node.san });
    const uci = engineUci(pos, move);
    pos.play(move);
    const king = pos.board.kingOf(pos.turn);
    positions.push({
      fen: makeFen(pos.toSetup()),
      san: node.san,
      uci,
      clock: node.comments?.map((c) => parseComment(c).clock).find((c) => c !== undefined) ?? null,
      mated: king !== undefined && pos.isCheckmate() ? makeSquare(king) : null,
    });
  }
  return positions;
}
