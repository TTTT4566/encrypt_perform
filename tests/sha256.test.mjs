import test from 'node:test';
import assert from 'node:assert/strict';

import { bytesToHex, utf8ToBytes } from '../classical-cipher-lab/js/core/bytes.js';
import { createSteps, hash, meta, sha256Bytes } from '../classical-cipher-lab/js/algorithms/sha256.js';

const vectors = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    'db4bfcbd4da0cd85a60c3c37d3fbd8805c77f15fc6b1fdfe614ee0a7c8fdb4c0'
  ]
];

for (const [input, expected] of vectors) {
  test(`SHA-256 matches the standard vector for ${JSON.stringify(input)}`, () => {
    assert.equal(bytesToHex(sha256Bytes(utf8ToBytes(input))), expected);
    assert.equal(hash(input).output, expected);
  });
}

test('SHA-256 always emits a lowercase 64-character digest', () => {
  const output = hash('现代摘要').output;
  assert.match(output, /^[0-9a-f]{64}$/);
});

test('SHA-256 wrapper enforces the 256-byte teaching limit', () => {
  assert.throws(() => hash('a'.repeat(257)), /256/);
});

test('SHA-256 trace records padding, schedule, registers, and state accumulation', () => {
  const result = hash('abc');
  assert.ok(result.steps.some((step) => step.kind === 'padding'));
  assert.equal(result.steps.filter((step) => step.kind === 'message-schedule').length, 64);
  assert.equal(result.steps.filter((step) => step.kind === 'registers').length, 64);
  assert.ok(result.steps.some((step) => step.kind === 'hash-state'));
  assert.equal(result.steps.at(-1).data.result, result.output);
});

test('SHA-256 createSteps and byte-level tracing expose the same final digest', () => {
  const traced = sha256Bytes(utf8ToBytes('abc'), true);
  assert.equal(bytesToHex(traced.digest), vectors[1][1]);
  assert.equal(traced.steps.at(-1).data.result, vectors[1][1]);
  assert.deepEqual(createSteps('hash', 'abc'), hash('abc').steps);
});

test('SHA-256 metadata exposes a hash-only operation', () => {
  assert.equal(meta.id, 'sha256');
  assert.deepEqual(meta.modes, ['hash']);
  assert.deepEqual(meta.keyFields, []);
});
