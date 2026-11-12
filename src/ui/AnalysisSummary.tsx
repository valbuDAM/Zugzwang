import { useTranslation } from 'react-i18next';
import type { GameAccuracy } from '../domain/accuracy.ts';
import { MOVE_LABELS, type MoveLabel } from '../domain/classify.ts';
import { formatPercent } from '../i18n/format.ts';
import { MoveBadge } from './MoveBadge.tsx';
import './AnalysisSummary.css';

const SIDES = ['white', 'black'] as const;

/** Accuracy of each side and how many moves of each label it played. `id` names the accuracy line for `aria-describedby`. */
export function AnalysisSummary({
  id,
  accuracy,
  labels,
  whiteStarts,
}: {
  id: string;
  accuracy: GameAccuracy;
  labels: (MoveLabel | null)[];
  whiteStarts: boolean;
}) {
  const { t } = useTranslation();
  const count = (label: MoveLabel, white: boolean) =>
    labels.filter((l, i) => l === label && ((i % 2 === 1) === whiteStarts) === white).length;
  const percent = (value: number | null) => (value === null ? '–' : formatPercent(value / 100));
  return (
    <section className="analysis-summary" aria-label={t('summary.title')}>
      <p id={id} className="analysis-summary-accuracy">
        {SIDES.map((side) => (
          <span key={side}>
            {t('summary.accuracy', { side: t(side === 'white' ? 'game.sideWhite' : 'game.sideBlack') })}{' '}
            <strong>{percent(accuracy[side])}</strong>
          </span>
        ))}
      </p>
      <table>
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
    </section>
  );
}
