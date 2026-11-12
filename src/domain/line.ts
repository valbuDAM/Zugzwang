import { Chess } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSanAndPlay } from 'chessops/san';
import { parseUci } from 'chessops/util';

export type LineStep = { fen: string; san: string; uci: string };

/** The positions an engine line leads to from `fen`; it stops at the first move that is not legal there. */
export function playLine(fen: string, pv: string[]): LineStep[] {
  const setup = parseFen(fen);
  const parsed = setup.isOk ? Chess.fromSetup(setup.value) : undefined;
  if (!parsed?.isOk) return [];
  const pos = parsed.value;
  const steps: LineStep[] = [];
  for (const uci of pv) {
    const move = parseUci(uci);
    if (!move || !pos.isLegal(move)) break;
    const san = makeSanAndPlay(pos, move);
    steps.push({ fen: makeFen(pos.toSetup()), san, uci });
  }
  return steps;
}
