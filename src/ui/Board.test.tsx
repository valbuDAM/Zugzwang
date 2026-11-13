import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import '../i18n/index.ts';
import { Board } from './Board.tsx';

const FEN = '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1';
// Column and row of a mark, counted from the top-left corner of the board as it is drawn.
const cell = (container: HTMLElement) => {
  const style = (container.querySelector('.board-mark') as HTMLElement).style;
  return [style.getPropertyValue('--col'), style.getPropertyValue('--row')];
};

it('puts a mark on its square, also on a flipped board', () => {
  const marks = [{ square: 'b1', label: 'best' }] as const;
  const { container, rerender } = render(<Board fen={FEN} label="Tablero" marks={marks} />);
  expect(cell(container)).toEqual(['1', '7']);
  rerender(<Board fen={FEN} label="Tablero" orientation="black" marks={marks} />);
  expect(cell(container)).toEqual(['6', '0']);
});

it('has no marks unless given some', () => {
  const { container } = render(<Board fen={FEN} label="Tablero" />);
  expect(container.querySelector('.board-mark')).toBeNull();
});
