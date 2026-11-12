import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { STOCKFISH_VERSION } from '../domain/engine/fullWasm.ts';
import './Home.css';

const SOURCE = 'https://github.com/valbuDAM/chessAnalyzer';

// What the app ships or is built on, with the licence each one asks to be named.
const CREDITS = [
  {
    name: `Stockfish ${STOCKFISH_VERSION} (stockfish.js)`,
    licence: 'GPL-3.0',
    url: `https://github.com/nmrugg/stockfish.js/releases/tag/v${STOCKFISH_VERSION}`,
  },
  { name: 'chessground', licence: 'GPL-3.0', url: 'https://github.com/lichess-org/chessground' },
  { name: 'chessops', licence: 'GPL-3.0', url: 'https://github.com/niklasf/chessops' },
  { name: 'chess-openings', licence: 'CC0 1.0', url: 'https://github.com/lichess-org/chess-openings' },
  { name: 'Merida (Armando Hernández Marroquín)', licence: 'GPL-2.0+', url: 'https://github.com/lichess-org/lila' },
  { name: 'Young Serif', licence: 'OFL 1.1', url: 'https://github.com/noirblancrouge/YoungSerif' },
  {
    name: 'Atkinson Hyperlegible Next',
    licence: 'OFL 1.1',
    url: 'https://www.brailleinstitute.org/freefont/',
  },
] as const;

export function About() {
  const { t } = useTranslation();
  return (
    <main className="page">
      <h1>{t('about.title')}</h1>
      <Link href="/">{t('paste.back')}</Link>
      <p>{t('about.what')}</p>
      <p>
        {t('about.licence')} <a href={SOURCE}>{SOURCE}</a>
      </p>
      <p>{t('about.accuracy')}</p>
      <h2>{t('about.credits')}</h2>
      <ul className="about-credits">
        {CREDITS.map((credit) => (
          <li key={credit.name}>
            <a href={credit.url}>{credit.name}</a> · {credit.licence}
          </li>
        ))}
      </ul>
      <p>{t('about.sounds')}</p>
    </main>
  );
}
