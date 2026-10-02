import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { algorithms, getAlgorithm } from '../classical-cipher-lab/js/catalog.js';
import { renderAlgorithmPage, renderIntro, renderStep } from '../classical-cipher-lab/js/visualizers/renderer.js';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, '../classical-cipher-lab');
const expectedIds = ['caesar', 'affine', 'vigenere', 'playfair', 'hill', 'columnar', 'otp', 'rotor', 'aes', 'rsa', 'rc4', 'sha256', 'md5'];

test('final site exposes exactly thirteen classical and modern modules', () => {
  assert.deepEqual(algorithms.map(({ meta }) => meta.id), expectedIds);
  for (const algorithm of algorithms) {
    const modes = algorithm.meta.modes ?? ['encrypt', 'decrypt'];
    for (const mode of modes) assert.equal(typeof algorithm[mode], 'function', `${algorithm.meta.id}.${mode} should exist`);
    assert.equal(getAlgorithm(algorithm.meta.id), algorithm);
  }
});

test('all eight classical modules still encrypt, decrypt, and animate', () => {
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

test('modern encryption modules round trip and hash modules match abc vectors', () => {
  const roundTrips = [
    ['aes', 'AES 教学', { key: 'Thats my Kung Fu' }],
    ['rsa', 'RSA 教学', { p: 61, q: 53, e: 17 }],
    ['rc4', 'RC4 教学', { key: 'Key' }]
  ];
  for (const [id, input, key] of roundTrips) {
    const algorithm = getAlgorithm(id);
    const encrypted = algorithm.encrypt(input, key);
    assert.ok(encrypted.steps.length > 0);
    assert.equal(algorithm.decrypt(encrypted.output, key).output, input);
  }
  assert.equal(getAlgorithm('sha256').hash('abc').output, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(getAlgorithm('md5').hash('abc').output, '900150983cd24fb0d6963f7d28e17f72');
});

test('intro and every module render complete teaching UI', () => {
  const intro = renderIntro(algorithms);
  assert.match(intro, /<strong>13<\/strong><span>交互实验<\/span>/);
  assert.equal((intro.match(/class="algorithm-card"/g) ?? []).length, 13);
  for (const algorithm of algorithms) {
    const page = renderAlgorithmPage(algorithm);
    assert.match(page, new RegExp(algorithm.meta.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(page, /仅用于教学/);
    assert.match(page, /data-action="run"/);
    assert.match(page, /data-action="play"/);
    const mode = (algorithm.meta.modes ?? ['encrypt'])[0];
    const result = algorithm[mode](algorithm.meta.defaults.input, algorithm.meta.defaults);
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
  for (const relativePath of ['assets/styles.css', 'assets/modern-visualizers.css', 'js/app.js', 'js/catalog.js', 'js/visualizers/renderer.js']) {
    assert.equal(existsSync(resolve(siteRoot, relativePath)), true, `${relativePath} should exist`);
  }
  for (const { meta } of algorithms) assert.match(html, new RegExp(`href="#${meta.id}"`));
});
