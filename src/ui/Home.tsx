import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { getPlayer, normalizeUser } from '../domain/chesscom.ts';
import { MOVE_LABELS } from '../domain/classify.ts';
import { type PgnGame, parseGamePgn } from '../domain/pgn.ts';
import { ApiError } from './ApiError.tsx';
import { Board } from './Board.tsx';
import { MoveBadge } from './MoveBadge.tsx';
import { storePastedGame } from './PastedGamePage.tsx';
import { PastePgn } from './PastePgn.tsx';
import './Home.css';

// The "immortal zugzwang game": White resigned with every move losing material. It names the app, so it is
// the position on the home page's table, and a game to try the viewer with when chess.com is out of reach.
const EXAMPLE: PgnGame = {
  white: 'Sämisch',
  black: 'Nimzowitsch',
  result: '0-1',
  date: '1923.03.??',
  pgn:
    '[White "Sämisch"]\n[Black "Nimzowitsch"]\n[Result "0-1"]\n\n' +
    '1. d4 Nf6 2. c4 e6 3. Nf3 b6 4. g3 Bb7 5. Bg2 Be7 6. Nc3 O-O 7. O-O d5 8. Ne5 c6 9. cxd5 cxd5 ' +
    '10. Bf4 a6 11. Rc1 b5 12. Qb3 Nc6 13. Nxc6 Bxc6 14. h3 Qd7 15. Kh2 Nh5 16. Bd2 f5 17. Qd1 b4 ' +
    '18. Nb1 Bb5 19. Rg1 Bd6 20. e4 fxe4 21. Qxh5 Rxf2 22. Qg5 Raf8 23. Kh1 R8f5 24. Qe3 Bd3 25. Rce1 h6 0-1',
};
const EXAMPLE_FEN = parseGamePgn(EXAMPLE.pgn).at(-1)?.fen ?? '';

export function Home() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [user, setUser] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<unknown>(null);

  function check() {
    const name = normalizeUser(user);
    if (!name) return;
    setChecking(true);
    setError(null);
    getPlayer(name).then(
      () => navigate(`/u/${encodeURIComponent(name)}`),
      (e) => {
        setError(e);
        setChecking(false);
      },
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    check();
  }

  return (
    <main className="page home">
      <div className="home-hero">
        <div className="home-entry">
          <h1>{t('app.title')}</h1>
          <p className="home-lead">{t('home.lead')}</p>
          <form className="user-form" onSubmit={submit}>
            <label htmlFor="user">{t('home.userLabel')}</label>
            <div className="user-form-row">
              <input
                id="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                required
              />
              <button type="submit" disabled={checking}>
                {t('home.submit')}
              </button>
            </div>
          </form>
          {error !== null && <ApiError error={error} onRetry={check} />}
          <PastePgn />
        </div>
        <figure className="home-table">
          <Board fen={EXAMPLE_FEN} label={t('home.example.boardLabel')} />
          <figcaption>
            <strong>{t('home.example.title')}</strong>
            <span>{t('home.example.caption')}</span>
            <button
              type="button"
              onClick={() => {
                storePastedGame(EXAMPLE);
                navigate('/pgn');
              }}
            >
              {t('home.example.open')}
            </button>
          </figcaption>
        </figure>
      </div>
      <section className="home-report" aria-labelledby="home-report-title">
        <h2 id="home-report-title">{t('home.report.title')}</h2>
        <div className="home-report-points">
          <div>
            <h3>{t('home.report.accuracyTitle')}</h3>
            <p>{t('home.report.accuracy')}</p>
          </div>
          <div>
            <h3>{t('home.report.labelsTitle')}</h3>
            <p className="home-badges">
              {MOVE_LABELS.map((label) => (
                <MoveBadge key={label} label={label} />
              ))}
            </p>
            <p>{t('home.report.labels')}</p>
          </div>
          <div>
            <h3>{t('home.report.localTitle')}</h3>
            <p>{t('home.report.local')}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
