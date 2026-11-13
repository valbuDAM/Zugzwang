import { useTranslation } from 'react-i18next';
import type { MoveLabel } from '../domain/classify.ts';
import type { LineStep } from '../domain/line.ts';
import type { Reason } from '../domain/reason.ts';
import { formatPercent } from '../i18n/format.ts';
import { MoveBadge } from './MoveBadge.tsx';
import './MovePanel.css';

/**
 * What the analysis says about the current move. `line` is the engine's better line from the position before the
 * move, when the move was not the best; `step` is how many of its moves are on the board (null: the game itself).
 */
export function MovePanel({
  label,
  drop,
  reason,
  line,
  step,
  onStep,
}: {
  label: MoveLabel;
  /** Win% the mover lost, 0..100. */
  drop: number;
  /** Why the engine's move was better; said instead of the win% when there is one. */
  reason?: Reason | undefined;
  line: LineStep[];
  step: number | null;
  onStep: (step: number | null) => void;
}) {
  const { t } = useTranslation();
  const best = line[0];
  const why =
    reason &&
    t(
      `panel.reason.${reason.kind}`,
      'moves' in reason ? { moves: reason.moves } : { what: t(`panel.material.${reason.piece ?? 'any'}`) },
    );
  return (
    <section className="move-panel" aria-label={t('panel.title')}>
      <p className="move-panel-label">
        <MoveBadge label={label} />
        <strong>{t(`moveLabel.${label}`)}</strong>
        {why ? (
          <span>{why}</span>
        ) : (
          drop >= 0.5 && <span>{t('panel.drop', { percent: formatPercent(drop / 100, 0) })}</span>
        )}
      </p>
      {best && (
        <>
          <p className="move-panel-best">
            {t('panel.best')} <strong>{best.san}</strong>
          </p>
          {step === null ? (
            <button type="button" onClick={() => onStep(0)}>
              {t('panel.showLine')}
            </button>
          ) : (
            <>
              <ol className="move-panel-line" aria-label={t('panel.line')}>
                {line.map((s, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a line is a fixed sequence of moves.
                  <li key={i} aria-current={i === step - 1 ? 'step' : undefined}>
                    {s.san}
                  </li>
                ))}
              </ol>
              <div className="move-panel-controls">
                <button type="button" disabled={step === 0} onClick={() => onStep(step - 1)}>
                  {t('panel.linePrev')}
                </button>
                <button type="button" disabled={step === line.length} onClick={() => onStep(step + 1)}>
                  {t('panel.lineNext')}
                </button>
                <button type="button" onClick={() => onStep(null)}>
                  {t('panel.back')}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
