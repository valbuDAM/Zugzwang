import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyseGame, type PositionEval, winPercent } from './analysis.ts';
import { type AnalyseOptions, DEFAULT_DEPTH, type Engine, EngineError, type Eval } from './engine/engine.ts';
import { FakeEngine } from './engine/FakeEngine.ts';

const WHITE_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const MATED_WHITE = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'; // 1.f3 e5 2.g4 Qh4#
const STALEMATE = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
const BARE_KINGS = '8/8/8/4k3/8/3K4/8/8 w - - 0 1';

const ev = (score: Eval['score']): Eval => ({ score, bestMove: 'e2e4', depth: 10, pv: [] });
const scoresOf = (evals: PositionEval[]) => evals.map((e) => e.score);

describe('winPercent', () => {
  it('is 50 at equality and follows the lichess curve', () => {
    expect(winPercent({ kind: 'cp', cp: 0 })).toBe(50);
    expect(winPercent({ kind: 'cp', cp: 100 })).toBeCloseTo(59.1, 1);
    expect(winPercent({ kind: 'cp', cp: -100 })).toBeCloseTo(40.9, 1);
  });

  it('clamps centipawns at ±1000 and counts mate as ±1000', () => {
    const cap = winPercent({ kind: 'cp', cp: 1000 });
    expect(cap).toBeCloseTo(97.55, 1);
    expect(winPercent({ kind: 'cp', cp: 5000 })).toBe(cap);
    expect(winPercent({ kind: 'mate', mate: 3 })).toBe(cap);
    expect(winPercent({ kind: 'mate', mate: -3 })).toBeCloseTo(100 - cap, 10);
  });

  it('gives a finished game the extreme or the middle', () => {
    expect(winPercent({ kind: 'final', winner: 'white' })).toBe(winPercent({ kind: 'cp', cp: 1000 }));
    expect(winPercent({ kind: 'final', winner: 'black' })).toBeCloseTo(100 - winPercent({ kind: 'cp', cp: 1000 }), 10);
    expect(winPercent({ kind: 'final', winner: null })).toBe(50);
  });
});

