import 'fake-indexeddb/auto';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clear } from 'idb-keyval';
import { beforeEach, expect, it, vi } from 'vitest';
import type { PositionEval } from '../domain/analysis.ts';
import { writeAnalysis } from '../domain/analysisCache.ts';
import { parseGamePgn } from '../domain/pgn.ts';
import { detectSettings } from '../engine/createEngine.ts';
import '../i18n/index.ts';
import { GameViewer } from './GameViewer.tsx';

// Scholar's mate: 3… Nf6 lets 4. Qxf7# in; the engine wanted 3… g6.
const PGN = '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# *';
const fens = parseGamePgn(PGN).map((p) => p.fen);
const even = (pv: string[] = []): PositionEval => ({ score: { kind: 'cp', cp: 20 }, pv });
const EVALS: PositionEval[] = [
  even(),
  even(),
  even(),
  even(),
  even(),
  even(['g7g6', 'h5f3', 'g8f6']),
  { score: { kind: 'mate', mate: 1 }, pv: ['h5f7'] },
  { score: { kind: 'final', winner: 'white' }, pv: [] },
];

beforeEach(async () => {
  await clear();
  await writeAnalysis(fens, { variant: 'lite-single', depth: detectSettings('lite-single').depth }, EVALS);
});

const open = async () => {
  const view = render(<GameViewer pgn={PGN} variant="lite-single" />);
  await screen.findByRole('region', { name: 'Resumen del análisis' });
  return view;
};
const board = () => screen.getByRole('img', { name: 'Tablero de la partida' });

it('labels the moves, names the opening and announces the label with the move', async () => {
  await open();
  expect(await screen.findByText(/Wayward Queen Attack/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^Nf6/ }));
  expect(screen.getByRole('button', { name: /^Nf6/ })).toHaveAccessibleName(/Error grave/);
  expect(screen.getByRole('status')).toHaveTextContent('3. Cf6, negras, Error grave');
});

it('shows the better move as an arrow and walks its line and back', async () => {
  await open();
  await userEvent.click(screen.getByRole('button', { name: /^Nf6/ }));
  const panel = screen.getByRole('region', { name: 'Análisis de la jugada' });
  expect(panel).toHaveTextContent('Error grave');
  expect(panel).toHaveTextContent('Lo mejor era g6');
  expect(board()).toHaveAttribute('data-arrow', 'g7g6');
  expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '#1');

  await userEvent.click(within(panel).getByRole('button', { name: 'Ver la línea' }));
  const back = within(panel).getByRole('button', { name: 'Atrás en la línea' });
  const forward = within(panel).getByRole('button', { name: 'Adelante en la línea' });
  expect(back).toBeDisabled();
  expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '+0,2'); // what the engine gave the line

  await userEvent.click(forward);
  expect(
    within(panel)
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('aria-current')),
  ).toEqual(['step', null, null]);
  expect(board()).toHaveAttribute('data-arrow', 'h5f3');
  await userEvent.click(forward);
  await userEvent.click(forward);
  expect(forward).toBeDisabled();
  expect(board()).not.toHaveAttribute('data-arrow');

  await userEvent.click(within(panel).getByRole('button', { name: 'Volver a la partida' }));
  expect(within(panel).queryByRole('list', { name: 'Línea del motor' })).not.toBeInTheDocument();
  expect(board()).toHaveAttribute('data-arrow', 'g7g6');
});

it('leaves the line when the game moves on, and offers none for a best move', async () => {
  await open();
  await userEvent.click(screen.getByRole('button', { name: /^Nf6/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Ver la línea' }));
  await userEvent.keyboard('{ArrowRight}');
  const panel = screen.getByRole('region', { name: 'Análisis de la jugada' });
  expect(panel).toHaveTextContent('Mejor');
  expect(panel).not.toHaveTextContent('Lo mejor era');
  expect(board()).not.toHaveAttribute('data-arrow');
  await userEvent.keyboard('{ArrowLeft}');
  expect(screen.getByRole('button', { name: 'Ver la línea' })).toBeInTheDocument();
});

it('sums up the accuracy and the labels of each side', async () => {
  await open();
  const summary = screen.getByRole('region', { name: 'Resumen del análisis' });
  expect(summary).toHaveTextContent(/Precisión de las blancas: 100,0\s%/);
  expect(summary).toHaveTextContent(/Precisión de las negras: \d+,\d\s%/);
  const row = within(summary).getByRole('row', { name: /Error grave/ });
  expect(
    within(row)
      .getAllByRole('cell')
      .map((c) => c.textContent),
  ).toEqual(['0', '1']);
});

it('jumps to the move clicked on the graph, which is described by the summary', async () => {
  await open();
  const graph = screen.getByRole('slider', { name: 'Gráfico de evaluación' });
  expect(graph).toHaveAttribute('aria-valuemax', '7');
  expect(graph).toHaveAttribute('aria-valuetext', 'Jugada 0 de 7, +0,2');
  expect(document.getElementById(graph.getAttribute('aria-describedby') as string)).toHaveTextContent('Precisión');

  fireEvent.click(graph, { clientX: 300 }); // jsdom has no layout: a graph without width ignores the click
  expect(graph).toHaveAttribute('aria-valuenow', '0');
  vi.spyOn(graph, 'getBoundingClientRect').mockReturnValue({ left: 100, width: 700 } as DOMRect);
  fireEvent.click(graph, { clientX: 400 });
  expect(graph).toHaveAttribute('aria-valuenow', '3');
  expect(screen.getByRole('status')).toHaveTextContent('Jugada 3 de 7');
  expect(graph.querySelectorAll('circle')).toHaveLength(1); // the blunder
});

it('shows no panel, graph or summary before the game is analysed', async () => {
  await clear();
  render(<GameViewer pgn={PGN} variant="lite-single" />);
  expect(await screen.findByText(/Wayward Queen Attack/)).toBeInTheDocument();
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Resumen del análisis' })).not.toBeInTheDocument();
});
