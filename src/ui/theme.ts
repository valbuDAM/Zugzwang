export type Theme = 'light' | 'dark';

const KEY = 'zugzwang.theme';

/** The stored choice; without one, the system's. */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // storage blocked: fall through to the system's theme
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
};

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // shortcut: the choice lasts only until reload when storage is blocked, never worth an error
  }
}
