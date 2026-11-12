import { Chess, castlingSide } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { kingCastlesTo, makeUci, parseUci, squareRank } from 'chessops/util';
import { abortError, DEFAULT_DEPTH, type Engine, type Score } from './engine/engine.ts';

/** A position where the game is already over (mate, stalemate, insufficient material): the engine cannot analyse it. */
export type FinalScore = { kind: 'final'; winner: 'white' | 'black' | null };

/** Evaluation from white's point of view. */
export type WhiteScore = Score | FinalScore;

/** What the engine found in one position, from white's point of view. */
export type PositionEval = {
  score: WhiteScore;
  /** Best line in UCI, best move first; empty when the game is over here. */
  pv: string[];
  /** Score of the second-best move, when the engine reported one. */
  second?: Score;
};

const CAP = 1000;
const clamp = (cp: number) => Math.max(-CAP, Math.min(CAP, cp));
const lichessCurve = (cp: number) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamp(cp))) - 1);

/** White's chance of winning in 0..100 (ADR-011); mate counts as ±1000 cp. */
export function winPercent(score: WhiteScore): number {
  if (score.kind === 'cp') return lichessCurve(score.cp);
  if (score.kind === 'mate') return lichessCurve(score.mate > 0 ? CAP : -CAP);
  return score.winner === null ? 50 : lichessCurve(score.winner === 'white' ? CAP : -CAP);
}

function finalScore(fen: string): FinalScore | undefined {
  const outcome = Chess.fromSetup(parseFen(fen).unwrap()).unwrap().outcome();
  return outcome && { kind: 'final', winner: outcome.winner ?? null };
}

/** The engine speaks from the side to move; the rest of the app speaks from white. */
function toWhite(score: Score, fen: string): Score {
  if (fen.split(' ')[1] !== 'b') return score;
  return score.kind === 'cp' ? { kind: 'cp', cp: -score.cp } : { kind: 'mate', mate: -score.mate };
}

/**
 * ADR-031: the legal moves other than `best`, in UCI, but only when `best` is the move that leads to `next`: the
 * second-best score is only read ("great move") where the best move was played. Empty otherwise.
 */
function otherMovesIfPlayed(fen: string, best: string, next: string | undefined): string[] {
  const pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap();
  const move = parseUci(best);
  if (!next || !move || !pos.isLegal(move)) return [];
  const after = pos.clone();
  after.play(move);
  // Two different moves never leave the same board, so the placement alone tells which one was played.
  if (makeFen(after.toSetup()).split(' ')[0] !== next.split(' ')[0]) return [];
  const others: string[] = [];
  for (const [from, dests] of pos.allDests()) {
    for (const to of dests) {
      // chessops lists castling as king-takes-rook; Stockfish expects the king's real target.
      const side = castlingSide(pos, { from, to });
      const uci = makeUci({ from, to: side ? kingCastlesTo(pos.turn, side) : to });
      const promotes = pos.board.pawn.has(from) && (squareRank(to) === 0 || squareRank(to) === 7);
      others.push(...(promotes ? ['q', 'r', 'b', 'n'].map((p) => uci + p) : [uci]));
    }
  }
  return others.filter((m) => m !== best);
}

type Options = {
  depth?: number;
  /** Aborting stops the engine and rejects with an `AbortError`; nothing of this analysis is reported afterwards. */
  signal?: AbortSignal;
  /** The evaluations so far (a copy): always a prefix of the game, in order. */
  onProgress?: (evals: PositionEval[]) => void;
};

/** Analyses the positions, as many at once as the engine runs; rejects at the first engine failure or when aborted. */
export async function analyseGame(
  engine: Engine,
  fens: string[],
  { depth = DEFAULT_DEPTH, signal, onProgress }: Options = {},
): Promise<PositionEval[]> {
  // The engine may have answered just before the abort: check again after every `await`.
  const checkAborted = () => {
    if (signal?.aborted) throw abortError();
  };
  checkAborted();
  const stop = () => engine.stop();
  signal?.addEventListener('abort', stop, { once: true });
  try {
    const evaluate = async (i: number): Promise<PositionEval> => {
      const fen = fens[i] as string;
      const final = finalScore(fen);
      if (final) return { score: final, pv: [] };
      const found = await engine.analyse(fen, { depth });
      checkAborted();
      const searchmoves = otherMovesIfPlayed(fen, found.bestMove, fens[i + 1]);
      const second = searchmoves.length ? await engine.analyse(fen, { depth, searchmoves }) : undefined;
      checkAborted();
      return {
        score: toWhite(found.score, fen),
        pv: found.pv.length ? found.pv : [found.bestMove],
        // A second score from a shallower search would be compared with a deeper first one.
        ...(second?.depth === found.depth && { second: toWhite(second.score, fen) }),
      };
    };

    // ADR-032: one lane per analysis the engine runs at once; the progress still only grows from the start.
    const evals: PositionEval[] = [];
    let next = 0;
    let reported = 0;
    let failed = false;
    const lane = async () => {
      for (let i = next++; i < fens.length && !failed; i = next++) {
        evals[i] = await evaluate(i);
        if (failed || i !== reported) continue;
        while (evals[reported]) reported++;
        onProgress?.(evals.slice(0, reported));
      }
    };
    try {
      await Promise.all(Array.from({ length: engine.parallel ?? 1 }, lane));
    } catch (error) {
      failed = true; // the other lanes finish their search and stop, reporting nothing
      throw error;
    }
    return evals;
  } finally {
    signal?.removeEventListener('abort', stop);
  }
}
