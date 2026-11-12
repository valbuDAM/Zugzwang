import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Route, Switch } from 'wouter';
import { About } from './ui/About.tsx';
import { GamePage } from './ui/GamePage.tsx';
import { Home } from './ui/Home.tsx';
import { PastedGamePage } from './ui/PastedGamePage.tsx';
import { applyTheme, readTheme, storeTheme } from './ui/theme.ts';
import { UserPage } from './ui/UserPage.tsx';

function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState(readTheme);
  const light = theme === 'light';
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={light}
      onClick={() => {
        const next = light ? 'dark' : 'light';
        applyTheme(next);
        storeTheme(next);
        setTheme(next);
      }}
    >
      {t('app.lightMode')}
    </button>
  );
}

export function App() {
  const { t } = useTranslation();
  return (
    <>
      <header className="app-bar">
        <Link href="/acerca">{t('about.title')}</Link>
        <ThemeToggle />
      </header>
      <Switch>
        {/* keyed so another user starts from a fresh list and reads its own ?months */}
        <Route path="/u/:user">{({ user }) => <UserPage key={user} user={user} />}</Route>
        <Route path="/u/:user/:gameId">{({ user, gameId }) => <GamePage user={user} id={gameId} />}</Route>
        <Route path="/pgn" component={PastedGamePage} />
        <Route path="/acerca" component={About} />
        <Route component={Home} />
      </Switch>
    </>
  );
}
