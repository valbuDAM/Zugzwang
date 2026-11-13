import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import { type CSSProperties, useEffect, useRef } from 'react';
import { type BadgeLabel, MoveBadge } from './MoveBadge.tsx';
import 'chessground/assets/chessground.base.css';
import './Board.css';

/** A badge on the corner of a square: the label of the move that landed there, or the mate of the king on it. */
export type BoardMark = { square: string; label: BadgeLabel };

export function Board({
  fen,
  label,
  orientation = 'white',
  arrow,
  marks = [],
}: {
  fen: string;
  label: string;
  orientation?: 'white' | 'black';
  /** A move in UCI drawn as an arrow (the engine's suggestion). */
  arrow?: string | undefined;
  marks?: readonly BoardMark[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<Api>(null);
  useEffect(() => {
    if (!ref.current) return;
    api.current = Chessground(ref.current, { viewOnly: true, coordinates: true });
    return () => api.current?.destroy();
  }, []);
  // set() on the live instance, so pieces animate to their new square instead of the board being rebuilt
  useEffect(() => api.current?.set({ fen, orientation }), [fen, orientation]);
  useEffect(
    () =>
      api.current?.setAutoShapes(
        arrow ? [{ orig: arrow.slice(0, 2) as Key, dest: arrow.slice(2, 4) as Key, brush: 'green' }] : [],
      ),
    [arrow],
  );
  const white = orientation === 'white';
  return (
    <div className="board">
      <div className="board-squares" ref={ref} role="img" aria-label={label} data-arrow={arrow} />
      {marks.map(({ square, label: mark }) => {
        const file = square.charCodeAt(0) - 97; // 'a'
        const rank = Number(square[1]) - 1;
        return (
          // Hidden from assistive tech: the board is one image, and the page says the move and its label in words.
          <span
            key={square + mark}
            className="board-mark"
            aria-hidden="true"
            data-square={square}
            style={{ '--col': white ? file : 7 - file, '--row': white ? 7 - rank : rank } as CSSProperties}
          >
            <MoveBadge label={mark} />
          </span>
        );
      })}
    </div>
  );
}
