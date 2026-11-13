import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from '../App.tsx';
import '../i18n/index.ts';
import { readTheme, storeTheme } from './theme.ts';

const system = (light: boolean) => vi.stubGlobal('matchMedia', () => ({ matches: light }));

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
  delete (document as { startViewTransition?: unknown }).startViewTransition;
});

it('follows the system until there is a stored choice', () => {
  system(true);
  expect(readTheme()).toBe('light');
  system(false);
  expect(readTheme()).toBe('dark');
  storeTheme('light');
  expect(readTheme()).toBe('light');
  localStorage.setItem('zugzwang.theme', 'purple');
  expect(readTheme()).toBe('dark');
});

it('is dark where the system cannot be asked, and survives a blocked storage', () => {
  vi.stubGlobal('matchMedia', undefined);
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(readTheme()).toBe('dark');
  expect(() => storeTheme('light')).not.toThrow();
});

it('switches the theme from the button, names the next one and remembers it', async () => {
  system(false);
  render(<App />);
  const toggle = screen.getByRole('button', { name: 'Modo claro' });

  await userEvent.click(toggle);
  expect(toggle).toHaveAccessibleName('Modo oscuro');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(readTheme()).toBe('light');

  await userEvent.click(toggle);
  expect(toggle).toHaveAccessibleName('Modo claro');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(readTheme()).toBe('dark');
});

it('cross-fades where the browser can', async () => {
  system(false);
  const startViewTransition = vi.fn((swap: () => void) => swap());
  Object.assign(document, { startViewTransition });
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Modo claro' }));
  expect(startViewTransition).toHaveBeenCalledOnce();
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(screen.getByRole('button', { name: 'Modo oscuro' })).toBeInTheDocument();
});
