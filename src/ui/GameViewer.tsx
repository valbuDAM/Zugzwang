import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gameAccuracy, winDrops } from '../domain/accuracy.ts';
import { analyseGame, type PositionEval, winPercent } from '../domain/analysis.ts';
import { readAnalysis, writeAnalysis } from '../domain/analysisCache.ts';
import { classifyGame, type MoveLabel } from '../domain/classify.ts';
import { type Engine, EngineLoadError } from '../domain/engine/engine.ts';
import type { Variant } from '../domain/engine/variant.ts';
import { playLine } from '../domain/line.ts';
import { type Book, loadBook, openingName } from '../domain/openings.ts';
import { parseGamePgn } from '../domain/pgn.ts';
import { createEngine, createFullEngine, detectSettings, detectVariant } from '../engine/createEngine.ts';
import { type DeepDeps, detectDeep } from '../engine/deep.ts';
import { formatEval } from '../i18n/format.ts';
import { AnalysisSummary, LabelCounts } from './AnalysisSummary.tsx';
import { Board, type BoardMark } from './Board.tsx';
import { DeepMode } from './DeepMode.tsx';
import { EvalBar } from './EvalBar.tsx';
import { EvalGraph } from './EvalGraph.tsx';
import { MoveList, scrollToView } from './MoveList.tsx';
import { MovePanel } from './MovePanel.tsx';
import { playSound, readMuted, soundKind, storeMuted } from './sound.ts';
import { useDeepMode } from './useDeepMode.ts';
import './GameViewer.css';

const WORSE: readonly MoveLabel[] = ['good', 'inaccuracy', 'mistake', 'blunder', 'miss'];

type Analysis =
  | { status: 'idle' }
  // `evals` is the part of the game analysed so far, always from the first position on.
  | { status: 'running'; evals: PositionEval[]; variant: Variant }
  // `variant` is the engine that produced the evals: the deep mode can fall back to lite (ADR-029).
  | { status: 'done'; evals: PositionEval[]; variant: Variant; fellBack?: boolean }
  | { status: 'error'; engineLoad: boolean };

type Props = {
  pgn: string;
  /** The side shown at the bottom, for the board and the evaluation bar alike. */
  orientation?: 'white' | 'black';
  makeEngine?: () => Engine;
  /** The engine build `makeEngine` will load, shown in "About the analysis". */
  variant?: Variant;
  /** The deep mode of this browser (ADR-029); `undefined` where it is not offered. */
  deep?: DeepDeps | undefined;
  makeFullEngine?: (wasm: Blob) => Engine;
  /** The game's details (players, date, result), shown above the analysis. */
  children?: ReactNode;
};

// Another game starts from scratch: its position, its analysis, and no answer of the previous one reaches it.
export const GameViewer = (props: Props) => <Viewer key={props.pgn} {...props} />;

