import assert from 'node:assert/strict';
import test from 'node:test';

import * as vigenere from '../classical-cipher-lab/js/algorithms/vigenere.js';
import { renderAlgorithmPage } from '../classical-cipher-lab/js/visualizers/renderer.js';

test('Vigenere page consistently calls the keyword a key', () => {
  const page = renderAlgorithmPage(vigenere);

  assert.match(page, /<span>密钥<\/span>/);
  assert.doesNotMatch(page, /关键词/);
});

test('Vigenere empty-key validation refers to the key', () => {
  assert.throws(
    () => vigenere.encrypt('HELLO', { keyword: '' }),
    /密钥中至少需要一个英文字母/
  );
});
