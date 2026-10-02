import assert from 'node:assert/strict';
import test from 'node:test';

import * as playfair from '../classical-cipher-lab/js/algorithms/playfair.js';
import { renderStep } from '../classical-cipher-lab/js/visualizers/renderer.js';

test('Playfair animation renders I and J together in one of the 25 cells', () => {
  const result = playfair.encrypt('AB', { keyword: 'PLAYFAIR EXAMPLE' });
  const html = renderStep({ step: result.steps[0], index: 0, total: result.steps.length });
  const grid = html.match(/<div class="playfair-grid">([\s\S]*?)<\/div>/)?.[1] ?? '';
  const cells = grid.match(/<span\b[^>]*>[\s\S]*?<\/span>/g) ?? [];

  assert.equal(cells.length, 25);
  assert.equal(cells.filter((cell) => cell.includes('>I/J</span>')).length, 1);
  assert.doesNotMatch(grid, />I<\/span>|>J<\/span>/);
  assert.match(grid, /class="merged-letter"[^>]*aria-label="I 和 J 共用一个方格">I\/J<\/span>/);
});
