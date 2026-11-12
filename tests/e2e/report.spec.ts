import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// Scholar's mate: 3… Nf6 is a blunder at any depth, so the real engine labels it the same way every run.
const PGN = '[White "ana"]\n[Black "luis"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0';

async function analyse(page: Page) {
  await page.goto('/');
  await page.getByLabel('O pega un PGN').fill(PGN);
  await page.getByRole('button', { name: 'Analizar', exact: true }).click();
  await page.getByRole('button', { name: 'Analizar', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Resumen del análisis' })).toBeVisible({ timeout: 60_000 });
}

test('an analysed game shows its report: labels, better line with its arrow, graph and summary', async ({
  page,
  expectNoSeriousA11yViolations,
}) => {
  await analyse(page);
  const board = page.getByRole('img', { name: 'Tablero de la partida' });
  const status = page.getByRole('status');

  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft');
  await expect(status).toContainText('Jugada 6 de 7');
  const panel = page.getByRole('region', { name: 'Análisis de la jugada' });
  await expect(panel).toContainText('Error grave');
  await expect(panel).toContainText('Lo mejor era');
  await expect(board).toHaveAttribute('data-arrow', /^[a-h][1-8][a-h][1-8]/);
  await expect(board.locator('svg.cg-shapes g > *').first()).toBeAttached(); // the arrow is really drawn

  await panel.getByRole('button', { name: 'Ver la línea' }).click();
  await panel.getByRole('button', { name: 'Adelante en la línea' }).click();
  await expect(panel.getByRole('list', { name: 'Línea del motor' }).locator('[aria-current="step"]')).toHaveCount(1);
  await panel.getByRole('button', { name: 'Volver a la partida' }).click();
  await expect(panel.getByRole('button', { name: 'Ver la línea' })).toBeVisible();

  const summary = page.getByRole('region', { name: 'Resumen del análisis' });
  await expect(summary).toContainText('Precisión de las blancas');
  await expect(summary.getByRole('row', { name: /Error grave/ })).toContainText('1');
  await expect(page.getByText(/Wayward Queen Attack/)).toBeAttached();

  // A click a third of the way along the graph lands on a move of the first half.
  const graph = page.getByRole('slider', { name: 'Gráfico de evaluación' });
  const box = await graph.boundingBox();
  if (!box) throw new Error('graph not laid out');
  await graph.click({ position: { x: (box.width * 2) / 7, y: box.height / 2 } });
  await expect(status).toContainText('Jugada 2 de 7');
  await expect(graph).toHaveAttribute('aria-valuenow', '2');

  await expectNoSeriousA11yViolations();
});

test.describe('light theme', () => {
  test.use({ colorScheme: 'light' });

  test('follows the system, passes axe on the report and the home page, and can be switched off', async ({
    page,
    expectNoSeriousA11yViolations,
  }) => {
    await analyse(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowLeft');
    await page.getByRole('button', { name: 'Ver la línea' }).click();
    await expectNoSeriousA11yViolations();

    await page.getByRole('button', { name: 'Modo claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark'); // the choice is remembered
    await page.getByRole('button', { name: 'Modo claro' }).click();
    await expectNoSeriousA11yViolations();
  });
});

test('nothing animates with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await analyse(page);
  for (const selector of ['main', '.analysis-summary', '.eval-bar__white']) {
    const durations = await page
      .locator(selector)
      .evaluate((el) => [getComputedStyle(el).animationDuration, getComputedStyle(el).transitionDuration]);
    expect(durations).toEqual(['0s', '0s']);
  }
});
