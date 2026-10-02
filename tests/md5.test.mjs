import test from 'node:test';
import assert from 'node:assert/strict';

import { bytesToHex, utf8ToBytes } from '../classical-cipher-lab/js/core/bytes.js';
import { createSteps, hash, md5Bytes, meta } from '../classical-cipher-lab/js/algorithms/md5.js';

const vectors = [
  ['', 'd41d8cd98f00b204e9800998ecf8427e'],
  ['abc', '900150983cd24fb0d6963f7d28e17f72'],
  ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
  [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    'd174ab98d277d9f5a5611c2c9f419d9f'
  ]
];

for (const [input, expected] of vectors) {
  test(`MD5 matches the standard vector for ${JSON.stringify(input)}`, () => {
    assert.equal(bytesToHex(md5Bytes(utf8ToBytes(input))), expected);
    assert.equal(hash(input).output, expected);
  });
}

test('MD5 always emits a lowercase 32-character digest', () => {
  assert.match(hash('现代摘要').output, /^[0-9a-f]{32}$/);
});

test('MD5 wrapper enforces the 256-byte teaching limit', () => {
  assert.throws(() => hash('a'.repeat(257)), /256/);
});

test('MD5 trace records little-endian padding, message words, and 64 operations', () => {
  const result = hash('abc');
  assert.ok(result.steps.some((step) => step.kind === 'padding'));
  assert.equal(result.steps.filter((step) => step.kind === 'message-word').length, 16);
  assert.equal(result.steps.filter((step) => step.kind === 'registers').length, 64);
  assert.ok(result.steps.some((step) => step.kind === 'hash-state'));
  assert.equal(result.steps.at(-1).data.result, result.output);
});

test('MD5 byte tracing and createSteps preserve the final digest', () => {
  const traced = md5Bytes(utf8ToBytes('abc'), true);
  assert.equal(bytesToHex(traced.digest), vectors[1][1]);
  assert.equal(traced.steps.at(-1).data.result, vectors[1][1]);
  assert.deepEqual(createSteps('hash', 'abc'), hash('abc').steps);
});

test('MD5 metadata is hash-only and visibly warns that the algorithm is insecure', () => {
  assert.equal(meta.id, 'md5');
  assert.deepEqual(meta.modes, ['hash']);
  assert.match(meta.note, /不安全/);
});
