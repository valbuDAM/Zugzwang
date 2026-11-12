import { useTranslation } from 'react-i18next';
import { type WhiteScore, winPercent } from '../domain/analysis.ts';
import type { MoveLabel } from '../domain/classify.ts';
import { formatEval } from '../i18n/format.ts';
import './EvalGraph.css';

const WIDTH = 600;
const HEIGHT = 120;
// The labels worth a dot: the turning points of the game, not every good move.
const MARKED: readonly MoveLabel[] = ['brilliant', 'great', 'inaccuracy', 'mistake', 'blunder', 'miss'];

/**
 * White's winning chances along the game. `total` is the last ply of the game, so a running analysis draws only
 * its first part. It is a slider: the arrow keys the viewer already listens to move it, a click jumps to a move.
 */
export function EvalGraph({
  scores,
  labels,
  ply,
  total,
  describedBy,
  onSelect,
}: {
  scores: WhiteScore[];
  labels?: (MoveLabel | null)[] | undefined;
  ply: number;
  total: number;
  describedBy?: string | undefined;
  onSelect: (ply: number) => void;
}) {
  const { t } = useTranslation();
  const x = (i: number) => (total ? (i / total) * WIDTH : 0);
  const y = (score: WhiteScore) => HEIGHT - (winPercent(score) / 100) * HEIGHT;
  const line = scores.map((score, i) => `${x(i)},${y(score)}`).join(' ');
  const current = scores[ply];
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the keys are the viewer's own (arrows, Home, End), heard on the window.
    <div
      className="eval-graph"
      role="slider"
      tabIndex={0}
      aria-label={t('graph.label')}
      aria-describedby={describedBy}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={ply}
      aria-valuetext={`${t('game.move', { current: ply, total })}${current ? `, ${formatEval(current)}` : ''}`}
      onClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        if (box.width) onSelect(Math.round(((e.clientX - box.left) / box.width) * total));
      }}
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
        <polygon className="eval-graph-white" points={`0,${HEIGHT} ${line} ${x(scores.length - 1)},${HEIGHT}`} />
        <line className="eval-graph-middle" x1={0} x2={WIDTH} y1={HEIGHT / 2} y2={HEIGHT / 2} />
        {scores.map((score, i) => {
          const label = labels?.[i];
          return (
            label &&
            MARKED.includes(label) && (
              // biome-ignore lint/suspicious/noArrayIndexKey: one dot per ply, and plies never reorder.
              <circle key={i} className="eval-graph-dot" data-label={label} cx={x(i)} cy={y(score)} r={4} />
            )
          );
        })}
        <line className="eval-graph-current" x1={x(ply)} x2={x(ply)} y1={0} y2={HEIGHT} />
      </svg>
    </div>
  );
}
