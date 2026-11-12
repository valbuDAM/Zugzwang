import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
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

type Options = {
  depth?: number;
  /** Aborting stops the engine and rejects with an `AbortError`; nothing of this analysis is reported afterwards. */
  signal?: AbortSignal;
  /** The evaluations so far (a copy): always a prefix of the game, in order. */
  onProgress?: (evals: PositionEval[]) => void;
};

/** Analyses the positions in series; rejects at the first engine failure or when aborted. */
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
    const evals: PositionEval[] = [];
    for (const fen of fens) {
      const final = finalScore(fen);
      const found = final ? undefined : await engine.analyse(fen, { depth });
      checkAborted();
      evals.push(
        found
          ? {
              score: toWhite(found.score, fen),
              pv: found.pv.length ? found.pv : [found.bestMove],
              ...(found.second && { second: toWhite(found.second, fen) }),
            }
          : { score: final as FinalScore, pv: [] },
      );
      onProgress?.([...evals]);
    }
    return evals;
  } finally {
    signal?.removeEventListener('abort', stop);
  }
}
