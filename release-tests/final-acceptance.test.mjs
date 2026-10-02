import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { algorithms, getAlgorithm } from '../classical-cipher-lab/js/catalog.js';
import { renderAlgorithmPage, renderIntro, renderStep } from '../classical-cipher-lab/js/visualizers/renderer.js';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, '../classical-cipher-lab');

test('final site exposes exactly eight classical-cipher modules', () => {
  assert.deepEqual(algorithms.map(({ meta }) => meta.id),
    ['caesar', 'affine', 'vigenere', 'playfair', 'hill', 'columnar', 'otp', 'rotor']);
  for (const algorithm of algorithms) {
    assert.equal(typeof algorithm.encrypt, 'function');
    assert.equal(typeof algorithm.decrypt, 'function');
    assert.equal(getAlgorithm(algorithm.meta.id), algorithm);
  }
});

test('all eight modules encrypt, decrypt, and produce animation steps', () => {
  const cases = [
    ['caesar', 'HELLO', { shift: 3 }, 'KHOOR', 'HELLO'],
    ['affine', 'AFFINECIPHER', { a: 5, b: 8 }, 'IHHWVCSWFRCP', 'AFFINECIPHER'],
    ['vigenere', 'ATTACKATDAWN', { keyword: 'LEMON' }, 'LXFOPVEFRNHR', 'ATTACKATDAWN'],
    ['playfair', 'HIDETHEGOLDINTHETREESTUMP', { keyword: 'PLAYFAIR EXAMPLE' }, 'BMODZBXDNABEKUDMUIXMMOUVIF', 'HIDETHEGOLDINTHETREXESTUMP'],
    ['hill', 'HELP', { m00: 3, m01: 3, m10: 2, m11: 5 }, 'HIAT', 'HELP'],
    ['columnar', 'WEAREDISCOVERED', { keyword: 'CAB' }, 'EESVEADCEDWRIOR', 'WEAREDISCOVERED'],
    ['otp', 'HELLO', { keyword: 'XMCKL' }, 'EQNVZ', 'HELLO'],
    ['rotor', 'SECRETMESSAGE', { positions: 'AAA' }, null, 'SECRETMESSAGE']
  ];
  for (const [id, input, key, expectedCipher, expectedPlain] of cases) {
    const algorithm = getAlgorithm(id);
    const encrypted = algorithm.encrypt(input, key);
    assert.ok(encrypted.steps.length > 0, `${id} should produce encryption steps`);
    if (expectedCipher) assert.equal(encrypted.output, expectedCipher);
    const decrypted = algorithm.decrypt(encrypted.output, key);
    assert.ok(decrypted.steps.length > 0, `${id} should produce decryption steps`);
    assert.equal(decrypted.output, expectedPlain);
  }
});

test('intro and every module render complete teaching UI', () => {
  const intro = renderIntro(algorithms);
  assert.match(intro, /<strong>08<\/strong><span>交互实验<\/span>/);
  assert.equal((intro.match(/class="algorithm-card"/g) ?? []).length, 8);
  for (const algorithm of algorithms) {
    const page = renderAlgorithmPage(algorithm);
    assert.match(page, new RegExp(algorithm.meta.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(page, /仅用于教学/);
    assert.match(page, /data-action="run"/);
    assert.match(page, /data-action="play"/);
    const result = algorithm.encrypt(algorithm.meta.defaults.input, algorithm.meta.defaults);
    const state = { step: result.steps[0], index: 0, total: result.steps.length };
    assert.match(renderStep(state), /class="step-view"/);
  }
});

test('entry page references existing local assets and all navigation targets', () => {
  const html = readFileSync(resolve(siteRoot, 'index.html'), 'utf8');
  assert.match(html, /<html lang="zh-CN"/);
  assert.match(html, /assets\/styles\.css/);
  assert.match(html, /js\/app\.js/);
  assert.match(html, /id="sidebar"/);
  for (const relativePath of ['assets/styles.css', 'js/app.js', 'js/catalog.js', 'js/visualizers/renderer.js']) {
    assert.equal(existsSync(resolve(siteRoot, relativePath)), true, `${relativePath} should exist`);
  }
  for (const { meta } of algorithms) assert.match(html, new RegExp(`href="#${meta.id}"`));
});
