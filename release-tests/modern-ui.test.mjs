import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { algorithms, getAlgorithm } from '../classical-cipher-lab/js/catalog.js';
import { renderAlgorithmPage, renderIntro, renderStep } from '../classical-cipher-lab/js/visualizers/renderer.js';

const here = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(here, '../classical-cipher-lab');
const expectedIds = ['caesar', 'affine', 'vigenere', 'playfair', 'hill', 'columnar', 'otp', 'rotor', 'aes', 'rsa', 'rc4', 'sha256', 'md5'];

function renderRealStep(algorithmId, kind, mode = 'encrypt') {
  const algorithm = getAlgorithm(algorithmId);
  const operation = mode === 'hash' ? algorithm.hash : algorithm[mode];
  const result = operation(algorithm.meta.defaults.input, algorithm.meta.defaults);
  const step = result.steps.find((candidate) => candidate.kind === kind);
  assert.ok(step, `${algorithmId} should expose a ${kind} step`);
  return renderStep({ step, index: step.index, total: result.steps.length });
}

test('catalog registers thirteen algorithms in the learning-path order', () => {
  assert.deepEqual(algorithms.map(({ meta }) => meta.id), expectedIds);
  assert.equal((renderIntro(algorithms).match(/class="algorithm-card"/g) ?? []).length, 13);
  assert.match(renderIntro(algorithms), /<strong>13<\/strong><span>交互实验<\/span>/);
});

test('entry page contains navigation links and modern experiment count', () => {
  const html = readFileSync(resolve(sourceRoot, 'index.html'), 'utf8');
  for (const id of expectedIds.slice(8)) assert.match(html, new RegExp(`href="#${id}"`));
  assert.match(html, />13 个实验</);
});

test('mode controls and preserve option follow algorithm capabilities', () => {
  for (const id of ['aes', 'rsa', 'rc4']) {
    const page = renderAlgorithmPage(getAlgorithm(id));
    assert.match(page, /data-mode="encrypt"/);
    assert.match(page, /data-mode="decrypt"/);
    assert.doesNotMatch(page, /name="preserve"/);
  }
  for (const id of ['sha256', 'md5']) {
    const page = renderAlgorithmPage(getAlgorithm(id));
    assert.equal((page.match(/class="mode-button/g) ?? []).length, 1);
    assert.match(page, /data-mode="hash"/);
    assert.doesNotMatch(page, /data-mode="decrypt"/);
    assert.match(page, /摘要内容/);
    assert.match(page, /生成摘要/);
  }
});

test('every modern page renders its algorithm-specific security warning', () => {
  for (const id of expectedIds.slice(8)) {
    const algorithm = getAlgorithm(id);
    assert.match(renderAlgorithmPage(algorithm), new RegExp(algorithm.meta.note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('AES renderers expose byte grids, state matrices, and key schedules', () => {
  assert.match(renderRealStep('aes', 'byte-grid'), /class="byte-grid"[^>]*aria-label="字节网格"/);
  assert.match(renderRealStep('aes', 'state-matrix'), /class="aes-state"[^>]*aria-label="AES 4×4 状态矩阵"/);
  assert.match(renderRealStep('aes', 'key-schedule'), /class="key-schedule"[^>]*aria-label="AES 轮密钥"/);
});

test('RSA and RC4 render modular arithmetic and permutation state accessibly', () => {
  assert.match(renderRealStep('rsa', 'modular-math'), /class="modular-math"[^>]*aria-label="模幂平方乘轨迹"/);
  assert.match(renderRealStep('rc4', 'ksa-state'), /class="permutation-window"[^>]*aria-label="RC4 置换状态窗口"/);
});

test('hash renderers expose schedules, working registers, and accumulated state', () => {
  assert.match(renderRealStep('sha256', 'message-schedule', 'hash'), /class="message-schedule"[^>]*aria-label="消息扩展字"/);
  assert.match(renderRealStep('md5', 'registers', 'hash'), /class="register-cards"[^>]*aria-label="哈希工作寄存器"/);
  assert.match(renderRealStep('sha256', 'hash-state', 'hash'), /<small>H0<\/small><strong>[0-9a-f]{8}<\/strong>/);
  assert.match(renderRealStep('md5', 'hash-state', 'hash'), /<small>H0<\/small><strong>[0-9a-f]{8}<\/strong>/);
});
