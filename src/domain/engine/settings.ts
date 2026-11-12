import type { Variant } from './variant.ts';

/** `engines`: how many engines analyse side by side, each with `threads` threads and `hashMb` of hash. */
export type AnalysisSettings = { depth: number; engines: number; threads: number; hashMb: number };

/**
 * The UCI options for `UciEngine`; `Threads` is left out at 1 (the default), which not every build lists.
 * No MultiPV (ADR-031): it made every search 4× slower; `analyseGame` asks for the second line only where needed.
 */
export const uciOptions = ({ threads, hashMb }: AnalysisSettings): Record<string, number> => ({
  ...(threads > 1 && { Threads: threads }),
  Hash: hashMb,
});

/**
 * ADR-009: constants in code, not UI options. ADR-032: at a fixed depth more threads do not finish sooner, more
 * engines on different positions do; past 4 there was no gain. The deep mode (~100 MB per engine) keeps one.
 */
export function analysisSettings({
  variant,
  cores,
  mobile,
}: {
  variant: Variant;
  cores: number;
  mobile: boolean;
}): AnalysisSettings {
  const spare = Math.max(1, Math.min(cores - 1, 4));
  const full = variant === 'full-multi';
  return {
    depth: (variant === 'lite-multi' || full) && !mobile ? 16 : 12,
    engines: full ? 1 : mobile ? Math.min(spare, 2) : spare,
    threads: full ? spare : 1,
    hashMb: full ? 64 : 16,
  };
}
