import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { App } from '../App.tsx';
import { STOCKFISH_VERSION } from '../domain/engine/fullWasm.ts';
import '../i18n/index.ts';

it('is reached from the bar and credits the engine by its exact version, with the source', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('link', { name: 'Acerca de' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Acerca de' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: new RegExp(`Stockfish ${STOCKFISH_VERSION}`) })).toHaveAttribute(
    'href',
    `https://github.com/nmrugg/stockfish.js/releases/tag/v${STOCKFISH_VERSION}`,
  );
  expect(screen.getByRole('link', { name: 'https://github.com/valbuDAM/Zugzwang' })).toBeInTheDocument();
  expect(screen.getByText(/GPL-3\.0\. El código fuente/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Volver al inicio' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Zugzwang' })).toBeInTheDocument();
});
