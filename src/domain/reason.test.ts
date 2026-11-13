import { describe, expect, it } from 'vitest';
import type { PositionEval } from './analysis.ts';
import { moveReason } from './reason.ts';

const cp = (n: number, pv: string[] = []): PositionEval => ({ score: { kind: 'cp', cp: n }, pv });
const mate = (n: number, pv: string[] = []): PositionEval => ({ score: { kind: 'mate', mate: n }, pv });
const over = (winner: 'white' | 'black' | null): PositionEval => ({ score: { kind: 'final', winner }, pv: [] });

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('moveReason: mate', () => {
  it('says the mate the mover had and let go', () => {
    expect(moveReason(START, 'a2a3', mate(3), cp(500))).toEqual({ kind: 'missedMate', moves: 3 });
    expect(moveReason(BLACK_TO_MOVE, 'a7a6', mate(-2), cp(-300))).toEqual({ kind: 'missedMate', moves: 2 });
  });

  it('counts a stalemate as a mate let go, but not the mate itself nor a slower one', () => {
    expect(moveReason(START, 'a2a3', mate(1), over(null))).toEqual({ kind: 'missedMate', moves: 1 });
    expect(moveReason(START, 'a2a3', mate(1), over('white'))).toBeUndefined();
    expect(moveReason(START, 'a2a3', mate(2), mate(5))).toBeUndefined();
  });

  it('says the mate the move lets in', () => {
    expect(moveReason(START, 'a2a3', cp(0), mate(-3))).toEqual({ kind: 'allowsMate', moves: 3 });
    expect(moveReason(BLACK_TO_MOVE, 'a7a6', cp(20), mate(1))).toEqual({ kind: 'allowsMate', moves: 1 });
  });

  it('says nothing when the mover was being mated already', () => {
    expect(moveReason(START, 'a2a3', mate(-5), mate(-2))).toBeUndefined();
  });

  it('puts the mate let go before the mate let in', () => {
    expect(moveReason(START, 'a2a3', mate(2), mate(-1))).toEqual({ kind: 'missedMate', moves: 2 });
  });
});

