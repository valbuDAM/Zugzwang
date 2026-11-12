import { describe, expect, it } from 'vitest';
import { analysisSettings, uciOptions } from './settings.ts';

describe('analysisSettings (ADR-009, ADR-032)', () => {
  it.each([
    // ADR-032: lite runs several one-thread engines side by side, up to 4.
    [
      { variant: 'lite-multi', cores: 8, mobile: false },
      { depth: 16, engines: 4, threads: 1, hashMb: 16 },
    ],
    [
      { variant: 'lite-multi', cores: 4, mobile: false },
      { depth: 16, engines: 3, threads: 1, hashMb: 16 },
    ],
    // A one-core machine still gets one engine, never zero.
    [
      { variant: 'lite-multi', cores: 1, mobile: false },
      { depth: 16, engines: 1, threads: 1, hashMb: 16 },
    ],
    [
      { variant: 'lite-multi', cores: 8, mobile: true },
      { depth: 12, engines: 2, threads: 1, hashMb: 16 },
    ],
    // ADR-029: the deep mode keeps one engine (~100 MB each) with threads.
    [
      { variant: 'full-multi', cores: 8, mobile: false },
      { depth: 16, engines: 1, threads: 4, hashMb: 64 },
    ],
    [
      { variant: 'lite-single', cores: 8, mobile: false },
      { depth: 12, engines: 4, threads: 1, hashMb: 16 },
    ],
    [
      { variant: 'asm', cores: 8, mobile: true },
      { depth: 12, engines: 2, threads: 1, hashMb: 16 },
    ],
  ] as const)('%j → %j', (env, expected) => {
    expect(analysisSettings(env)).toEqual(expected);
  });
});

describe('uciOptions', () => {
  it('maps the settings to UCI options and leaves out a single thread', () => {
    expect(uciOptions({ depth: 16, engines: 1, threads: 4, hashMb: 64 })).toEqual({ Threads: 4, Hash: 64 });
    expect(uciOptions({ depth: 12, engines: 4, threads: 1, hashMb: 16 })).toEqual({ Hash: 16 });
  });
});
