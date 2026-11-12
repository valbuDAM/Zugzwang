import { type AnalyseOptions, abortError, type Engine, EngineError, type Eval } from './engine.ts';

type Waiter = { resolve: (engine: Engine) => void; reject: (reason: Error) => void };

/** ADR-032: several engines behind one; each analysis goes to a free engine, the rest wait their turn. */
export class EnginePool implements Engine {
  readonly #engines: Engine[];
  readonly #free: Engine[];
  readonly #waiting: Waiter[] = [];

  constructor(engines: Engine[]) {
    this.#engines = engines;
    this.#free = [...engines];
  }

  get parallel(): number {
    return this.#engines.length;
  }

  async analyse(fen: string, opts?: AnalyseOptions): Promise<Eval> {
    const engine =
      this.#free.pop() ?? (await new Promise<Engine>((resolve, reject) => this.#waiting.push({ resolve, reject })));
    try {
      return await engine.analyse(fen, opts);
    } finally {
      const next = this.#waiting.shift();
      if (next) next.resolve(engine);
      else this.#free.push(engine);
    }
  }

  stop(): void {
    this.#rejectWaiting(abortError());
    for (const engine of this.#engines) engine.stop();
  }

  dispose(): void {
    this.#rejectWaiting(new EngineError('Engine disposed'));
    for (const engine of this.#engines) engine.dispose();
  }

  #rejectWaiting(error: Error): void {
    for (const { reject } of this.#waiting.splice(0)) reject(error);
  }
}