function Viewer({
  pgn,
  orientation = 'white',
  makeEngine = createEngine,
  variant = detectVariant(),
  deep,
  makeFullEngine = createFullEngine,
  children,
}: Props) {
  const { t } = useTranslation();
  const [deepDeps] = useState(() => deep ?? detectDeep());
  const deepMode = useDeepMode(deepDeps);
  // The variant shown and read from the cache: the deep mode replaces the detected one while it is on.
  const active: Variant = deepMode.state.status === 'on' ? 'full-multi' : variant;
  const positions = useMemo(() => {
    try {
      return parseGamePgn(pgn);
    } catch {
      return null;
    }
  }, [pgn]);
  const [ply, setPly] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis>({ status: 'idle' });
  const [flipped, setFlipped] = useState(false);
  const [muted, setMuted] = useState(readMuted);
  // Read once: a rotation must not undo the reader's own fold.
  const [movesOpen] = useState(() => !window.matchMedia?.('(max-width: 40rem)').matches);
  const [book, setBook] = useState<Book>();
  // The engine's better line on the board: how many of its moves are played, for the move of `ply` only.
  const [line, setLine] = useState<{ ply: number; step: number }>();
  const summaryId = useId();
  const analysisAbort = useRef<AbortController>(null);
  const lastPly = useRef(0);
  const last = (positions?.length ?? 1) - 1;
  const fens = useMemo(() => positions?.map((p) => p.fen) ?? [], [positions]);
  const depth = detectSettings(active).depth;

  // A game analysed before opens already done, and changing the mode shows the analysis of that mode (or "Analyse").
  // Whatever is running is left alone: its result arrives on its own.
  useEffect(() => {
    let stale = false;
    if (positions)
      void readAnalysis(fens, { variant: active, depth }).then((saved) => {
        if (stale) return;
        setAnalysis((a) => {
          if (a.status === 'running') return a;
          if (saved) return { status: 'done', evals: saved, variant: active };
          return a.status === 'idle' ? a : { status: 'idle' };
        });
      });
    return () => {
      stale = true;
    };
  }, [positions, fens, active, depth]);

  // Without the book (offline, chunk not served) the game is analysed all the same, just without openings.
  useEffect(() => {
    let stale = false;
    loadBook().then(
      (loaded) => stale || setBook(loaded),
      () => {},
    );
    return () => {
      stale = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        (target instanceof HTMLElement && target.matches('input, textarea, select'))
      )
        return;
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1));
      else if (e.key === 'ArrowRight') setPly((p) => Math.min(last, p + 1));
      else if (e.key === 'Home') setPly(0);
      else if (e.key === 'End') setPly(last);
      else if (e.key.toLowerCase() === 'f') setFlipped((f) => !f);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last]);

  const san = positions?.[ply]?.san;
  useEffect(() => {
    if (lastPly.current !== ply && san && !muted) playSound(soundKind(san, ply === last));
    lastPly.current = ply;
  }, [ply, san, muted, last]);

  // Leaving the page aborts the analysis: the engine stops, is released by `analyse`, and nothing more is shown.
  useEffect(() => () => analysisAbort.current?.abort(), []);

  const evals = analysis.status === 'running' || analysis.status === 'done' ? analysis.evals : undefined;
  // Same array between renders: the move list is memoized on it.
  const scores = useMemo(() => evals?.map((e) => e.score), [evals]);
  // Only for a finished analysis: classifying rebuilds every position, too much to repeat after each one.
  const report = useMemo(() => {
    if (analysis.status !== 'done' || !positions) return undefined;
    const whiteStarts = fens[0]?.split(' ')[1] !== 'b';
    const all = analysis.evals.map((e) => e.score);
    return {
      whiteStarts,
      labels: classifyGame(positions, analysis.evals, book),
      drops: winDrops(all, whiteStarts),
      accuracy: gameAccuracy(all, whiteStarts),
    };
  }, [analysis, positions, fens, book]);
  const opening = useMemo(() => book && openingName(book, fens), [book, fens]);
  const label = report?.labels[ply];
  // The engine's line from the position before the move, for a move that was worse than the engine's.
  const better = useMemo(() => {
    const before = evals?.[ply - 1];
    const from = positions?.[ply - 1];
    if (!label || !WORSE.includes(label) || !before || !from) return [];
    return playLine(from.fen, before.pv);
  }, [label, evals, positions, ply]);
  // Moving on in the game leaves the line for good, also when coming back to this move.
  if (line && line.ply !== ply) setLine(undefined);
  const step = line?.ply === ply ? line.step : null;

  if (!positions) return <p role="alert">{t('game.invalid')}</p>;
  const current = positions[ply];
  // While the engine's line is on the board, the bar shows what the engine gave that line.
  const currentScore = scores?.[step === null ? ply : ply - 1];
  // The first position is the start, not a move: "move N of M" counts the moves analysed.
  const moves = Math.max(0, (scores?.length ?? 0) - 1);
  const side = flipped ? (orientation === 'white' ? 'black' : 'white') : orientation;
  // Piece letters spoken in Spanish (Cf3, not Nf3); the only uppercase letters in SAN besides O-O are pieces.
  const spokenSan = current?.san?.replace(/[KQRBN]/g, (c) => t('game.pieceLetters').charAt('KQRBN'.indexOf(c)));
  const spokenMove = spokenSan
    ? t('game.announce', {
        number: Math.ceil(ply / 2),
        san: spokenSan,
        side: t(ply % 2 ? 'game.sideWhite' : 'game.sideBlack'),
      })
    : t('game.start');
  const announcement = label
    ? t('game.announceLabel', { move: spokenMove, label: t(`moveLabel.${label}`) })
    : spokenMove;
  // In the line: the position after `step` of its moves, with the next one as the arrow.
  const shownFen = step === null ? current?.fen : step === 0 ? positions[ply - 1]?.fen : better[step - 1]?.fen;
  const arrow = better[step ?? 0]?.uci;
  // The game's marks belong to the game's position, not to the engine's line.
  const marks: BoardMark[] = [];
  if (step === null && label && current?.uci) marks.push({ square: current.uci.slice(2, 4), label });
  if (step === null && current?.mated) marks.push({ square: current.mated, label: 'mate' });

  const analyse = async () => {
    const abort = new AbortController();
    analysisAbort.current = abort;
    setAnalysis({ status: 'running', evals: [], variant: active });
    const run = async (engine: Engine, used: Variant, fellBack: boolean) => {
      try {
        const result = await analyseGame(engine, fens, {
          depth,
          signal: abort.signal,
          onProgress: (so) => setAnalysis({ status: 'running', evals: so, variant: used }),
        });
        setAnalysis({ status: 'done', evals: result, variant: used, ...(fellBack && { fellBack }) });
        void writeAnalysis(fens, { variant: used, depth }, result);
      } finally {
        engine.dispose();
      }
    };
    try {
      // ADR-029: if the copy is gone or does not load, this game goes with lite and the copy is kept for the next try.
      const wasm = active === 'full-multi' ? await deepDeps?.cached().catch(() => undefined) : undefined;
      let fellBack = active === 'full-multi' && !wasm;
      if (fellBack) void deepMode.refresh(); // the browser evicted it: offer the download again
      if (wasm) {
        try {
          return await run(makeFullEngine(wasm), 'full-multi', false);
        } catch (error) {
          if (!(error instanceof EngineLoadError) || abort.signal.aborted) throw error;
          fellBack = true;
        }
      }
      await run(makeEngine(), variant, fellBack);
    } catch (error) {
      if (!abort.signal.aborted) setAnalysis({ status: 'error', engineLoad: error instanceof EngineLoadError });
    }
  };

  return (
    <section className="game-viewer" aria-label={t('game.title')}>
      {children && <div className="game-viewer-details">{children}</div>}
      <div className="game-viewer-board">
        <div className="game-viewer-play">
          {currentScore && (
            <EvalBar whitePercent={winPercent(currentScore)} text={formatEval(currentScore)} orientation={side} />
          )}
          <Board fen={shownFen ?? ''} label={t('game.boardLabel')} orientation={side} arrow={arrow} marks={marks} />
        </div>
        <p className="game-viewer-status" role="status">
          <span aria-hidden="true">{t('game.move', { current: ply, total: last })}</span>
          {current?.san && <strong aria-hidden="true">{current.san}</strong>}
          <span className="sr-only">{announcement}</span>
        </p>
        <div className="game-viewer-controls">
          <button type="button" disabled={ply === 0} onClick={() => setPly(ply - 1)}>
            {t('game.prev')}
          </button>
          <button type="button" disabled={ply === last} onClick={() => setPly(ply + 1)}>
            {t('game.next')}
          </button>
          <button type="button" aria-pressed={flipped} aria-keyshortcuts="F" onClick={() => setFlipped(!flipped)}>
            {t('game.flip')}
          </button>
          <button
            type="button"
            aria-pressed={!muted}
            onClick={() => {
              storeMuted(!muted);
              setMuted(!muted);
            }}
          >
            {t('game.sound')}
          </button>
        </div>
      </div>
      {/* Everything the analysis says, beside the board on a wide screen and under it on a narrow one. */}
      <div className="game-viewer-side">
        {analysis.status !== 'done' && (
          <div className="game-viewer-controls">
            <button
              type="button"
              disabled={analysis.status === 'running' || deepMode.state.status === 'downloading'}
              onClick={analyse}
            >
              {t('game.analyse')}
            </button>
          </div>
        )}
        {analysis.status === 'running' && (
          // A native <progress> is announced every few percent; a live region would read out every position.
          <div className="game-viewer-progress">
            <progress max={last} value={moves} aria-label={t('game.progressLabel')} />
            <span aria-hidden="true">{t('game.analysing', { done: moves, total: last })}</span>
          </div>
        )}
        {analysis.status === 'error' && (
          <p role="alert">{t(analysis.engineLoad ? 'game.engineLoadError' : 'game.analysisError')}</p>
        )}
        {analysis.status === 'done' && analysis.fellBack && <p role="alert">{t('game.fellBack')}</p>}
        {report && <AnalysisSummary id={summaryId} accuracy={report.accuracy} />}
        {opening && (
          <p className="game-viewer-opening">
            {t('game.opening')} <strong>{opening}</strong>
          </p>
        )}
        {scores && scores.length > 1 && (
          <EvalGraph
            scores={scores}
            labels={report?.labels}
            ply={ply}
            total={last}
            describedBy={report && summaryId}
            onSelect={setPly}
          />
        )}
        {report && (
          // Always there once analysed, so the move list below does not jump between moves with and without a label.
          <div className="game-viewer-move">
            {label && (
              <MovePanel
                label={label}
                drop={report.drops[ply] ?? 0}
                line={better}
                step={step}
                onStep={(next) => setLine(next === null ? undefined : { ply, step: next })}
              />
            )}
          </div>
        )}
        <details
          className="game-viewer-moves"
          open={movesOpen}
          // A closed list cannot scroll itself, so bring the current move into view when it opens.
          onToggle={(e) => scrollToView(e.currentTarget.querySelector<HTMLButtonElement>('[aria-current="step"]'))}
        >
          <summary>{t('game.moves')}</summary>
          <MoveList positions={positions} ply={ply} scores={scores} labels={report?.labels} onSelect={setPly} />
        </details>
        {report && <LabelCounts labels={report.labels} whiteStarts={report.whiteStarts} />}
        <details className="game-viewer-about">
          <summary>{t('game.about')}</summary>
          <p>
            {t(
              `game.variant.${analysis.status === 'running' || analysis.status === 'done' ? analysis.variant : active}`,
            )}
          </p>
          <DeepMode mode={deepMode} busy={analysis.status === 'running'} />
        </details>
      </div>
    </section>
  );
}