describe('moveReason: material', () => {
  // The white knight on d4 is attacked by the pawn on e5.
  const HANGING_KNIGHT = '6k1/5ppp/8/4p3/3N4/8/5PPP/6K1 w - - 0 1';
  const KNIGHT_TAKEN = ['e5d4', 'g1f1', 'g8f8'];

  it('names the piece the move loses', () => {
    const before = cp(0, ['d4f3', 'f7f6', 'g1f1']);
    expect(moveReason(HANGING_KNIGHT, 'h2h3', before, cp(-300, KNIGHT_TAKEN))).toEqual({
      kind: 'loses',
      piece: 'knight',
    });
  });

  it('names the piece a black move loses', () => {
    // The bishop on g2 looks at the rook on a8.
    const fen = 'r5k1/5ppp/8/8/8/6P1/5PBP/6K1 b - - 0 1';
    const before = cp(0, ['a8d8', 'g1f1', 'g8f8']);
    expect(moveReason(fen, 'h7h6', before, cp(500, ['g2a8', 'g8h7', 'g1f1']))).toEqual({
      kind: 'loses',
      piece: 'rook',
    });
  });

  it('says only material when the loss is not one clean piece', () => {
    // Knight takes a defended pawn: a knight for a pawn.
    const fen = '6k1/1p3ppp/2p5/8/3N4/8/5PPP/6K1 w - - 0 1';
    const before = cp(0, ['g1f1', 'g8f8']);
    expect(moveReason(fen, 'd4c6', before, cp(-200, ['b7c6', 'g1f1', 'g8f8']))).toEqual({
      kind: 'loses',
      piece: null,
    });
  });

  it('names the piece the best line won', () => {
    // The pawn on e4 attacks the black knight on d5.
    const fen = '6k1/5ppp/8/3n4/4P3/8/5PPP/6K1 w - - 0 1';
    const before = cp(300, ['e4d5', 'g8f8', 'g1f1']);
    expect(moveReason(fen, 'h2h3', before, cp(0, ['d5f6', 'g1f1']))).toEqual({ kind: 'wins', piece: 'knight' });
  });

  it('names the piece where the line first loses it, though it trades on afterwards', () => {
    const before = cp(0, ['d4f3', 'f7f6', 'g1f1']);
    const after = cp(-300, [...KNIGHT_TAKEN, 'f2f4', 'g7g5', 'f4g5', 'f8g7']);
    expect(moveReason(HANGING_KNIGHT, 'h2h3', before, after)).toEqual({ kind: 'loses', piece: 'knight' });
  });

  it('gives the bigger of the two when the move loses material and the best line won it', () => {
    // The knight that the pawn attacks could take the queen on c6.
    const fen = '6k1/5ppp/2q5/4p3/3N4/8/5PPP/6K1 w - - 0 1';
    const before = cp(300, ['d4c6', 'g8f8', 'g1f1']);
    expect(moveReason(fen, 'h2h3', before, cp(-900, ['e5d4', 'g1h2', 'g8f8']))).toEqual({
      kind: 'wins',
      piece: 'queen',
    });
  });

  it('says only material when the best line wins it by promoting', () => {
    const fen = '8/P4pkp/6p1/8/8/8/5PPP/6K1 w - - 0 1';
    const before = cp(900, ['a7a8q', 'g7f6', 'g1f1']);
    expect(moveReason(fen, 'h2h3', before, cp(900, ['g7f6', 'g1f1']))).toEqual({ kind: 'wins', piece: null });
  });

  it('does not count the captures a line ends on: the exchange may not be over', () => {
    // Knight takes a knight that a pawn defends; the line stops before the recapture.
    const fen = '6k1/1p3ppp/2n5/8/3N4/8/5PPP/6K1 w - - 0 1';
    expect(moveReason(fen, 'h2h3', cp(0, ['d4c6']), cp(0, ['g8f8', 'g1f1']))).toBeUndefined();
  });

  it('gives no reason for a single pawn', () => {
    const fen = '6k1/5ppp/8/3p4/4P3/8/5PPP/6K1 w - - 0 1';
    const before = cp(100, ['e4d5', 'g8f8', 'g1f1']);
    expect(moveReason(fen, 'h2h3', before, cp(-100, ['d5e4', 'g1f1', 'g8f8']))).toBeUndefined();
  });

  it('gives no reason when the best line loses the same', () => {
    const before = cp(-300, ['g1f1', 'e5d4', 'f1e2']);
    expect(moveReason(HANGING_KNIGHT, 'h2h3', before, cp(-300, KNIGHT_TAKEN))).toBeUndefined();
  });

  it('gives no reason when the best line gives material up', () => {
    // Qxh7+ Kxh7: the engine's line is a sacrifice, so material does not explain it.
    const fen = '6k1/5ppp/8/8/8/3Q4/5PPP/6K1 w - - 0 1';
    const before = cp(300, ['d3h7', 'g8h7', 'g1f1', 'h7g8']);
    expect(moveReason(fen, 'g1f1', before, cp(0, ['g8f8', 'f1g1']))).toBeUndefined();
  });

  it('reads a line up to its first move that is not legal', () => {
    const before = cp(0, ['d4f3', 'f7f6']);
    expect(moveReason(HANGING_KNIGHT, 'h2h3', before, cp(-300, ['a1a2', ...KNIGHT_TAKEN]))).toBeUndefined();
  });

  it('puts a mate before the material', () => {
    const before = cp(0, ['d4f3', 'f7f6', 'g1f1']);
    expect(moveReason(HANGING_KNIGHT, 'h2h3', before, mate(-4, KNIGHT_TAKEN))).toEqual({
      kind: 'allowsMate',
      moves: 4,
    });
  });

  it('gives no reason for a position that cannot be read', () => {
    expect(moveReason('nonsense', 'h2h3', cp(0), cp(0))).toBeUndefined();
  });
});
