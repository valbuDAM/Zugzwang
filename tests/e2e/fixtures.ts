import AxeBuilder from '@axe-core/playwright';
import { test as base, expect } from '@playwright/test';

type Fixtures = { expectNoSeriousA11yViolations: () => Promise<void> };

export const test = base.extend<Fixtures>({
  expectNoSeriousA11yViolations: async ({ page }, use) => {
    await use(async () => {
      // Axe reads the colours as they are right now, so let entrances and transitions finish: half-faded text fails contrast.
      await page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished)));
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    });
  },
});

export { expect };
