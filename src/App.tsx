import { useState } from 'react';
import { flushSync } from 'react-dom';
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
  // The label names the theme it switches to, so no aria-pressed: "Modo oscuro, pressed" would read backwards.
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => {
        const next = light ? 'dark' : 'light';
        storeTheme(next);
        // flushSync: the cross-fade snapshots the new page as soon as this returns, label included.
        const swap = () => {
          applyTheme(next);
          flushSync(() => setTheme(next));
        };
        if (document.startViewTransition) document.startViewTransition(swap);
        else swap();
      }}
    >
      {t(light ? 'app.darkMode' : 'app.lightMode')}
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
