import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyRc4,
  createSteps,
  decrypt,
  encrypt,
  ksa,
  meta
} from '../classical-cipher-lab/js/algorithms/rc4.js';

const encoder = new TextEncoder();

test('RC4 matches the Key/Plaintext known vector and is symmetric', () => {
  const key = [...encoder.encode('Key')];
  const source = [...encoder.encode('Plaintext')];
  const encrypted = applyRc4(source, key);
  assert.equal(Buffer.from(encrypted.output).toString('hex').toUpperCase(), 'BBF316E8D940AF0AD3');
  assert.deepEqual(applyRc4(encrypted.output, key).output, source);
});

test('RC4 KSA records every permutation swap', () => {
  const result = ksa([...encoder.encode('Key')]);
  assert.equal(result.state.length, 256);
  assert.equal(result.trace.length, 256);
  assert.deepEqual([...result.state].sort((a, b) => a - b), Array.from({ length: 256 }, (_, index) => index));
  assert.equal(result.trace[0].i, 0);
  assert.ok(Array.isArray(result.trace[0].window));
});

test('RC4 wrappers round trip UTF-8 text using uppercase hexadecimal', () => {
  const encrypted = encrypt('RC4 示例', { key: '教学密钥' });
  assert.match(encrypted.output, /^[0-9A-F]+$/);
  assert.equal(decrypt(encrypted.output, { key: '教学密钥' }).output, 'RC4 示例');
  assert.equal(encrypted.details.ksaSteps, 256);
});

test('RC4 rejects empty and overlong UTF-8 keys', () => {
  assert.throws(() => encrypt('data', { key: '' }), /1.*256/);
  assert.throws(() => encrypt('data', { key: 'k'.repeat(257) }), /1.*256/);
});

test('RC4 validates hexadecimal ciphertext and message size', () => {
  assert.throws(() => decrypt('ABC', { key: 'Key' }), /偶数/);
  assert.throws(() => decrypt('GG', { key: 'Key' }), /非法/);
  assert.throws(() => encrypt('a'.repeat(257), { key: 'Key' }), /256/);
});

test('RC4 rejects decrypted bytes that are not valid UTF-8', () => {
  const key = [...encoder.encode('Key')];
  const cipher = applyRc4([255], key).output;
  const hex = Buffer.from(cipher).toString('hex').toUpperCase();
  assert.throws(() => decrypt(hex, { key: 'Key' }), /UTF-8/);
});

test('RC4 trace records bounded KSA windows and complete PRGA fields', () => {
  const applied = applyRc4([1, 2], [...encoder.encode('Key')]);
  assert.equal(applied.ksaTrace.length, 256);
  assert.equal(applied.prgaTrace.length, 2);
  assert.ok(applied.ksaTrace.every((entry) => entry.window.length <= 9));
  for (const field of ['i', 'j', 't', 'leftBefore', 'rightBefore', 'keyStreamByte', 'sourceByte', 'resultByte']) {
    assert.ok(Object.hasOwn(applied.prgaTrace[0], field), `missing ${field}`);
  }
});

test('RC4 animation ends with the exact operation result', () => {
  const result = encrypt('Hi', { key: 'Key' });
  assert.equal(result.steps.filter((step) => step.kind === 'ksa-state').length, 256);
  assert.equal(result.steps.filter((step) => step.kind === 'prga-state').length, 2);
  assert.equal(result.steps.at(-1).data.result, result.output);
  assert.deepEqual(createSteps('encrypt', 'Hi', { key: 'Key' }), result.steps);
});

test('RC4 metadata declares both symmetric operations', () => {
  assert.equal(meta.id, 'rc4');
  assert.deepEqual(meta.modes, ['encrypt', 'decrypt']);
});
