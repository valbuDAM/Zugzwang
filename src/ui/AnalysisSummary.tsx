import { useTranslation } from 'react-i18next';
import type { GameAccuracy } from '../domain/accuracy.ts';
import { MOVE_LABELS, type MoveLabel } from '../domain/classify.ts';
import { formatPercent } from '../i18n/format.ts';
import { MoveBadge } from './MoveBadge.tsx';
import './AnalysisSummary.css';

const SIDES = ['white', 'black'] as const;

/** Accuracy of each side, on a plate of its own colour. `id` names the accuracy line for `aria-describedby`. */
export function AnalysisSummary({ id, accuracy }: { id: string; accuracy: GameAccuracy }) {
  const { t } = useTranslation();
  const percent = (value: number | null) => (value === null ? '–' : formatPercent(value / 100));
  return (
    <section className="analysis-summary" aria-label={t('summary.title')}>
      <p id={id} className="analysis-summary-accuracy">
        {SIDES.map((side) => (
          <span key={side} data-side={side}>
            {t('summary.accuracy', { side: t(side === 'white' ? 'game.sideWhite' : 'game.sideBlack') })}{' '}
            <strong>{percent(accuracy[side])}</strong>
          </span>
        ))}
      </p>
    </section>
  );
}

/** How many moves of each label each side played. */
export function LabelCounts({ labels, whiteStarts }: { labels: (MoveLabel | null)[]; whiteStarts: boolean }) {
  const { t } = useTranslation();
  const count = (label: MoveLabel, white: boolean) =>
    labels.filter((l, i) => l === label && ((i % 2 === 1) === whiteStarts) === white).length;
  return (
    <table className="label-counts">
      <thead>
        <tr>
          <th scope="col">{t('summary.label')}</th>
          {SIDES.map((side) => (
            <th key={side} scope="col">
              {t(`user.${side}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {MOVE_LABELS.filter((label) => labels.includes(label)).map((label) => (
          <tr key={label}>
            <th scope="row">
              <MoveBadge label={label} />
              {t(`moveLabel.${label}`)}
            </th>
            <td>{count(label, true)}</td>
            <td>{count(label, false)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
