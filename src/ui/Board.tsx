import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import { useEffect, useRef } from 'react';
import 'chessground/assets/chessground.base.css';
import './Board.css';

export function Board({
  fen,
  label,
  orientation = 'white',
  arrow,
}: {
  fen: string;
  label: string;
  orientation?: 'white' | 'black';
  /** A move in UCI drawn as an arrow (the engine's suggestion). */
  arrow?: string | undefined;
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
  return <div className="board" ref={ref} role="img" aria-label={label} data-arrow={arrow} />;
}