describe('analyseGame', () => {
  it('returns white-point-of-view scores, flipping the ones for black to move', async () => {
    const engine = new FakeEngine({
      [WHITE_TO_MOVE]: ev({ kind: 'cp', cp: 20 }),
      [BLACK_TO_MOVE]: ev({ kind: 'cp', cp: 30 }),
    });
    expect(scoresOf(await analyseGame(engine, [WHITE_TO_MOVE, BLACK_TO_MOVE]))).toEqual([
      { kind: 'cp', cp: 20 },
      { kind: 'cp', cp: -30 },
    ]);
  });

  it('flips mate scores too', async () => {
    const engine = new FakeEngine({ [BLACK_TO_MOVE]: ev({ kind: 'mate', mate: 2 }) });
    expect(scoresOf(await analyseGame(engine, [BLACK_TO_MOVE]))).toEqual([{ kind: 'mate', mate: -2 }]);
  });

  it('resolves finished positions without asking the engine', async () => {
    const engine = new FakeEngine({});
    expect(scoresOf(await analyseGame(engine, [MATED_WHITE, STALEMATE, BARE_KINGS]))).toEqual([
      { kind: 'final', winner: 'black' },
      { kind: 'final', winner: null },
      { kind: 'final', winner: null },
    ]);
    expect(engine.calls).toEqual([]);
  });

  it('keeps the best line, from white, and falls back to the best move without a line', async () => {
    const engine = new FakeEngine({
      [WHITE_TO_MOVE]: { ...ev({ kind: 'cp', cp: 20 }), bestMove: 'd2d4', pv: ['d2d4', 'd7d5'] },
      [BLACK_TO_MOVE]: { ...ev({ kind: 'cp', cp: 30 }), bestMove: 'e7e5' },
    });
    expect(await analyseGame(engine, [WHITE_TO_MOVE, BLACK_TO_MOVE, MATED_WHITE])).toEqual([
      { score: { kind: 'cp', cp: 20 }, pv: ['d2d4', 'd7d5'] },
      { score: { kind: 'cp', cp: -30 }, pv: ['e7e5'] },
      { score: { kind: 'final', winner: 'black' }, pv: [] },
    ]);
  });

  describe('on an engine that runs several analyses at once (ADR-032)', () => {
    afterEach(() => vi.useRealTimers());
    // d2d4 is never the move played here: one search per position. Each answer comes after its own delay.
    const engineAnswering = (...delays: (number | Error)[]) => {
      let call = 0;
      const analyse = vi.fn(() => {
        const delay = delays[call++] ?? 0;
        return new Promise<Eval>((resolve, reject) =>
          setTimeout(
            () =>
              delay instanceof Error ? reject(delay) : resolve({ ...ev({ kind: 'cp', cp: 0 }), bestMove: 'd2d4' }),
            delay instanceof Error ? 100 : delay,
          ),
        );
      });
      return { analyse, engine: { analyse, stop: () => {}, dispose: () => {}, parallel: 2 } satisfies Engine };
    };
    const FENS = [WHITE_TO_MOVE, BLACK_TO_MOVE, WHITE_TO_MOVE];

    it('keeps that many positions going and reports only the in-order prefix', async () => {
      vi.useFakeTimers();
      const { analyse, engine } = engineAnswering(300, 100, 100); // the first position is the slowest
      const onProgress = vi.fn();
      const run = analyseGame(engine, FENS, { onProgress });

      expect(analyse).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(200); // positions 1 and 2 done, still waiting for 0
      expect(onProgress).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(100);
      expect(onProgress.mock.calls.map(([evals]) => evals.length)).toEqual([3]);
      expect(scoresOf(await run)).toEqual([
        { kind: 'cp', cp: 0 },
        { kind: 'cp', cp: -0 },
        { kind: 'cp', cp: 0 },
      ]);
    });

    it('reports nothing more after a failure', async () => {
      vi.useFakeTimers();
      const { engine } = engineAnswering(new EngineError('boom'), 150);
      const onProgress = vi.fn();
      const run = expect(analyseGame(engine, FENS, { onProgress })).rejects.toBeInstanceOf(EngineError);
      await vi.advanceTimersByTimeAsync(1_000);
      await run;
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe('second-best score (ADR-031)', () => {
    // The second search answers with its own score and depth; the first one says e2e4, the move played.
    const engineWith = (second: Eval) => {
      const analyse = vi.fn(async (_fen: string, opts?: AnalyseOptions) =>
        opts?.searchmoves ? second : ev({ kind: 'cp', cp: 20 }),
      );
      return { analyse, engine: { analyse, stop: () => {}, dispose: () => {} } satisfies Engine };
    };

    it('searches again without the best move only where that move was played, at the same depth', async () => {
      const { analyse, engine } = engineWith({ ...ev({ kind: 'cp', cp: -5 }), bestMove: 'd2d4' });
      expect(await analyseGame(engine, [WHITE_TO_MOVE, BLACK_TO_MOVE], { depth: 10 })).toEqual([
        { score: { kind: 'cp', cp: 20 }, pv: ['e2e4'], second: { kind: 'cp', cp: -5 } },
        { score: { kind: 'cp', cp: -20 }, pv: ['e2e4'] },
      ]);
      expect(analyse.mock.calls.map(([fen, opts]) => [fen, opts?.searchmoves?.length])).toEqual([
        [WHITE_TO_MOVE, undefined],
        [WHITE_TO_MOVE, 19],
        [BLACK_TO_MOVE, undefined],
      ]);
      const searchmoves = analyse.mock.calls[1]?.[1]?.searchmoves;
      expect(searchmoves).toContain('g1f3');
      expect(searchmoves).not.toContain('e2e4');
    });

    it('leaves out a second score from a shallower search', async () => {
      const { engine } = engineWith({ ...ev({ kind: 'cp', cp: -5 }), depth: 9 });
      const [first] = await analyseGame(engine, [WHITE_TO_MOVE, BLACK_TO_MOVE]);
      expect(first).not.toHaveProperty('second');
    });

    it('lists castling as the king move and every promotion', async () => {
      const before = '4k3/1P6/8/8/8/8/8/4K2R w K - 0 1';
      const after = '4k3/1P6/8/8/8/8/8/5RK1 b - - 1 1';
      const analyse = vi.fn(async (_fen: string, opts?: AnalyseOptions) => ({
        ...ev({ kind: 'cp', cp: 0 }),
        bestMove: opts?.searchmoves ? 'b7b8q' : 'e1g1',
      }));
      await analyseGame({ analyse, stop: () => {}, dispose: () => {} }, [before, after]);
      const searchmoves = analyse.mock.calls[1]?.[1]?.searchmoves;
      expect(searchmoves).toEqual(expect.arrayContaining(['b7b8q', 'b7b8r', 'b7b8b', 'b7b8n', 'h1h8']));
      expect(searchmoves).not.toContain('e1g1');
      expect(searchmoves).not.toContain('e1h1');
    });
  });

  it('reports the evaluations so far after each position, as copies, finished positions included', async () => {
    const engine = new FakeEngine({ [WHITE_TO_MOVE]: ev({ kind: 'cp', cp: 0 }) });
    const onProgress = vi.fn();
    await analyseGame(engine, [WHITE_TO_MOVE, MATED_WHITE], { onProgress });
    const first = { score: { kind: 'cp', cp: 0 }, pv: ['e2e4'] };
    expect(onProgress.mock.calls).toEqual([
      [[first]],
      [[first, { score: { kind: 'final', winner: 'black' }, pv: [] }]],
    ]);
  });

  it('analyses at the engine default depth unless told otherwise', async () => {
    const analyse = vi.fn(async () => ev({ kind: 'cp', cp: 0 }));
    const engine: Engine = { analyse, stop: () => {}, dispose: () => {} };
    await analyseGame(engine, [WHITE_TO_MOVE]);
    await analyseGame(engine, [WHITE_TO_MOVE], { depth: 4 });
    expect(analyse.mock.calls).toEqual([
      [WHITE_TO_MOVE, { depth: DEFAULT_DEPTH }],
      [WHITE_TO_MOVE, { depth: 4 }],
    ]);
  });

  it('stops at the first engine failure', async () => {
    const engine = new FakeEngine({});
    await expect(analyseGame(engine, [WHITE_TO_MOVE, BLACK_TO_MOVE])).rejects.toBeInstanceOf(EngineError);
    expect(engine.calls).toEqual([WHITE_TO_MOVE]);
  });

  describe('with a signal', () => {
    const FENS = [WHITE_TO_MOVE, BLACK_TO_MOVE, WHITE_TO_MOVE];
    // d2d4 is not the move played: one search per position.
    const evals = {
      [WHITE_TO_MOVE]: { ...ev({ kind: 'cp', cp: 1 }), bestMove: 'd2d4' },
      [BLACK_TO_MOVE]: ev({ kind: 'cp', cp: 2 }),
    };
    afterEach(() => vi.useRealTimers());

    it('stops the engine, rejects with an AbortError and reports nothing more once aborted mid-game', async () => {
      vi.useFakeTimers();
      const engine = new FakeEngine(evals, { latency: 100 });
      const stop = vi.spyOn(engine, 'stop');
      const ctrl = new AbortController();
      const onProgress = vi.fn();
      const run = expect(analyseGame(engine, FENS, { signal: ctrl.signal, onProgress })).rejects.toMatchObject({
        name: 'AbortError',
      });

      await vi.advanceTimersByTimeAsync(100); // first position done, second in flight
      expect(onProgress).toHaveBeenCalledTimes(1);
      ctrl.abort();
      await run;
      await vi.advanceTimersByTimeAsync(1_000);

      expect(stop).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(engine.calls).toHaveLength(2); // the third position was never asked
    });

    it('drops a result that arrives in the same tick as the abort', async () => {
      const engine = new FakeEngine(evals); // answers at once, whatever stop() says
      const ctrl = new AbortController();
      const onProgress = vi.fn();
      const run = analyseGame(engine, FENS, { signal: ctrl.signal, onProgress });
      ctrl.abort();
      await expect(run).rejects.toMatchObject({ name: 'AbortError' });
      expect(onProgress).not.toHaveBeenCalled();
    });

    it('does not touch the engine if it is aborted already', async () => {
      const engine = new FakeEngine(evals);
      await expect(analyseGame(engine, FENS, { signal: AbortSignal.abort() })).rejects.toMatchObject({
        name: 'AbortError',
      });
      expect(engine.calls).toEqual([]);
    });

    it('does not stop the engine for an abort that comes after the game is done', async () => {
      const engine = new FakeEngine(evals);
      const stop = vi.spyOn(engine, 'stop');
      const ctrl = new AbortController();
      await analyseGame(engine, [WHITE_TO_MOVE], { signal: ctrl.signal });
      ctrl.abort();
      expect(stop).not.toHaveBeenCalled();
    });
  });
});
