import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnginePool } from './EnginePool.ts';
import type { Eval } from './engine.ts';
import { FakeEngine } from './FakeEngine.ts';

const ev: Eval = { score: { kind: 'cp', cp: 0 }, bestMove: 'e2e4', depth: 10, pv: [] };
const fens = ['a', 'b', 'c'];
const fakes = (n: number) => Array.from({ length: n }, () => new FakeEngine({ a: ev, b: ev, c: ev }, { latency: 100 }));

describe('EnginePool (ADR-032)', () => {
  afterEach(() => vi.useRealTimers());

  it('says how many analyses it runs at once and runs each on a free engine', async () => {
    vi.useFakeTimers();
    const engines = fakes(2);
    const pool = new EnginePool(engines);
    expect(pool.parallel).toBe(2);
    const done = vi.fn();
    for (const fen of fens) void pool.analyse(fen).then(done);

    await vi.advanceTimersByTimeAsync(100); // two at once, the third waits for a free engine
    expect(done).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toHaveBeenCalledTimes(3);
    expect(engines.map((e) => e.calls.length).sort()).toEqual([1, 2]);
  });

  it('stop rejects the running and the waiting analyses with an AbortError', async () => {
    vi.useFakeTimers();
    const pool = new EnginePool(fakes(1));
    const runs = fens.map((fen) => pool.analyse(fen));
    pool.stop();
    for (const run of runs) await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    // and the engine is free again
    const next = pool.analyse('a');
    await vi.advanceTimersByTimeAsync(100);
    await expect(next).resolves.toEqual(ev);
  });

  it('dispose releases every engine and rejects what waits', async () => {
    const engines = fakes(2);
    const dispose = engines.map((e) => vi.spyOn(e, 'dispose'));
    const pool = new EnginePool(engines);
    const runs = fens.map((fen) => pool.analyse(fen));
    pool.dispose();
    for (const run of runs) await expect(run).rejects.toMatchObject({ name: 'EngineError' });
    for (const spy of dispose) expect(spy).toHaveBeenCalledOnce();
  });
});
